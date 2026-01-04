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

    console.log('Running auto-release escrow check...')

    // Find all escrow holdings that are past their auto-release date
    const now = new Date().toISOString()
    
    const { data: expiredHoldings, error: holdingsError } = await supabase
      .from('escrow_holdings')
      .select('*, orders(id, user_id)')
      .eq('status', 'held')
      .lte('auto_release_at', now)

    if (holdingsError) throw holdingsError

    if (!expiredHoldings || expiredHoldings.length === 0) {
      console.log('No escrow holdings ready for auto-release')
      return new Response(
        JSON.stringify({ success: true, message: 'No holdings to release', released: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${expiredHoldings.length} escrow holdings ready for auto-release`)

    let releasedCount = 0

    // Process each expired holding
    for (const holding of expiredHoldings) {
      try {
        const { seller_id, seller_amount_crypto, fee_amount_crypto, currency, fee_amount_eur, order_id, seller_amount_eur } = holding

        // 1. Credit seller's CRYPTO wallet (not EUR!)
        const balanceField = currency.toLowerCase() === 'btc' ? 'balance_btc' : 'balance_ltc'
        
        const { data: sellerWallet } = await supabase
          .from('wallet_balances')
          .select(balanceField)
          .eq('user_id', seller_id)
          .maybeSingle()

        const currentBalance = Number(sellerWallet?.[balanceField] || 0)
        const newBalance = currentBalance + Number(seller_amount_crypto)

        await supabase
          .from('wallet_balances')
          .update({ [balanceField]: newBalance })
          .eq('user_id', seller_id)

        console.log(`Credited seller ${seller_id}: ${seller_amount_crypto} ${currency} (new balance: ${newBalance})`)

        // Create seller transaction
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', holding.buyer_id)
          .maybeSingle()

        await supabase.from('transactions').insert({
          user_id: seller_id,
          type: 'sale',
          amount_eur: seller_amount_eur,
          amount_btc: currency.toLowerCase() === 'btc' ? seller_amount_crypto : 0,
          amount_ltc: currency.toLowerCase() === 'ltc' ? seller_amount_crypto : 0,
          status: 'confirmed',
          description: `Verkauf #${String(order_id).slice(0, 8)} (${currency}) - Auto-Release`,
          transaction_direction: 'incoming',
          from_username: buyerProfile?.username || 'Unknown',
          related_order_id: order_id
        })

        // 2. Record fee (platform keeps this in the pool)
        await supabase.from('admin_fee_transactions').insert({
          escrow_holding_id: holding.id,
          order_id: order_id,
          amount_eur: fee_amount_eur,
          amount_crypto: fee_amount_crypto,
          currency: currency.toUpperCase(),
          transaction_type: 'fee_collected',
          status: 'completed'
        })

        // 3. Update escrow holding status
        await supabase
          .from('escrow_holdings')
          .update({ 
            status: 'released',
            released_at: new Date().toISOString()
          })
          .eq('id', holding.id)

        // 4. Update order escrow status
        await supabase
          .from('orders')
          .update({ escrow_status: 'released' })
          .eq('id', order_id)

        console.log(`Auto-released escrow ${holding.id} for order ${order_id}`)
        releasedCount++

      } catch (holdingError) {
        console.error(`Error auto-releasing holding ${holding.id}:`, holdingError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Auto-released ${releasedCount} escrow holdings`,
        released: releasedCount
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
