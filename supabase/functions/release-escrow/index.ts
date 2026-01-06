import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_USER_ID = '0af916bb-1c03-4173-a898-fd4274ae4a2b'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { orderId, isAutoRelease, isAdminRelease } = await req.json()

    if (!orderId) throw new Error('Order ID required')

    let actorId = ADMIN_USER_ID
    let actorType = 'system'

    // Verify caller authorization
    if (!isAutoRelease) {
      const authHeader = req.headers.get('Authorization')
      const token = authHeader?.replace('Bearer ', '')
      const { data: userData } = await supabase.auth.getUser(token)
      
      if (!userData.user) {
        throw new Error('Authentication required')
      }

      actorId = userData.user.id
      
      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userData.user.id)
        .maybeSingle()

      if (isAdminRelease) {
        // Only admins can do admin release
        if (profile?.role !== 'admin') {
          throw new Error('Admin authorization required')
        }
        actorType = 'admin'
      } else {
        // Verify the caller is the buyer
        const { data: order } = await supabase
          .from('orders')
          .select('user_id')
          .eq('id', orderId)
          .maybeSingle()
        
        if (!order || order.user_id !== userData.user.id) {
          throw new Error('Unauthorized - Only the buyer can release escrow')
        }
        actorType = 'buyer'
      }
    } else {
      actorType = 'system'
    }

    console.log(`Releasing escrow for order: ${orderId}, actor: ${actorType}, actorId: ${actorId}`)

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

    const releasedAt = new Date().toISOString()

    // Process each escrow holding - internal ledger transfer only
    for (const holding of escrowHoldings) {
      const { 
        id: holdingId,
        buyer_id, 
        seller_id, 
        seller_amount_crypto, 
        fee_amount_crypto, 
        currency, 
        fee_amount_eur, 
        seller_amount_eur,
        amount_crypto,
        amount_eur
      } = holding

      console.log(`Processing escrow holding ${holdingId}: ${seller_amount_crypto} ${currency} to seller ${seller_id}`)

      // Get seller's current balance
      const { data: sellerBal } = await supabase
        .from('wallet_balances')
        .select('balance_btc, balance_ltc')
        .eq('user_id', seller_id)
        .maybeSingle()

      // Credit seller's internal balance (minus platform fee)
      if (sellerBal) {
        if (currency.toUpperCase() === 'BTC') {
          await supabase.from('wallet_balances')
            .update({ balance_btc: Number(sellerBal.balance_btc) + Number(seller_amount_crypto) })
            .eq('user_id', seller_id)
        } else if (currency.toUpperCase() === 'LTC') {
          await supabase.from('wallet_balances')
            .update({ balance_ltc: Number(sellerBal.balance_ltc || 0) + Number(seller_amount_crypto) })
            .eq('user_id', seller_id)
        }
      } else {
        // Create wallet if doesn't exist
        await supabase.from('wallet_balances').insert({
          user_id: seller_id,
          balance_btc: currency.toUpperCase() === 'BTC' ? seller_amount_crypto : 0,
          balance_ltc: currency.toUpperCase() === 'LTC' ? seller_amount_crypto : 0,
          balance_eur: 0
        })
      }

      // Update escrow holding to released
      await supabase
        .from('escrow_holdings')
        .update({ 
          status: 'released',
          released_at: releasedAt,
          blockchain_tx_status: 'completed'
        })
        .eq('id', holdingId)

      // Get usernames for transaction records
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

      // Update pending sale transaction to confirmed
      await supabase
        .from('transactions')
        .update({
          status: 'confirmed',
          type: 'sale',
          description: `Sale #${String(orderId).slice(0,8)} (${currency}) - Escrow freigegeben`
        })
        .eq('related_order_id', orderId)
        .eq('user_id', seller_id)
        .eq('type', 'sale_pending')

      // If no pending transaction found, create a new confirmed one
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('related_order_id', orderId)
        .eq('user_id', seller_id)
        .eq('type', 'sale')
        .maybeSingle()

      if (!existingTx) {
        await supabase.from('transactions').insert({
          user_id: seller_id,
          type: 'sale',
          amount_eur: seller_amount_eur,
          amount_btc: currency.toUpperCase() === 'BTC' ? seller_amount_crypto : 0,
          amount_ltc: currency.toUpperCase() === 'LTC' ? seller_amount_crypto : 0,
          status: 'confirmed',
          description: `Sale #${String(orderId).slice(0,8)} (${currency}) - Escrow freigegeben`,
          transaction_direction: 'incoming',
          from_username: buyerProfile?.username || 'Unknown',
          related_order_id: orderId
        })
      }

      // Record fee transaction
      await supabase.from('admin_fee_transactions').insert({
        escrow_holding_id: holdingId,
        order_id: orderId,
        amount_eur: fee_amount_eur,
        amount_crypto: fee_amount_crypto,
        currency: currency.toUpperCase(),
        transaction_type: 'fee_collected',
        status: 'completed'
      })

      // Create audit log entry for release
      await supabase.from('escrow_audit_log').insert({
        escrow_holding_id: holdingId,
        order_id: orderId,
        action: isAutoRelease ? 'auto_released' : (isAdminRelease ? 'admin_released' : 'released'),
        actor_id: actorId,
        actor_type: actorType,
        previous_status: 'held',
        new_status: 'released',
        amount_btc: currency.toUpperCase() === 'BTC' ? amount_crypto : 0,
        amount_ltc: currency.toUpperCase() === 'LTC' ? amount_crypto : 0,
        amount_eur: amount_eur,
        metadata: {
          seller_credited: seller_amount_crypto,
          fee_collected: fee_amount_crypto,
          seller_username: sellerProfile?.username,
          buyer_username: buyerProfile?.username,
          release_type: isAutoRelease ? 'automatic' : (isAdminRelease ? 'admin' : 'buyer_confirmed')
        }
      })

      console.log(`Escrow ${holdingId} released: ${seller_amount_crypto} ${currency} to seller, ${fee_amount_crypto} ${currency} fee`)
    }

    // Update order escrow status
    await supabase
      .from('orders')
      .update({ 
        escrow_status: 'released',
        payment_status: 'released',
        buyer_confirmed_at: isAutoRelease ? null : releasedAt
      })
      .eq('id', orderId)

    return new Response(
      JSON.stringify({ success: true, message: 'Escrow released successfully - Seller credited!' }),
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
