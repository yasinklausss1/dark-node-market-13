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

    console.log('Processing order with useEscrow:', useEscrow);

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
    let hasDigitalProducts = false;
    for (const it of items) {
      const { data: product } = await supabase
        .from('products')
        .select('product_type')
        .eq('id', it.id)
        .maybeSingle();
      if (product) {
        if (product.product_type !== 'digital') {
          requiresShipping = true;
        } else {
          hasDigitalProducts = true;
        }
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
    const sellerTotals: Record<string, { eur: number; btc: number; ltc: number }> = {};
    let totalEUR = 0;

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
      totalEUR += lineEUR;

      const btcAmt = btcPrice ? lineEUR / btcPrice : 0;
      const ltcAmt = ltcPrice ? lineEUR / ltcPrice : 0;

      const s = sellerTotals[product.seller_id] || { eur: 0, btc: 0, ltc: 0 };
      s.eur += lineEUR;
      s.btc += btcAmt;
      s.ltc += ltcAmt;
      sellerTotals[product.seller_id] = s;
    }

    // Check buyer balance
    const { data: buyerBal } = await supabase
      .from('wallet_balances')
      .select('balance_eur, balance_btc, balance_ltc')
      .eq('user_id', userId)
      .maybeSingle();
    if (!buyerBal) throw new Error('Buyer wallet not found');

    const totalBTC = method === 'btc' ? (totalEUR / (btcPrice || 1)) : 0;
    const totalLTC = method === 'ltc' ? (totalEUR / (ltcPrice || 1)) : 0;

    if (method === 'btc' && Number(buyerBal.balance_btc) + 1e-12 < totalBTC) throw new Error('Insufficient BTC balance');
    if (method === 'ltc' && Number((buyerBal as any).balance_ltc || 0) + 1e-12 < totalLTC) throw new Error('Insufficient LTC balance');

    // Create order with escrow status based on user choice
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
    
    if (buyerNotes) {
      orderData.buyer_notes = buyerNotes;
    }
    if (buyerNotesImages && buyerNotesImages.length > 0) {
      orderData.buyer_notes_images = buyerNotesImages;
    }

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .maybeSingle();
    if (orderErr || !order) throw orderErr ?? new Error('Order creation failed');

    console.log('Order created with escrow status:', order.escrow_status, 'Order ID:', order.id);

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
      if (bulkDiscounts && bulkDiscounts.length > 0) {
        for (const discount of bulkDiscounts) {
          if (it.quantity >= discount.min_quantity) {
            bestDiscount = Math.max(bestDiscount, discount.discount_percentage);
          }
        }
      }

      const basePrice = Number(product.price);
      const discountedPrice = basePrice * (1 - bestDiscount / 100);

      const { error: itemErr } = await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: it.id,
        quantity: it.quantity,
        price_eur: discountedPrice,
      });
      
      if (itemErr) {
        console.error('Failed to insert order_item:', itemErr);
        throw new Error(`Failed to create order item: ${itemErr.message}`);
      }

      const newStock = Math.max(0, Number(product.stock) - it.quantity);
      await supabase.from('products').update({ stock: newStock }).eq('id', it.id);
    }

    // Deduct buyer balance and create buyer transaction
    const escrowLabel = useEscrow ? ' - In Escrow' : '';
    
    if (method === 'btc') {
      const newBalanceBtc = Number(buyerBal.balance_btc) - totalBTC;
      const newBalanceEur = Number(buyerBal.balance_eur) - totalEUR;
      await supabase.from('wallet_balances')
        .update({ 
          balance_btc: newBalanceBtc,
          balance_eur: Math.max(0, newBalanceEur)
        })
        .eq('user_id', userId);
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'purchase',
        amount_eur: -totalEUR,
        amount_btc: -totalBTC,
        status: 'confirmed',
        description: `Order #${String(order.id).slice(0,8)} (BTC)${escrowLabel}`,
        transaction_direction: 'outgoing',
        related_order_id: order.id
      });
    } else {
      const newBalanceLtc = Number((buyerBal as any).balance_ltc || 0) - totalLTC;
      const newBalanceEur = Number(buyerBal.balance_eur) - totalEUR;
      await supabase.from('wallet_balances')
        .update({ 
          balance_ltc: newBalanceLtc,
          balance_eur: Math.max(0, newBalanceEur)
        })
        .eq('user_id', userId);
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'purchase',
        amount_eur: -totalEUR,
        amount_btc: -totalLTC,
        status: 'confirmed',
        description: `Order #${String(order.id).slice(0,8)} (LTC)${escrowLabel}`,
        transaction_direction: 'outgoing',
        related_order_id: order.id
      });
    }

    // Handle based on escrow choice
    if (useEscrow) {
      // Create escrow holdings for each seller (funds NOT credited yet)
      for (const [sellerId, sums] of Object.entries(sellerTotals)) {
        const cryptoAmount = method === 'btc' ? sums.btc : sums.ltc;
        const feeAmountEur = sums.eur * (escrowFeePercent / 100);
        const feeAmountCrypto = cryptoAmount * (escrowFeePercent / 100);
        const sellerAmountEur = sums.eur - feeAmountEur;
        const sellerAmountCrypto = cryptoAmount - feeAmountCrypto;

        const { error: escrowErr } = await supabase.from('escrow_holdings').insert({
          order_id: order.id,
          seller_id: sellerId,
          buyer_id: userId,
          amount_eur: sums.eur,
          amount_crypto: cryptoAmount,
          currency: method.toUpperCase(),
          fee_amount_eur: feeAmountEur,
          fee_amount_crypto: feeAmountCrypto,
          seller_amount_eur: sellerAmountEur,
          seller_amount_crypto: sellerAmountCrypto,
          status: 'held',
          auto_release_at: autoReleaseAt.toISOString()
        });

        if (escrowErr) {
          console.error('Failed to create escrow holding:', escrowErr);
          throw new Error(`Failed to create escrow holding: ${escrowErr.message}`);
        }

        console.log(`Created escrow holding for seller ${sellerId}: ${cryptoAmount} ${method.toUpperCase()} (${feeAmountCrypto} fee)`);

        // Send notification to seller about escrow order
        // Get buyer username for notification
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', userId)
          .maybeSingle();

        const buyerUsername = buyerProfile?.username || 'Ein Käufer';

        // Create notification via conversation/message
        // First check if there's already a conversation
        const productIds = items.map(i => i.id);
        for (const productId of productIds) {
          const { data: product } = await supabase
            .from('products')
            .select('seller_id, title')
            .eq('id', productId)
            .maybeSingle();
          
          if (product && product.seller_id === sellerId) {
            // Create or find conversation
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

            // Send escrow notification message
            if (conversationId) {
              await supabase.from('chat_messages').insert({
                conversation_id: conversationId,
                sender_id: userId,
                message: `🛡️ **Escrow-Bestellung**\n\n${buyerUsername} hat eine Bestellung mit Escrow-Schutz aufgegeben.\n\nProdukt: ${product.title}\nBetrag: €${sums.eur.toFixed(2)}\n\nDas Geld wird sicher verwahrt und nach Bestätigung des Käufers freigegeben.`,
                message_type: 'system'
              });

              // Update last message timestamp
              await supabase.from('conversations')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', conversationId);
            }
            break; // One notification per seller is enough
          }
        }
      }
    } else {
      // Direct payment - credit sellers immediately
      for (const [sellerId, sums] of Object.entries(sellerTotals)) {
        const cryptoAmount = method === 'btc' ? sums.btc : sums.ltc;
        const feeAmountEur = sums.eur * (escrowFeePercent / 100);
        const feeAmountCrypto = cryptoAmount * (escrowFeePercent / 100);
        const sellerAmountEur = sums.eur - feeAmountEur;
        const sellerAmountCrypto = cryptoAmount - feeAmountCrypto;

        // Credit seller wallet immediately
        const { data: sellerBal } = await supabase
          .from('wallet_balances')
          .select('balance_btc, balance_ltc')
          .eq('user_id', sellerId)
          .maybeSingle();

        if (sellerBal) {
          if (method === 'btc') {
            await supabase.from('wallet_balances')
              .update({ balance_btc: Number(sellerBal.balance_btc || 0) + sellerAmountCrypto })
              .eq('user_id', sellerId);
          } else {
            await supabase.from('wallet_balances')
              .update({ balance_ltc: Number((sellerBal as any).balance_ltc || 0) + sellerAmountCrypto })
              .eq('user_id', sellerId);
          }
        }

        // Create seller transaction
        await supabase.from('transactions').insert({
          user_id: sellerId,
          type: 'sale',
          amount_eur: sellerAmountEur,
          amount_btc: method === 'btc' ? sellerAmountCrypto : 0,
          status: 'confirmed',
          description: `Verkauf Order #${String(order.id).slice(0,8)} (Direktzahlung)`,
          transaction_direction: 'incoming',
          related_order_id: order.id
        });

        console.log(`Direct payment to seller ${sellerId}: ${sellerAmountCrypto} ${method.toUpperCase()}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, orderId: order.id, useEscrow }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('process-order error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});