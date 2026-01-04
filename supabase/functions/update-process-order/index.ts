import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CartItem = { id: string; quantity: number };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { userId, items, method, btcPrice, ltcPrice, shippingAddress, buyerNotes, buyerNotesImages, useEscrow = true } = body as {
      userId: string;
      items: CartItem[];
      method: 'btc' | 'ltc';
      btcPrice?: number;
      ltcPrice?: number;
      shippingAddress?: {
        firstName: string;
        lastName: string;
        street: string;
        houseNumber: string;
        postalCode: string;
        city: string;
        country: string;
      } | null;
      buyerNotes?: string;
      buyerNotesImages?: string[];
      useEscrow?: boolean;
    };

    if (!userId || !items?.length || !method) throw new Error('Invalid payload');

    console.log('Processing order with useEscrow:', useEscrow, 'method:', method);

    // Get escrow settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['escrow_fee_percent', 'auto_release_days_digital', 'auto_release_days_physical']);

    const escrowFeePercent = Number(settings?.find(s => s.setting_key === 'escrow_fee_percent')?.setting_value || 1);
    const autoReleaseDaysDigital = Number(settings?.find(s => s.setting_key === 'auto_release_days_digital')?.setting_value || 7);
    const autoReleaseDaysPhysical = Number(settings?.find(s => s.setting_key === 'auto_release_days_physical')?.setting_value || 14);

    console.log('Escrow settings:', { escrowFeePercent, autoReleaseDaysDigital, autoReleaseDaysPhysical });

    // Check if any product requires shipping (physical products)
    let requiresShipping = false;
    for (const it of items) {
      const { data: product } = await supabase
        .from('products')
        .select('product_type')
        .eq('id', it.id)
        .maybeSingle();
      if (product && product.product_type !== 'digital') {
        requiresShipping = true;
        break;
      }
    }

    // Determine auto-release days based on product types
    const autoReleaseDays = requiresShipping ? autoReleaseDaysPhysical : autoReleaseDaysDigital;
    const autoReleaseAt = new Date();
    autoReleaseAt.setDate(autoReleaseAt.getDate() + autoReleaseDays);

    if (requiresShipping && !shippingAddress) {
      throw new Error('Shipping address required for physical products');
    }

    // Load product info and compute totals + amounts per seller
    const sellerTotals: Record<string, { eur: number; crypto: number }> = {};
    let totalEUR = 0;
    let totalCrypto = 0;

    const cryptoPrice = method === 'btc' ? (btcPrice || 90000) : (ltcPrice || 100);

    for (const it of items) {
      const { data: product, error } = await supabase
        .from('products')
        .select('id, price, seller_id, stock')
        .eq('id', it.id)
        .maybeSingle();
      if (error || !product) throw error ?? new Error('Product not found');
      if (product.stock < it.quantity) throw new Error('Insufficient stock');

      // Check for bulk discounts
      const { data: bulkDiscounts } = await supabase
        .from('bulk_discounts')
        .select('min_quantity, discount_percentage')
        .eq('product_id', it.id)
        .order('min_quantity', { ascending: false });

      let bestDiscount = 0;
      if (bulkDiscounts && bulkDiscounts.length > 0) {
        for (const discount of bulkDiscounts) {
          if (it.quantity >= discount.min_quantity) {
            bestDiscount = Math.max(bestDiscount, discount.discount_percentage);
          }
        }
      }

      const basePrice = Number(product.price);
      const discountedPrice = basePrice * (1 - bestDiscount / 100);
      const lineEUR = discountedPrice * it.quantity;
      const lineCrypto = lineEUR / cryptoPrice;
      
      totalEUR += lineEUR;
      totalCrypto += lineCrypto;

      const s = sellerTotals[product.seller_id] || { eur: 0, crypto: 0 };
      s.eur += lineEUR;
      s.crypto += lineCrypto;
      sellerTotals[product.seller_id] = s;
    }

    // Check buyer CRYPTO balance (not EUR!)
    const { data: buyerBal } = await supabase
      .from('wallet_balances')
      .select('balance_btc, balance_ltc')
      .eq('user_id', userId)
      .maybeSingle();
    if (!buyerBal) throw new Error('Buyer wallet not found');

    const buyerCryptoBalance = method === 'btc' 
      ? Number(buyerBal.balance_btc || 0) 
      : Number(buyerBal.balance_ltc || 0);

    if (buyerCryptoBalance + 1e-12 < totalCrypto) {
      throw new Error(`Insufficient ${method.toUpperCase()} balance. Required: ${totalCrypto.toFixed(8)}, Available: ${buyerCryptoBalance.toFixed(8)}`);
    }

    console.log(`Buyer balance check passed: ${buyerCryptoBalance.toFixed(8)} ${method.toUpperCase()} >= ${totalCrypto.toFixed(8)} required`);

    // Create order
    const orderData: any = { 
      user_id: userId, 
      total_amount_eur: totalEUR, 
      status: 'confirmed',
      escrow_status: useEscrow ? 'held' : 'none',
      auto_release_at: useEscrow ? autoReleaseAt.toISOString() : null,
      payment_currency: method.toUpperCase()
    };
    
    if (shippingAddress) {
      orderData.shipping_first_name = shippingAddress.firstName;
      orderData.shipping_last_name = shippingAddress.lastName;
      orderData.shipping_street = shippingAddress.street;
      orderData.shipping_house_number = shippingAddress.houseNumber;
      orderData.shipping_postal_code = shippingAddress.postalCode;
      orderData.shipping_city = shippingAddress.city;
      orderData.shipping_country = shippingAddress.country;
    }
    
    if (buyerNotes) orderData.buyer_notes = buyerNotes;
    if (buyerNotesImages?.length) orderData.buyer_notes_images = buyerNotesImages;

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .maybeSingle();
    if (orderErr || !order) throw orderErr ?? new Error('Order creation failed');

    console.log('Order created:', order.id, 'escrow:', order.escrow_status);

    // Create order items and update stock
    for (const it of items) {
      const { data: product } = await supabase
        .from('products')
        .select('id, price, stock')
        .eq('id', it.id)
        .maybeSingle();
      if (!product) throw new Error('Product missing');

      const { data: bulkDiscounts } = await supabase
        .from('bulk_discounts')
        .select('min_quantity, discount_percentage')
        .eq('product_id', it.id)
        .order('min_quantity', { ascending: false });

      let bestDiscount = 0;
      if (bulkDiscounts?.length) {
        for (const discount of bulkDiscounts) {
          if (it.quantity >= discount.min_quantity) {
            bestDiscount = Math.max(bestDiscount, discount.discount_percentage);
          }
        }
      }

      const discountedPrice = Number(product.price) * (1 - bestDiscount / 100);

      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: it.id,
        quantity: it.quantity,
        price_eur: discountedPrice,
      });

      await supabase.from('products')
        .update({ stock: Math.max(0, Number(product.stock) - it.quantity) })
        .eq('id', it.id);
    }

    // Deduct buyer CRYPTO balance only (no EUR deduction!)
    const balanceField = method === 'btc' ? 'balance_btc' : 'balance_ltc';
    const newBuyerBalance = buyerCryptoBalance - totalCrypto;
    
    await supabase.from('wallet_balances')
      .update({ [balanceField]: newBuyerBalance })
      .eq('user_id', userId);

    console.log(`Deducted ${totalCrypto.toFixed(8)} ${method.toUpperCase()} from buyer. New balance: ${newBuyerBalance.toFixed(8)}`);

    // Create buyer purchase transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'purchase',
      amount_eur: -totalEUR,
      amount_btc: method === 'btc' ? -totalCrypto : 0,
      amount_ltc: method === 'ltc' ? -totalCrypto : 0,
      status: 'confirmed',
      description: `Kauf #${String(order.id).slice(0, 8)} (${method.toUpperCase()})${useEscrow ? ' - Escrow' : ''}`,
      transaction_direction: 'outgoing',
      related_order_id: order.id
    });

    // Handle based on escrow choice
    if (useEscrow) {
      // Create escrow holdings - funds NOT credited to seller yet
      for (const [sellerId, sums] of Object.entries(sellerTotals)) {
        const feeAmountCrypto = sums.crypto * (escrowFeePercent / 100);
        const feeAmountEur = sums.eur * (escrowFeePercent / 100);
        const sellerAmountCrypto = sums.crypto - feeAmountCrypto;
        const sellerAmountEur = sums.eur - feeAmountEur;

        await supabase.from('escrow_holdings').insert({
          order_id: order.id,
          seller_id: sellerId,
          buyer_id: userId,
          amount_eur: sums.eur,
          amount_crypto: sums.crypto,
          currency: method.toUpperCase(),
          fee_amount_eur: feeAmountEur,
          fee_amount_crypto: feeAmountCrypto,
          seller_amount_eur: sellerAmountEur,
          seller_amount_crypto: sellerAmountCrypto,
          status: 'held',
          auto_release_at: autoReleaseAt.toISOString()
        });

        console.log(`Created escrow for seller ${sellerId}: ${sums.crypto.toFixed(8)} ${method.toUpperCase()} (fee: ${feeAmountCrypto.toFixed(8)})`);

        // Send notification to seller
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', userId)
          .maybeSingle();

        const productIds = items.map(i => i.id);
        for (const productId of productIds) {
          const { data: product } = await supabase
            .from('products')
            .select('seller_id, title')
            .eq('id', productId)
            .maybeSingle();
          
          if (product?.seller_id === sellerId) {
            const { data: existingConv } = await supabase
              .from('conversations')
              .select('id')
              .eq('buyer_id', userId)
              .eq('seller_id', sellerId)
              .eq('product_id', productId)
              .maybeSingle();

            let conversationId = existingConv?.id;

            if (!conversationId) {
              const { data: newConv } = await supabase
                .from('conversations')
                .insert({
                  buyer_id: userId,
                  seller_id: sellerId,
                  product_id: productId,
                  order_id: order.id
                })
                .select('id')
                .maybeSingle();
              conversationId = newConv?.id;
            }

            if (conversationId) {
              await supabase.from('chat_messages').insert({
                conversation_id: conversationId,
                sender_id: userId,
                message: `🛡️ **Escrow-Bestellung**\n\n${buyerProfile?.username || 'Käufer'} hat bestellt.\n\nProdukt: ${product.title}\nBetrag: ${sums.crypto.toFixed(8)} ${method.toUpperCase()} (€${sums.eur.toFixed(2)})\n\nGeld im Escrow bis Käufer bestätigt.`,
                message_type: 'system'
              });
            }
            break;
          }
        }
      }
    } else {
      // Direct payment - credit seller CRYPTO immediately (not EUR!)
      for (const [sellerId, sums] of Object.entries(sellerTotals)) {
        const feeAmountCrypto = sums.crypto * (escrowFeePercent / 100);
        const feeAmountEur = sums.eur * (escrowFeePercent / 100);
        const sellerAmountCrypto = sums.crypto - feeAmountCrypto;
        const sellerAmountEur = sums.eur - feeAmountEur;

        // Get seller current balance
        const { data: sellerBal } = await supabase
          .from('wallet_balances')
          .select('balance_btc, balance_ltc')
          .eq('user_id', sellerId)
          .maybeSingle();

        // Credit seller CRYPTO balance
        const sellerBalanceField = method === 'btc' ? 'balance_btc' : 'balance_ltc';
        const currentSellerBalance = Number(sellerBal?.[sellerBalanceField] || 0);
        const newSellerBalance = currentSellerBalance + sellerAmountCrypto;

        await supabase.from('wallet_balances')
          .update({ [sellerBalanceField]: newSellerBalance })
          .eq('user_id', sellerId);

        console.log(`Credited seller ${sellerId}: ${sellerAmountCrypto.toFixed(8)} ${method.toUpperCase()} (new balance: ${newSellerBalance.toFixed(8)})`);

        // Create seller sale transaction
        await supabase.from('transactions').insert({
          user_id: sellerId,
          type: 'sale',
          amount_eur: sellerAmountEur,
          amount_btc: method === 'btc' ? sellerAmountCrypto : 0,
          amount_ltc: method === 'ltc' ? sellerAmountCrypto : 0,
          status: 'confirmed',
          description: `Verkauf #${String(order.id).slice(0, 8)} (${method.toUpperCase()})`,
          transaction_direction: 'incoming',
          related_order_id: order.id
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, orderId: order.id, useEscrow }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('process-order error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
