import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { orderId, reason } = await req.json()

    if (!orderId) throw new Error('Order ID required')

    // Verify caller is an admin
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: userData } = await supabase.auth.getUser(token)
    
    if (!userData.user) {
      throw new Error('Authentication required')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      throw new Error('Admin authorization required')
    }

    console.log(`Refunding escrow for order: ${orderId}, admin: ${userData.user.id}`)

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

    const refundedAt = new Date().toISOString()

    // Process each escrow holding - refund to buyer
    for (const holding of escrowHoldings) {
      const { 
        id: holdingId,
        buyer_id, 
        seller_id,
        amount_crypto,
        currency, 
        amount_eur
      } = holding

      console.log(`Refunding escrow ${holdingId}: ${amount_crypto} ${currency} to buyer ${buyer_id}`)

      // Get buyer's current balance
      const { data: buyerBal } = await supabase
        .from('wallet_balances')
        .select('balance_btc, balance_ltc')
        .eq('user_id', buyer_id)
        .maybeSingle()

      // Credit buyer's internal balance (full refund, no fee)
      if (buyerBal) {
        if (currency.toUpperCase() === 'BTC') {
          await supabase.from('wallet_balances')
            .update({ balance_btc: Number(buyerBal.balance_btc) + Number(amount_crypto) })
            .eq('user_id', buyer_id)
        } else if (currency.toUpperCase() === 'LTC') {
          await supabase.from('wallet_balances')
            .update({ balance_ltc: Number(buyerBal.balance_ltc || 0) + Number(amount_crypto) })
            .eq('user_id', buyer_id)
        }
      }

      // Update escrow holding to refunded
      await supabase
        .from('escrow_holdings')
        .update({ 
          status: 'refunded',
          released_at: refundedAt,
          blockchain_tx_status: 'refunded'
        })
        .eq('id', holdingId)

      // Get usernames
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', buyer_id)
        .maybeSingle()

      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', seller_id)
        .maybeSingle()

      // Cancel pending sale transaction for seller
      await supabase
        .from('transactions')
        .update({
          status: 'cancelled',
          description: `Sale #${String(orderId).slice(0,8)} (${currency}) - Storniert`
        })
        .eq('related_order_id', orderId)
        .eq('user_id', seller_id)
        .eq('type', 'sale_pending')

      // Create refund transaction for buyer
      await supabase.from('transactions').insert({
        user_id: buyer_id,
        type: 'refund',
        amount_eur: amount_eur,
        amount_btc: currency.toUpperCase() === 'BTC' ? amount_crypto : 0,
        amount_ltc: currency.toUpperCase() === 'LTC' ? amount_crypto : 0,
        status: 'confirmed',
        description: `Refund #${String(orderId).slice(0,8)} (${currency}) - ${reason || 'Admin-Rückerstattung'}`,
        transaction_direction: 'incoming',
        from_username: 'System',
        related_order_id: orderId
      })

      // Create audit log entry
      await supabase.from('escrow_audit_log').insert({
        escrow_holding_id: holdingId,
        order_id: orderId,
        action: 'refunded',
        actor_id: userData.user.id,
        actor_type: 'admin',
        previous_status: 'held',
        new_status: 'refunded',
        amount_btc: currency.toUpperCase() === 'BTC' ? amount_crypto : 0,
        amount_ltc: currency.toUpperCase() === 'LTC' ? amount_crypto : 0,
        amount_eur: amount_eur,
        metadata: {
          refund_reason: reason,
          buyer_username: buyerProfile?.username,
          seller_username: sellerProfile?.username,
          admin_id: userData.user.id
        }
      })

      console.log(`Escrow ${holdingId} refunded: ${amount_crypto} ${currency} to buyer`)
    }

    // Update order status
    await supabase
      .from('orders')
      .update({ 
        escrow_status: 'refunded',
        payment_status: 'refunded',
        status: 'cancelled'
      })
      .eq('id', orderId)

    return new Response(
      JSON.stringify({ success: true, message: 'Escrow refunded to buyer' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in refund-escrow:', error)
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
