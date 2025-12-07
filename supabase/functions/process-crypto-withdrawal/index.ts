import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validate Bitcoin address format
function validateBitcoinAddress(address: string): boolean {
  const btcRegex = /^([13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})$/
  return btcRegex.test(address)
}

// Validate Litecoin address format
function validateLitecoinAddress(address: string): boolean {
  const ltcRegex = /^([LM3][a-km-zA-HJ-NP-Z1-9]{26,33}|ltc1[a-z0-9]{39,59})$/
  return ltcRegex.test(address)
}

// Get current crypto prices
async function getCryptoPrices(): Promise<{ btc: number; ltc: number }> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin&vs_currencies=eur'
    )
    const data = await response.json()
    return {
      btc: data.bitcoin?.eur || 90000,
      ltc: data.litecoin?.eur || 100,
    }
  } catch (error) {
    console.error('Error fetching prices:', error)
    return { btc: 90000, ltc: 100 }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentifizierung erforderlich' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { currency, amount, destinationAddress } = await req.json()

    console.log(`Processing withdrawal request: ${amount} EUR in ${currency} to ${destinationAddress}`)

    // Validate currency
    if (!['BTC', 'LTC'].includes(currency)) {
      return new Response(
        JSON.stringify({ error: 'Ungültige Währung' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate destination address
    const isValidAddress = currency === 'BTC' 
      ? validateBitcoinAddress(destinationAddress)
      : validateLitecoinAddress(destinationAddress)

    if (!isValidAddress) {
      return new Response(
        JSON.stringify({ error: `Ungültige ${currency}-Adresse` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get withdrawal fees
    const { data: feeData, error: feeError } = await adminClient
      .from('withdrawal_fees')
      .select('*')
      .eq('currency', currency)
      .single()

    if (feeError || !feeData) {
      console.error('Fee error:', feeError)
      return new Response(
        JSON.stringify({ error: 'Auszahlungsgebühren nicht konfiguriert' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check minimum amount
    const amountEur = parseFloat(amount)
    if (amountEur < feeData.min_amount_eur) {
      return new Response(
        JSON.stringify({ error: `Mindestbetrag ist ${feeData.min_amount_eur} EUR` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current prices
    const prices = await getCryptoPrices()
    const currentPrice = currency === 'BTC' ? prices.btc : prices.ltc

    // Calculate fees (using correct field names from database)
    const percentageFee = amountEur * feeData.percentage_fee
    const totalFeeEur = feeData.base_fee_eur + percentageFee
    const netAmountEur = amountEur - totalFeeEur

    if (netAmountEur <= 0) {
      return new Response(
        JSON.stringify({ error: 'Betrag nach Gebühren zu gering' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cryptoAmount = netAmountEur / currentPrice

    // Check user balance
    const { data: balance, error: balanceError } = await adminClient
      .from('wallet_balances')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (balanceError || !balance) {
      return new Response(
        JSON.stringify({ error: 'Wallet nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has enough crypto (convert EUR amount to crypto for check)
    const totalCryptoNeeded = amountEur / currentPrice
    const userBalance = currency === 'BTC' ? Number(balance.balance_btc) : Number(balance.balance_ltc)

    if (userBalance < totalCryptoNeeded) {
      return new Response(
        JSON.stringify({ 
          error: `Unzureichendes ${currency}-Guthaben. Du hast ${userBalance.toFixed(8)} ${currency}, benötigst aber ${totalCryptoNeeded.toFixed(8)} ${currency}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check withdrawal limits
    const { data: limitsCheck } = await adminClient.rpc('check_withdrawal_limits', {
      user_uuid: user.id,
      amount_eur: amountEur
    })

    if (limitsCheck === false) {
      return new Response(
        JSON.stringify({ error: 'Auszahlungslimit überschritten' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create withdrawal request
    const { data: withdrawalRequest, error: insertError } = await adminClient
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        currency,
        amount_crypto: cryptoAmount,
        amount_eur: amountEur,
        destination_address: destinationAddress,
        status: 'pending',
        fee_eur: totalFeeEur,
      })
      .select()
      .single()

    if (insertError || !withdrawalRequest) {
      console.error('Insert error:', insertError)
      throw new Error('Auszahlungsanfrage konnte nicht erstellt werden')
    }

    console.log(`Created withdrawal request ${withdrawalRequest.id}`)

    // Deduct balance immediately
    const balanceField = currency === 'BTC' ? 'balance_btc' : 'balance_ltc'
    const newBalance = userBalance - totalCryptoNeeded

    const { error: updateError } = await adminClient
      .from('wallet_balances')
      .update({
        [balanceField]: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Balance update error:', updateError)
      // Rollback withdrawal request
      await adminClient.from('withdrawal_requests').delete().eq('id', withdrawalRequest.id)
      throw new Error('Guthaben konnte nicht aktualisiert werden')
    }

    // Create transaction record
    await adminClient.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount_eur: -amountEur,
      amount_btc: currency === 'BTC' ? -totalCryptoNeeded : -totalCryptoNeeded, // Store in amount_btc for both
      status: 'pending',
      description: `${currency} Auszahlung an ${destinationAddress.slice(0, 10)}...`,
      transaction_direction: 'outgoing',
    })

    // Update status to processing (admin will complete manually or via cron)
    await adminClient
      .from('withdrawal_requests')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString() 
      })
      .eq('id', withdrawalRequest.id)

    console.log(`Withdrawal request ${withdrawalRequest.id} is now processing`)

    return new Response(
      JSON.stringify({
        success: true,
        withdrawal_id: withdrawalRequest.id,
        message: 'Auszahlungsanfrage erstellt und wird verarbeitet',
        fee_eur: totalFeeEur,
        net_amount_eur: netAmountEur,
        estimated_crypto_amount: cryptoAmount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in withdrawal processing:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Auszahlung fehlgeschlagen' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
