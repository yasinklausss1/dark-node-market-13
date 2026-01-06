import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_USER_ID = '0af916bb-1c03-4173-a898-fd4274ae4a2b'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Running auto-release escrow job...')

    // Find escrow holdings that have passed their auto-release date
    const now = new Date().toISOString()
    
    const { data: expiredHoldings, error: fetchError } = await supabase
      .from('escrow_holdings')
      .select('*, orders!inner(id, user_id)')
      .eq('status', 'held')
      .lt('auto_release_at', now)

    if (fetchError) {
      console.error('Error fetching expired holdings:', fetchError)
      throw fetchError
    }

    if (!expiredHoldings || expiredHoldings.length === 0) {
      console.log('No expired escrow holdings found')
      return new Response(
        JSON.stringify({ success: true, message: 'No expired holdings to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${expiredHoldings.length} expired escrow holdings to auto-release`)

    let processedCount = 0
    let errorCount = 0

    for (const holding of expiredHoldings) {
      try {
        const { 
          id: holdingId,
          order_id,
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

        console.log(`Auto-releasing escrow ${holdingId} for order ${order_id}`)

        // Get seller's current balance
        const { data: sellerBal } = await supabase
          .from('wallet_balances')
          .select('balance_btc, balance_ltc')
          .eq('user_id', seller_id)
          .maybeSingle()

        // Credit seller's internal balance
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
          await supabase.from('wallet_balances').insert({
            user_id: seller_id,
            balance_btc: currency.toUpperCase() === 'BTC' ? seller_amount_crypto : 0,
            balance_ltc: currency.toUpperCase() === 'LTC' ? seller_amount_crypto : 0,
            balance_eur: 0
          })
        }

        const releasedAt = new Date().toISOString()

        // Update escrow holding status
        await supabase
          .from('escrow_holdings')
          .update({ 
            status: 'released',
            released_at: releasedAt,
            blockchain_tx_status: 'completed'
          })
          .eq('id', holdingId)

        // Get usernames for records
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
            description: `Sale #${String(order_id).slice(0,8)} (${currency}) - Auto-Freigabe`
          })
          .eq('related_order_id', order_id)
          .eq('user_id', seller_id)
          .eq('type', 'sale_pending')

        // Create sale transaction if no pending one was found
        const { data: existingTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('related_order_id', order_id)
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
            description: `Sale #${String(order_id).slice(0,8)} (${currency}) - Auto-Freigabe`,
            transaction_direction: 'incoming',
            from_username: buyerProfile?.username || 'Unknown',
            related_order_id: order_id
          })
        }

        // Record fee transaction
        await supabase.from('admin_fee_transactions').insert({
          escrow_holding_id: holdingId,
          order_id: order_id,
          amount_eur: fee_amount_eur,
          amount_crypto: fee_amount_crypto,
          currency: currency.toUpperCase(),
          transaction_type: 'fee_collected',
          status: 'completed'
        })

        // Create audit log entry
        await supabase.from('escrow_audit_log').insert({
          escrow_holding_id: holdingId,
          order_id: order_id,
          action: 'auto_released',
          actor_id: SYSTEM_USER_ID,
          actor_type: 'system',
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
            release_reason: 'auto_release_timer_expired'
          }
        })

        // Check if all holdings for this order are now released
        const { data: remainingHeld } = await supabase
          .from('escrow_holdings')
          .select('id')
          .eq('order_id', order_id)
          .eq('status', 'held')

        if (!remainingHeld || remainingHeld.length === 0) {
          // Update order escrow status
          await supabase
            .from('orders')
            .update({ 
              escrow_status: 'released',
              payment_status: 'released'
            })
            .eq('id', order_id)
        }

        console.log(`Successfully auto-released escrow ${holdingId}`)
        processedCount++

      } catch (holdingError) {
        console.error(`Error processing holding ${holding.id}:`, holdingError)
        errorCount++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Auto-release complete`, 
        processed: processedCount,
        errors: errorCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in auto-release-escrow:', error)
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
