import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

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
    const { userId, items, method, btcPrice, ltcPrice, shippingAddress } = body as {
      userId: string;
      items: CartItem[];
      method: 'btc' | 'ltc' | 'credits';
      btcPrice?: number;
      ltcPrice?: number;
      shippingAddress: {
        firstName: string;
        lastName: string;
        street: string;
        houseNumber: string;
        postalCode: string;
        city: string;
        country: string;
      };
    };

    console.log(`Processing order for user ${userId} with method ${method}`);

    if (!userId || !items?.length || !method || !shippingAddress) throw new Error('Invalid payload');

    // Load product info and compute totals + amounts per seller
    const sellerTotals: Record<string, { eur: number; btc: number; ltc: number; credits: number }> = {};
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
      const creditsAmt = Math.ceil(lineEUR); // Credits = EUR rounded up

      const s = sellerTotals[product.seller_id] || { eur: 0, btc: 0, ltc: 0, credits: 0 };
      s.eur += lineEUR;
      s.btc += btcAmt;
      s.ltc += ltcAmt;
      s.credits += creditsAmt;
      sellerTotals[product.seller_id] = s;
    }

    // Check buyer balance
    const { data: buyerBal } = await supabase
      .from('wallet_balances')
      .select('balance_eur, balance_btc, balance_ltc, balance_credits')
      .eq('user_id', userId)
      .maybeSingle();
    if (!buyerBal) throw new Error('Buyer wallet not found');

    const totalBTC = method === 'btc' ? (totalEUR / (btcPrice || 1)) : 0;
    const totalLTC = method === 'ltc' ? (totalEUR / (ltcPrice || 1)) : 0;
    const totalCredits = method === 'credits' ? Math.ceil(totalEUR) : 0;

    console.log(`Total: ${totalEUR} EUR, ${totalCredits} credits, Buyer has: ${buyerBal.balance_credits} credits`);

    if (method === 'btc' && Number(buyerBal.balance_btc) + 1e-12 < totalBTC) throw new Error('Insufficient BTC balance');
    if (method === 'ltc' && Number((buyerBal as any).balance_ltc || 0) + 1e-12 < totalLTC) throw new Error('Insufficient LTC balance');
    if (method === 'credits' && Number(buyerBal.balance_credits || 0) < totalCredits) throw new Error('Insufficient credits balance');

    // Create order with shipping address
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({ 
        user_id: userId, 
        total_amount_eur: totalEUR, 
        status: 'confirmed',
        shipping_first_name: shippingAddress.firstName,
        shipping_last_name: shippingAddress.lastName,
        shipping_street: shippingAddress.street,
        shipping_house_number: shippingAddress.houseNumber,
        shipping_postal_code: shippingAddress.postalCode,
        shipping_city: shippingAddress.city,
        shipping_country: shippingAddress.country
      })
      .select()
      .maybeSingle();
    if (orderErr || !order) throw orderErr ?? new Error('Order creation failed');

    // Create order items and update stock - with correct discounted prices
    for (const it of items) {
      const { data: product } = await supabase
        .from('products')
        .select('id, price, stock')
        .eq('id', it.id)
        .maybeSingle();
      if (!product) throw new Error('Product missing');

      // Recalculate the discounted price for order item
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

      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: it.id,
        quantity: it.quantity,
        price_eur: discountedPrice, // Store the discounted price
      });

      const newStock = Math.max(0, Number(product.stock) - it.quantity);
      await supabase.from('products').update({ stock: newStock }).eq('id', it.id);
    }

    // Deduct buyer balance and create buyer transaction
    if (method === 'btc') {
      await supabase.from('wallet_balances')
        .update({ balance_btc: Number(buyerBal.balance_btc) - totalBTC })
        .eq('user_id', userId);
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'purchase',
        amount_eur: -totalEUR,
        amount_btc: -totalBTC,
        status: 'confirmed',
        description: `Order #${String(order.id).slice(0,8)} (BTC)`,
        transaction_direction: 'outgoing',
        related_order_id: order.id
      });
    } else if (method === 'ltc') {
      await supabase.from('wallet_balances')
        .update({ balance_ltc: Number((buyerBal as any).balance_ltc || 0) - totalLTC })
        .eq('user_id', userId);
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'purchase',
        amount_eur: -totalEUR,
        amount_btc: -totalLTC,
        status: 'confirmed',
        description: `Order #${String(order.id).slice(0,8)} (LTC)`,
        transaction_direction: 'outgoing',
        related_order_id: order.id
      });
    } else if (method === 'credits') {
      console.log(`Deducting ${totalCredits} credits from buyer ${userId}`);
      
      // Deduct credits from buyer
      await supabase.from('wallet_balances')
        .update({ balance_credits: Number(buyerBal.balance_credits || 0) - totalCredits })
        .eq('user_id', userId);
      
      // Create credit transaction for buyer
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        type: 'purchase',
        amount: -totalCredits,
        description: `Order #${String(order.id).slice(0,8)}`,
        related_order_id: order.id
      });

      console.log(`Credits deducted successfully from buyer`);
    }

    // Get buyer username for transaction tracking
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', userId)
      .maybeSingle();

    // Credit each seller and create seller transactions
    for (const [sellerId, sums] of Object.entries(sellerTotals)) {
      if (method === 'btc') {
        const { data: sBal } = await supabase
          .from('wallet_balances')
          .select('balance_btc')
          .eq('user_id', sellerId)
          .maybeSingle();
        if (sBal) {
          await supabase.from('wallet_balances')
            .update({ balance_btc: Number(sBal.balance_btc) + sums.btc })
            .eq('user_id', sellerId);
        } else {
          await supabase.from('wallet_balances')
            .insert({ user_id: sellerId, balance_eur: 0, balance_btc: sums.btc, balance_ltc: 0 });
        }
        await supabase.from('transactions').insert({
          user_id: sellerId,
          type: 'sale',
          amount_eur: sums.eur,
          amount_btc: sums.btc,
          status: 'confirmed',
          description: `Sale #${String(order.id).slice(0,8)} (BTC)`,
          transaction_direction: 'incoming',
          from_username: buyerProfile?.username || 'Unknown',
          related_order_id: order.id
        });
      } else if (method === 'ltc') {
        const { data: sBal } = await supabase
          .from('wallet_balances')
          .select('balance_ltc')
          .eq('user_id', sellerId)
          .maybeSingle();
        if (sBal) {
          await supabase.from('wallet_balances')
            .update({ balance_ltc: Number((sBal as any).balance_ltc || 0) + sums.ltc })
            .eq('user_id', sellerId);
        } else {
          await supabase.from('wallet_balances')
            .insert({ user_id: sellerId, balance_eur: 0, balance_btc: 0, balance_ltc: sums.ltc });
        }
        await supabase.from('transactions').insert({
          user_id: sellerId,
          type: 'sale',
          amount_eur: sums.eur,
          amount_btc: sums.ltc,
          status: 'confirmed',
          description: `Sale #${String(order.id).slice(0,8)} (LTC)`,
          transaction_direction: 'incoming',
          from_username: buyerProfile?.username || 'Unknown',
          related_order_id: order.id
        });
      } else if (method === 'credits') {
        console.log(`Crediting ${sums.credits} credits to seller ${sellerId}`);
        
        // Get current balance
        const { data: sBal } = await supabase
          .from('wallet_balances')
          .select('balance_credits')
          .eq('user_id', sellerId)
          .maybeSingle();
        
        console.log(`Seller ${sellerId} current balance:`, sBal);
        
        if (sBal) {
          const newBalance = Number(sBal.balance_credits || 0) + sums.credits;
          console.log(`Updating seller balance from ${sBal.balance_credits} to ${newBalance}`);
          
          const { error: updateError } = await supabase.from('wallet_balances')
            .update({ balance_credits: newBalance })
            .eq('user_id', sellerId);
          
          if (updateError) {
            console.error(`Error updating seller balance:`, updateError);
            throw updateError;
          }
        } else {
          console.log(`Creating wallet for seller ${sellerId}`);
          // Create wallet if it doesn't exist
          await supabase.rpc('get_or_create_wallet_balance', { user_uuid: sellerId });
          
          const { error: updateError } = await supabase.from('wallet_balances')
            .update({ balance_credits: sums.credits })
            .eq('user_id', sellerId);
          
          if (updateError) {
            console.error(`Error creating seller balance:`, updateError);
            throw updateError;
          }
        }
        
        console.log(`Creating credit transaction for seller ${sellerId}`);
        
        // Create credit transaction for seller
        const { error: txError } = await supabase.from('credit_transactions').insert({
          user_id: sellerId,
          type: 'sale',
          amount: sums.credits,
          description: `Sale #${String(order.id).slice(0,8)} from ${buyerProfile?.username || 'Unknown'}`,
          related_order_id: order.id
        });
        
        if (txError) {
          console.error(`Error creating seller transaction:`, txError);
          throw txError;
        }

        console.log(`Credits credited successfully to seller ${sellerId}`);
      }
    }

    // Mark order as confirmed
    await supabase.from('orders').update({ status: 'confirmed' }).eq('id', order.id);

    return new Response(JSON.stringify({ ok: true, orderId: order.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('process-order error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});