import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_USER_ID = '0af916bb-1c03-4173-a898-fd4274ae4a2b'

// Decryption utility
async function decryptPrivateKey(encryptedKey: string, encryptionKey: string): Promise<string> {
  const decoder = new TextDecoder()
  const keyData = new TextEncoder().encode(encryptionKey.slice(0, 32).padEnd(32, '0'))
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  
  const encryptedBytes = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0))
  const iv = encryptedBytes.slice(0, 12)
  const data = encryptedBytes.slice(12)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  )
  
  return decoder.decode(decrypted)
}

// Validate Bitcoin address
function validateBitcoinAddress(address: string): boolean {
  // Legacy (1...), SegWit (3...), Native SegWit (bc1...)
  const btcRegex = /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/
  return btcRegex.test(address)
}

// Validate Litecoin address
function validateLitecoinAddress(address: string): boolean {
  // Legacy (L...), M-addresses, Native SegWit (ltc1...)
  const ltcRegex = /^(L[a-km-zA-HJ-NP-Z1-9]{26,33}|M[a-km-zA-HJ-NP-Z1-9]{26,33}|ltc1[a-zA-HJ-NP-Z0-9]{25,90})$/
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
      btc: data.bitcoin?.eur || 95000,
      ltc: data.litecoin?.eur || 100
    }
  } catch {
    console.log('⚠️ CoinGecko API failed, using fallback prices')
    return { btc: 95000, ltc: 100 }
  }
}

// Get pool balance via Tatum
async function getPoolBalance(currency: string, address: string, tatumApiKey: string): Promise<number> {
  try {
    const chain = currency === 'BTC' ? 'bitcoin' : 'litecoin'
    const response = await fetch(`https://api.tatum.io/v3/${chain}/address/balance/${address}`, {
      headers: { 'x-api-key': tatumApiKey }
    })
    
    if (!response.ok) {
      console.error(`Tatum balance check failed for ${currency}:`, await response.text())
      return 0
    }
    
    const data = await response.json()
    // Tatum returns balance in the coin's native unit
    return parseFloat(data.incoming) - parseFloat(data.outgoing)
  } catch (error) {
    console.error(`Error fetching ${currency} balance:`, error)
    return 0
  }
}

// Send transaction via Tatum
async function sendTatumTransaction(
  currency: string,
  fromAddress: string,
  toAddress: string,
  amount: number,
  privateKeyWIF: string,
  tatumApiKey: string
): Promise<{ txId: string }> {
  const chain = currency === 'BTC' ? 'bitcoin' : 'litecoin'
  
  console.log(`📤 Sending ${amount} ${currency} from ${fromAddress} to ${toAddress}`)
  
  // Use Tatum's transaction endpoint with fromAddress source
  const response = await fetch(`https://api.tatum.io/v3/${chain}/transaction`, {
    method: 'POST',
    headers: {
      'x-api-key': tatumApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fromAddress: [{
        address: fromAddress,
        privateKey: privateKeyWIF
      }],
      to: [{
        address: toAddress,
        value: amount
      }]
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    console.error(`Tatum ${currency} transaction error:`, errorData)
    throw new Error(errorData.message || errorData.data?.join(', ') || `Tatum transaction failed: ${response.statusText}`)
  }

  const result = await response.json()
  console.log(`✅ ${currency} transaction sent:`, result.txId)
  return { txId: result.txId }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { currency, amountEur, destinationAddress } = await req.json()
    
    console.log(`🚀 Processing ${currency} withdrawal for user ${user.id}`)
    console.log(`   Amount: €${amountEur}, Destination: ${destinationAddress}`)

    // Validate currency
    if (!['BTC', 'LTC'].includes(currency)) {
      throw new Error('Invalid currency. Only BTC and LTC are supported.')
    }

    // Validate destination address
    if (currency === 'BTC' && !validateBitcoinAddress(destinationAddress)) {
      throw new Error('Invalid Bitcoin address format')
    }
    if (currency === 'LTC' && !validateLitecoinAddress(destinationAddress)) {
      throw new Error('Invalid Litecoin address format')
    }

    const tatumApiKey = Deno.env.get('TATUM_API_KEY')
    if (!tatumApiKey) {
      throw new Error('Tatum API key not configured')
    }

    // Get withdrawal fees
    const { data: feeData } = await supabase
      .from('withdrawal_fees')
      .select('*')
      .eq('currency', currency)
      .single()

    const minWithdrawal = feeData?.min_withdrawal_eur || (currency === 'BTC' ? 10 : 5)
    const feePercent = feeData?.fee_percent || 1.5
    const networkFee = feeData?.network_fee_eur || (currency === 'BTC' ? 2.5 : 0.5)

    if (amountEur < minWithdrawal) {
      throw new Error(`Minimum withdrawal is €${minWithdrawal}`)
    }

    // Calculate fees
    const percentFee = amountEur * (feePercent / 100)
    const totalFee = percentFee + networkFee
    const netAmountEur = amountEur - totalFee

    // Get crypto prices
    const prices = await getCryptoPrices()
    const cryptoPrice = currency === 'BTC' ? prices.btc : prices.ltc
    const cryptoAmount = netAmountEur / cryptoPrice

    console.log(`   Net: €${netAmountEur.toFixed(2)}, Crypto: ${cryptoAmount.toFixed(8)} ${currency}`)

    // Check user's internal balance
    const { data: walletData } = await supabase
      .from('wallet_balances')
      .select('balance_btc, balance_ltc')
      .eq('user_id', user.id)
      .single()

    const balanceField = currency === 'BTC' ? 'balance_btc' : 'balance_ltc'
    const userBalance = Number(walletData?.[balanceField as keyof typeof walletData] || 0)
    
    // User needs enough crypto in their internal balance
    // Calculate how much crypto the user needs to have (amount in EUR / price)
    const requiredCrypto = amountEur / cryptoPrice

    if (userBalance < requiredCrypto) {
      throw new Error(`Insufficient ${currency} balance. You have ${userBalance.toFixed(8)} ${currency}, need ${requiredCrypto.toFixed(8)} ${currency}`)
    }

    // Check withdrawal limits
    const { data: limitsOk, error: limitsError } = await supabase
      .rpc('check_withdrawal_limits', { user_uuid: user.id, amount_eur: amountEur })

    if (limitsError || !limitsOk) {
      throw new Error('Withdrawal limit exceeded')
    }

    // Get pool address and private key
    const { data: poolData } = await supabase
      .from('admin_fee_addresses')
      .select('address, private_key_encrypted, balance')
      .eq('currency', currency)
      .eq('admin_user_id', ADMIN_USER_ID)
      .single()

    if (!poolData?.address || !poolData?.private_key_encrypted) {
      throw new Error(`${currency} pool not configured`)
    }

    // Check real pool balance via Tatum
    const poolBalance = await getPoolBalance(currency, poolData.address, tatumApiKey)
    console.log(`   Pool balance: ${poolBalance} ${currency}`)

    if (poolBalance < cryptoAmount) {
      // Log low liquidity alert
      await supabase.from('admin_alerts').insert({
        alert_type: 'low_liquidity',
        severity: 'high',
        message: `${currency} pool has insufficient liquidity. Requested: ${cryptoAmount} ${currency}, Available: ${poolBalance} ${currency}`,
        metadata: { currency, requested: cryptoAmount, available: poolBalance }
      }).catch(() => {})
      
      throw new Error(`Insufficient pool liquidity. Please try a smaller amount or wait for pool to be refilled.`)
    }

    // Create withdrawal request
    const { data: withdrawalRequest, error: requestError } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        currency,
        amount_eur: amountEur,
        amount_crypto: cryptoAmount,
        destination_address: destinationAddress,
        fee_eur: totalFee,
        status: 'processing'
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating withdrawal request:', requestError)
      throw new Error('Failed to create withdrawal request')
    }

    // Deduct from user's internal balance immediately
    const newUserBalance = userBalance - requiredCrypto
    const updateField = currency === 'BTC' ? 'balance_btc' : 'balance_ltc'
    
    await supabase
      .from('wallet_balances')
      .update({ [updateField]: newUserBalance })
      .eq('user_id', user.id)

    // Create pending transaction record
    const amountField = currency === 'BTC' ? 'amount_btc' : 'amount_ltc'
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      [amountField]: -requiredCrypto,
      status: 'pending',
      description: `Withdrawal to ${destinationAddress.substring(0, 10)}...`
    })

    // Decrypt private key and send transaction
    const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ADMIN_USER_ID
    
    let txHash: string
    try {
      const privateKeyWIF = await decryptPrivateKey(poolData.private_key_encrypted, encryptionKey)
      
      const result = await sendTatumTransaction(
        currency,
        poolData.address,
        destinationAddress,
        cryptoAmount,
        privateKeyWIF,
        tatumApiKey
      )
      txHash = result.txId
    } catch (txError) {
      console.error('❌ Transaction failed:', txError)
      
      // Refund user's balance
      await supabase
        .from('wallet_balances')
        .update({ [updateField]: userBalance })
        .eq('user_id', user.id)

      // Update withdrawal request as failed
      await supabase
        .from('withdrawal_requests')
        .update({ 
          status: 'failed', 
          error_message: (txError as Error).message 
        })
        .eq('id', withdrawalRequest.id)

      throw new Error(`Transaction failed: ${(txError as Error).message}`)
    }

    // Update withdrawal as completed
    await supabase
      .from('withdrawal_requests')
      .update({ 
        status: 'completed', 
        tx_hash: txHash,
        completed_at: new Date().toISOString()
      })
      .eq('id', withdrawalRequest.id)

    // Update transaction record
    await supabase
      .from('transactions')
      .update({ status: 'completed', tx_hash: txHash })
      .eq('user_id', user.id)
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    // Update pool balance in database
    const newPoolBalance = poolBalance - cryptoAmount
    await supabase
      .from('admin_fee_addresses')
      .update({ balance: newPoolBalance })
      .eq('currency', currency)
      .eq('admin_user_id', ADMIN_USER_ID)

    console.log(`🎉 Withdrawal completed! TxHash: ${txHash}`)

    return new Response(
      JSON.stringify({
        success: true,
        txHash,
        amountCrypto: cryptoAmount,
        amountEur: netAmountEur,
        feeEur: totalFee,
        currency,
        destinationAddress
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Withdrawal error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
