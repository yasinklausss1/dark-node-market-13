import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CartItem = { id: string; quantity: number };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform fee percentage (1%)
const PLATFORM_FEE_PERCENT = 0.01;

// Auto-release days based on product type
const AUTO_RELEASE_DAYS = {
  digital: 3,
  physical: 14
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { userId, items, method, btcPrice, ltcPrice, useEscrow = true, shippingAddress, buyerNotes, buyerNotesImages } = body as {
      userId: string;
      items: CartItem[];
      method: 'btc' | 'ltc';
      btcPrice?: number;
      ltcPrice?: number;
      useEscrow?: boolean;
      shippingAddress?: {
        firstName?: string;
        lastName?: string;
        street?: string;
        houseNumber?: string;
        postalCode?: string;
        city?: string;
        country?: string;
      };
      buyerNotes?: string;
      buyerNotesImages?: string[];
    };

    if (!userId || !items?.length || !method) throw new Error('Invalid payload');

    console.log(`Processing order for user ${userId}, method: ${method}, useEscrow: ${useEscrow}`);

    // Load product info and compute totals + amounts per seller
    const sellerTotals: Record<string, { 
      eur: number; 
      btc: number; 
      ltc: number; 
      isDigital: boolean;
      products: { id: string; quantity: number; price: number }[];
    }> = {};
    let totalEUR = 0;
    let hasPhysicalProducts = false;

    for (const it of items) {
      const { data: product, error } = await supabase
        .from('products')
        .select('id, price, seller_id, stock, product_type')
        .eq('id', it.id)
        .maybeSingle();
      if (error || !product) throw error ?? new Error('Product not found');
      if (product.stock < it.quantity) throw new Error('Insufficient stock');

      const lineEUR = Number(product.price) * it.quantity;
      totalEUR += lineEUR;

      const btcAmt = btcPrice ? lineEUR / btcPrice : 0;
      const ltcAmt = ltcPrice ? lineEUR / ltcPrice : 0;

      const isDigital = product.product_type === 'digital';
      if (!isDigital) hasPhysicalProducts = true;

      const s = sellerTotals[product.seller_id] || { 
        eur: 0, 
        btc: 0, 
        ltc: 0, 
        isDigital: true,
        products: []
      };
      s.eur += lineEUR;
      s.btc += btcAmt;
      s.ltc += ltcAmt;
      s.isDigital = s.isDigital && isDigital; // Only digital if ALL products are digital
      s.products.push({ id: product.id, quantity: it.quantity, price: product.price });
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
    if (method === 'ltc' && Number(buyerBal.balance_ltc || 0) + 1e-12 < totalLTC) throw new Error('Insufficient LTC balance');

    // Get buyer profile
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', userId)
      .maybeSingle();

    // Create order with proper escrow status
    const autoReleaseDays = hasPhysicalProducts ? AUTO_RELEASE_DAYS.physical : AUTO_RELEASE_DAYS.digital;
    const autoReleaseAt = new Date(Date.now() + autoReleaseDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({ 
        user_id: userId, 
        total_amount_eur: totalEUR, 
        status: 'confirmed',
        payment_currency: method.toUpperCase(),
        escrow_status: useEscrow ? 'held' : 'none',
        payment_status: useEscrow ? 'escrow_funded' : 'released',
        auto_release_at: useEscrow ? autoReleaseAt : null,
        shipping_first_name: shippingAddress?.firstName,
        shipping_last_name: shippingAddress?.lastName,
        shipping_street: shippingAddress?.street,
        shipping_house_number: shippingAddress?.houseNumber,
        shipping_postal_code: shippingAddress?.postalCode,
        shipping_city: shippingAddress?.city,
        shipping_country: shippingAddress?.country,
        buyer_notes: buyerNotes,
        buyer_notes_images: buyerNotesImages || []
      })
      .select()
      .maybeSingle();
    if (orderErr || !order) throw orderErr ?? new Error('Order creation failed');

    console.log(`Created order ${order.id} with escrow_status: ${useEscrow ? 'held' : 'none'}`);

    // Create order items and update stock
    for (const it of items) {
      const { data: product } = await supabase
        .from('products')
        .select('id, price, stock')
        .eq('id', it.id)
        .maybeSingle();
      if (!product) throw new Error('Product missing');

      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: it.id,
        quantity: it.quantity,
        price_eur: product.price,
      });

      const newStock = Math.max(0, Number(product.stock) - it.quantity);
      await supabase.from('products').update({ stock: newStock }).eq('id', it.id);
    }

    // Deduct buyer's internal balance
    if (method === 'btc') {
      await supabase.from('wallet_balances')
        .update({ balance_btc: Number(buyerBal.balance_btc) - totalBTC })
        .eq('user_id', userId);
    } else {
      await supabase.from('wallet_balances')
        .update({ balance_ltc: Number(buyerBal.balance_ltc || 0) - totalLTC })
        .eq('user_id', userId);
    }

    // Create buyer purchase transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'purchase',
      amount_eur: -totalEUR,
      amount_btc: method === 'btc' ? -totalBTC : 0,
      amount_ltc: method === 'ltc' ? -totalLTC : 0,
      status: 'confirmed',
      description: `Order #${String(order.id).slice(0,8)} (${method.toUpperCase()}) - ${useEscrow ? 'Escrow' : 'Direct'}`,
      transaction_direction: 'outgoing',
      related_order_id: order.id
    });

    // Process each seller
    for (const [sellerId, sums] of Object.entries(sellerTotals)) {
      const cryptoAmount = method === 'btc' ? sums.btc : sums.ltc;
      
      // Calculate fee and seller amounts
      const feeAmount = cryptoAmount * PLATFORM_FEE_PERCENT;
      const sellerAmount = cryptoAmount - feeAmount;
      const feeAmountEur = sums.eur * PLATFORM_FEE_PERCENT;
      const sellerAmountEur = sums.eur - feeAmountEur;

      // Get seller profile
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', sellerId)
        .maybeSingle();

      if (useEscrow) {
        // Create escrow holding - funds stay in escrow until buyer confirms
        const sellerAutoReleaseDays = sums.isDigital ? AUTO_RELEASE_DAYS.digital : AUTO_RELEASE_DAYS.physical;
        const sellerAutoReleaseAt = new Date(Date.now() + sellerAutoReleaseDays * 24 * 60 * 60 * 1000).toISOString();

        const { data: escrowHolding, error: escrowErr } = await supabase
          .from('escrow_holdings')
          .insert({
            order_id: order.id,
            buyer_id: userId,
            seller_id: sellerId,
            currency: method.toUpperCase(),
            amount_eur: sums.eur,
            amount_crypto: cryptoAmount,
            fee_amount_eur: feeAmountEur,
            fee_amount_crypto: feeAmount,
            seller_amount_eur: sellerAmountEur,
            seller_amount_crypto: sellerAmount,
            status: 'held',
            auto_release_at: sellerAutoReleaseAt,
            blockchain_tx_status: 'internal' // No blockchain TX yet, internal escrow only
          })
          .select()
          .maybeSingle();

        if (escrowErr) {
          console.error('Escrow creation error:', escrowErr);
          throw escrowErr;
        }

        console.log(`Created escrow holding ${escrowHolding?.id} for seller ${sellerId}: ${sellerAmount} ${method.toUpperCase()}`);

        // Create audit log entry for escrow creation
        await supabase.from('escrow_audit_log').insert({
          escrow_holding_id: escrowHolding?.id,
          order_id: order.id,
          action: 'funded',
          actor_id: userId,
          actor_type: 'buyer',
          previous_status: null,
          new_status: 'held',
          amount_btc: method === 'btc' ? cryptoAmount : 0,
          amount_ltc: method === 'ltc' ? cryptoAmount : 0,
          amount_eur: sums.eur,
          metadata: {
            payment_method: method,
            fee_percent: PLATFORM_FEE_PERCENT * 100,
            seller_username: sellerProfile?.username,
            buyer_username: buyerProfile?.username
          }
        });

        // Create pending sale transaction for seller (will be confirmed on release)
        await supabase.from('transactions').insert({
          user_id: sellerId,
          type: 'sale_pending',
          amount_eur: sellerAmountEur,
          amount_btc: method === 'btc' ? sellerAmount : 0,
          amount_ltc: method === 'ltc' ? sellerAmount : 0,
          status: 'pending',
          description: `Sale #${String(order.id).slice(0,8)} (${method.toUpperCase()}) - Im Escrow`,
          transaction_direction: 'incoming',
          from_username: buyerProfile?.username || 'Unknown',
          related_order_id: order.id
        });

      } else {
        // Direct payment without escrow - credit seller immediately
        const { data: sellerBal } = await supabase
          .from('wallet_balances')
          .select('balance_btc, balance_ltc')
          .eq('user_id', sellerId)
          .maybeSingle();

        if (sellerBal) {
          if (method === 'btc') {
            await supabase.from('wallet_balances')
              .update({ balance_btc: Number(sellerBal.balance_btc) + sellerAmount })
              .eq('user_id', sellerId);
          } else {
            await supabase.from('wallet_balances')
              .update({ balance_ltc: Number(sellerBal.balance_ltc || 0) + sellerAmount })
              .eq('user_id', sellerId);
          }
        }

        // Create confirmed sale transaction for seller
        await supabase.from('transactions').insert({
          user_id: sellerId,
          type: 'sale',
          amount_eur: sellerAmountEur,
          amount_btc: method === 'btc' ? sellerAmount : 0,
          amount_ltc: method === 'ltc' ? sellerAmount : 0,
          status: 'confirmed',
          description: `Sale #${String(order.id).slice(0,8)} (${method.toUpperCase()}) - Direct`,
          transaction_direction: 'incoming',
          from_username: buyerProfile?.username || 'Unknown',
          related_order_id: order.id
        });

        // Record fee transaction (internal, no blockchain)
        await supabase.from('admin_fee_transactions').insert({
          order_id: order.id,
          amount_eur: feeAmountEur,
          amount_crypto: feeAmount,
          currency: method.toUpperCase(),
          transaction_type: 'fee_collected',
          status: 'completed'
        });

        console.log(`Direct payment to seller ${sellerId}: ${sellerAmount} ${method.toUpperCase()}, fee: ${feeAmount}`);
      }
    }

    console.log(`Order ${order.id} completed successfully with ${useEscrow ? 'escrow' : 'direct'} payment`);

    return new Response(JSON.stringify({ 
      ok: true, 
      orderId: order.id,
      escrowStatus: useEscrow ? 'held' : 'none',
      paymentStatus: useEscrow ? 'escrow_funded' : 'released'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('process-order error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
