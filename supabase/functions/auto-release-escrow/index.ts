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
        const { seller_id, seller_amount_crypto, fee_amount_crypto, currency, fee_amount_eur, order_id } = holding

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
          description: `Sale #${String(order_id).slice(0, 8)} (${currency.toUpperCase()}) - Auto-released`,
          transaction_direction: 'incoming',
          from_username: buyerProfile?.username || 'Unknown',
          related_order_id: order_id
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
          order_id: order_id,
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

        // 5. Update order escrow status
        await supabase
          .from('orders')
          .update({ escrow_status: 'released' })
          .eq('id', order_id)

        console.log(`Auto-released escrow ${holding.id} for order ${order_id}`)
        releasedCount++

      } catch (holdingError) {
        console.error(`Error auto-releasing holding ${holding.id}:`, holdingError)
        // Continue with other holdings
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