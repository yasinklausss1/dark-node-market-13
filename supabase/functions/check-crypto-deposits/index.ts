import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting comprehensive crypto deposit check...')

    // Call both shared address check functions
    const results = {
      btc: { ok: false, message: '' },
      ltc: { ok: false, message: '' }
    }

    // Check BTC shared address
    try {
      const SHARED_BTC_ADDRESS = Deno.env.get('SHARED_BTC_ADDRESS')
      if (SHARED_BTC_ADDRESS) {
        const btcResult = await checkBtcDeposits(supabaseClient, SHARED_BTC_ADDRESS)
        results.btc = { ok: true, message: `Processed ${btcResult.processed} BTC deposits` }
        console.log('BTC check completed:', btcResult)
      } else {
        results.btc = { ok: false, message: 'SHARED_BTC_ADDRESS not configured' }
      }
    } catch (error) {
      console.error('BTC check error:', error)
      results.btc = { ok: false, message: String(error) }
    }

    // Check LTC shared address
    try {
      const SHARED_LTC_ADDRESS = Deno.env.get('SHARED_LTC_ADDRESS')
      if (SHARED_LTC_ADDRESS) {
        const ltcResult = await checkLtcDeposits(supabaseClient, SHARED_LTC_ADDRESS)
        results.ltc = { ok: true, message: `Processed ${ltcResult.processed} LTC deposits` }
        console.log('LTC check completed:', ltcResult)
      } else {
        results.ltc = { ok: false, message: 'SHARED_LTC_ADDRESS not configured' }
      }
    } catch (error) {
      console.error('LTC check error:', error)
      results.ltc = { ok: false, message: String(error) }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Deposit check completed',
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in deposit check:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

const SATS = 1e8
const TOLERANCE = 2 / SATS // ±2 sats/litoshis

async function checkBtcDeposits(supabase: any, sharedAddress: string) {
  let processed = 0

  // Fetch recent txs for the shared BTC address
  const txRes = await fetch(`https://mempool.space/api/address/${sharedAddress}/txs`)
  if (!txRes.ok) throw new Error(`mempool.space error: ${txRes.statusText}`)
  const txs = await txRes.json()

  // Current BTC-EUR rate
  const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur')
  const priceJson = await priceRes.json()
  const BTC_EUR = priceJson.bitcoin?.eur

  if (!BTC_EUR) {
    console.log('Warning: Unable to fetch BTC-EUR rate, using fallback')
  }

  for (const tx of txs || []) {
    // Sum outputs to our shared address
    let amountSats = 0
    for (const vout of tx.vout || []) {
      if (vout.scriptpubkey_address === sharedAddress) amountSats += vout.value
    }
    if (amountSats <= 0) continue

    const amountBtc = amountSats / SATS

    // Skip if we already processed this tx
    const { data: existingDeposit } = await supabase
      .from('deposit_requests')
      .select('id')
      .eq('tx_hash', tx.txid)
      .maybeSingle()
    if (existingDeposit) continue

    const now = new Date()

    // Find a matching pending deposit_request within tolerance and not expired
    const minAmt = amountBtc - TOLERANCE
    const maxAmt = amountBtc + TOLERANCE
    const { data: requests, error: reqErr } = await supabase
      .from('deposit_requests')
      .select('id, user_id, requested_eur, crypto_amount, rate_locked, created_at, expires_at')
      .eq('currency', 'BTC')
      .eq('status', 'pending')
      .gte('crypto_amount', minAmt)
      .lte('crypto_amount', maxAmt)
      .gt('expires_at', now.toISOString())
      .limit(1)
    if (reqErr) throw reqErr
    if (!requests || requests.length === 0) continue

    const request = requests[0]

    // Confirmations
    let confirmations = 0
    if (tx.status?.confirmed && tx.status.block_height) {
      const tipRes = await fetch('https://mempool.space/api/blocks/tip/height')
      const tip = await tipRes.json()
      confirmations = Math.max(0, tip - tx.status.block_height + 1)
    }

    console.log(`Processing BTC deposit: ${amountBtc} BTC for request ${request.id}, ${confirmations} confirmations`)

    // Mark request as received/confirmed
    await supabase
      .from('deposit_requests')
      .update({
        status: confirmations >= 1 ? 'confirmed' : 'received',
        tx_hash: tx.txid,
        confirmations: confirmations
      })
      .eq('id', request.id)

    // Create deposit transaction
    const amountEur = request.requested_eur
    await supabase.from('transactions').insert({
      user_id: request.user_id,
      type: 'deposit',
      amount_eur: amountEur,
      amount_btc: amountBtc,
      btc_tx_hash: tx.txid,
      btc_confirmations: confirmations,
      status: confirmations >= 1 ? 'completed' : 'pending',
      description: 'Bitcoin Einzahlung',
      transaction_direction: 'incoming'
    })

    // Update wallet balance if confirmed
    if (confirmations >= 1) {
      const { data: bal } = await supabase
        .from('wallet_balances')
        .select('balance_eur, balance_btc, balance_btc_deposited')
        .eq('user_id', request.user_id)
        .maybeSingle()
      
      if (bal) {
        await supabase
          .from('wallet_balances')
          .update({
            balance_btc: Number(bal.balance_btc || 0) + amountBtc,
            balance_btc_deposited: Number(bal.balance_btc_deposited || 0) + amountBtc,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', request.user_id)
      } else {
        await supabase
          .from('wallet_balances')
          .insert({ 
            user_id: request.user_id, 
            balance_eur: 0, 
            balance_btc: amountBtc, 
            balance_ltc: 0,
            balance_btc_deposited: amountBtc,
            balance_ltc_deposited: 0
          })
      }
      
      console.log(`Credited ${amountBtc} BTC to user ${request.user_id}`)
    }

    processed++
  }

  return { processed }
}

async function checkLtcDeposits(supabase: any, sharedAddress: string) {
  let processed = 0

  // Fetch recent txs for the shared LTC address
  const txRes = await fetch(`https://litecoinspace.org/api/address/${sharedAddress}/txs`)
  if (!txRes.ok) throw new Error(`litecoinspace.org error: ${txRes.statusText}`)
  const txs = await txRes.json()

  // Current LTC-EUR rate
  const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=eur')
  const priceJson = await priceRes.json()
  const LTC_EUR = priceJson.litecoin?.eur

  if (!LTC_EUR) {
    console.log('Warning: Unable to fetch LTC-EUR rate')
  }

  for (const tx of txs || []) {
    // Sum outputs to our shared address
    let amountLitoshi = 0
    for (const vout of tx.vout || []) {
      if (vout.scriptpubkey_address === sharedAddress) amountLitoshi += vout.value
    }
    if (amountLitoshi <= 0) continue

    const amountLtc = amountLitoshi / SATS

    // Skip if already processed
    const { data: existingDeposit } = await supabase
      .from('deposit_requests')
      .select('id')
      .eq('tx_hash', tx.txid)
      .maybeSingle()
    if (existingDeposit) continue

    const now = new Date()

    // Find a matching pending deposit_request within tolerance and not expired
    const minAmt = amountLtc - TOLERANCE
    const maxAmt = amountLtc + TOLERANCE
    const { data: requests, error: reqErr } = await supabase
      .from('deposit_requests')
      .select('id, user_id, requested_eur, crypto_amount, rate_locked, created_at, expires_at')
      .eq('currency', 'LTC')
      .eq('status', 'pending')
      .gte('crypto_amount', minAmt)
      .lte('crypto_amount', maxAmt)
      .gt('expires_at', now.toISOString())
      .limit(1)
    if (reqErr) throw reqErr
    if (!requests || requests.length === 0) continue

    const request = requests[0]

    // Confirmations
    let confirmations = 0
    if (tx.status?.confirmed && tx.status.block_height) {
      const tipRes = await fetch('https://litecoinspace.org/api/blocks/tip/height')
      const tip = await tipRes.json()
      confirmations = Math.max(0, tip - tx.status.block_height + 1)
    }

    console.log(`Processing LTC deposit: ${amountLtc} LTC for request ${request.id}, ${confirmations} confirmations`)

    await supabase
      .from('deposit_requests')
      .update({
        status: confirmations >= 1 ? 'confirmed' : 'received',
        tx_hash: tx.txid,
        confirmations: confirmations
      })
      .eq('id', request.id)

    const amountEur = request.requested_eur
    await supabase.from('transactions').insert({
      user_id: request.user_id,
      type: 'deposit',
      amount_eur: amountEur,
      amount_btc: amountLtc, // LTC amount stored in amount_btc field
      btc_tx_hash: tx.txid,
      btc_confirmations: confirmations,
      status: confirmations >= 1 ? 'completed' : 'pending',
      description: 'Litecoin Einzahlung',
      transaction_direction: 'incoming'
    })

    if (confirmations >= 1) {
      const { data: bal } = await supabase
        .from('wallet_balances')
        .select('balance_eur, balance_ltc, balance_ltc_deposited')
        .eq('user_id', request.user_id)
        .maybeSingle()
      
      if (bal) {
        await supabase
          .from('wallet_balances')
          .update({
            balance_ltc: Number(bal.balance_ltc || 0) + amountLtc,
            balance_ltc_deposited: Number(bal.balance_ltc_deposited || 0) + amountLtc,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', request.user_id)
      } else {
        await supabase
          .from('wallet_balances')
          .insert({ 
            user_id: request.user_id, 
            balance_eur: 0, 
            balance_btc: 0, 
            balance_ltc: amountLtc,
            balance_btc_deposited: 0,
            balance_ltc_deposited: amountLtc
          })
      }
      
      console.log(`Credited ${amountLtc} LTC to user ${request.user_id}`)
    }

    processed++
  }

  return { processed }
}
