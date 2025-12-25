import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_USER_ID = 'b7f1a65f-4d3a-43a3-a3ac-6ca95aa5c959'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { orderId, isAutoRelease } = await req.json()

    if (!orderId) throw new Error('Order ID required')

    // If not auto-release, verify the caller is the buyer
    if (!isAutoRelease) {
      const authHeader = req.headers.get('Authorization')
      const token = authHeader?.replace('Bearer ', '')
      const { data: userData } = await supabase.auth.getUser(token)
      
      // Get the order to verify buyer
      const { data: order } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', orderId)
        .maybeSingle()
      
      if (!order || order.user_id !== userData.user?.id) {
        throw new Error('Unauthorized - Only the buyer can release escrow')
      }
    }

    console.log('Releasing escrow for order:', orderId)

    // Get all escrow holdings for this order that are still held
    const { data: escrowHoldings, error: escrowError } = await supabase
      .from('escrow_holdings')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'held')

    if (escrowError) throw escrowError
    if (!escrowHoldings || escrowHoldings.length === 0) {
      throw new Error('No held escrow found for this order')
    }

    // Process each escrow holding
    for (const holding of escrowHoldings) {
      const { seller_id, seller_amount_crypto, fee_amount_crypto, currency, fee_amount_eur } = holding

      // 1. Credit seller's wallet
      const balanceField = currency.toLowerCase() === 'btc' ? 'balance_btc' : 'balance_ltc'
      
      const { data: sellerWallet } = await supabase
        .from('wallet_balances')
        .select(balanceField)
        .eq('user_id', seller_id)
        .maybeSingle()

      if (sellerWallet) {
        const currentBalance = Number(sellerWallet[balanceField] || 0)
        await supabase
          .from('wallet_balances')
          .update({ [balanceField]: currentBalance + Number(seller_amount_crypto) })
          .eq('user_id', seller_id)
      }

      // Create seller transaction
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', holding.buyer_id)
        .maybeSingle()

      await supabase.from('transactions').insert({
        user_id: seller_id,
        type: 'sale',
        amount_eur: holding.seller_amount_eur,
        amount_btc: currency.toLowerCase() === 'btc' ? seller_amount_crypto : 0,
        status: 'confirmed',
        description: `Sale #${String(orderId).slice(0, 8)} (${currency.toUpperCase()}) - Escrow released`,
        transaction_direction: 'incoming',
        from_username: buyerProfile?.username || 'Unknown',
        related_order_id: orderId
      })

      // 2. Credit admin fee address
      const { data: feeAddress } = await supabase
        .from('admin_fee_addresses')
        .select('*')
        .eq('admin_user_id', ADMIN_USER_ID)
        .eq('currency', currency.toUpperCase())
        .maybeSingle()

      if (feeAddress) {
        await supabase
          .from('admin_fee_addresses')
          .update({ balance: Number(feeAddress.balance) + Number(fee_amount_crypto) })
          .eq('id', feeAddress.id)
      }

      // 3. Record fee transaction
      await supabase.from('admin_fee_transactions').insert({
        escrow_holding_id: holding.id,
        order_id: orderId,
        amount_eur: fee_amount_eur,
        amount_crypto: fee_amount_crypto,
        currency: currency.toUpperCase(),
        transaction_type: 'fee_collected',
        status: 'completed'
      })

      // 4. Update escrow holding status
      await supabase
        .from('escrow_holdings')
        .update({ 
          status: 'released',
          released_at: new Date().toISOString()
        })
        .eq('id', holding.id)

      console.log(`Released escrow holding ${holding.id}: ${seller_amount_crypto} ${currency} to seller, ${fee_amount_crypto} ${currency} as fee`)
    }

    // 5. Update order escrow status
    await supabase
      .from('orders')
      .update({ 
        escrow_status: 'released',
        buyer_confirmed_at: isAutoRelease ? null : new Date().toISOString()
      })
      .eq('id', orderId)

    return new Response(
      JSON.stringify({ success: true, message: 'Escrow released successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in release-escrow:', error)
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})