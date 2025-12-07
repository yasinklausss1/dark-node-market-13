import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Decrypt private key (AES-GCM)
async function decryptPrivateKey(encryptedKey: string, userKey: string): Promise<string> {
  const decoder = new TextDecoder()
  const key = new TextEncoder().encode(userKey.slice(0, 32).padEnd(32, '0'))
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  
  const data = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0))
  const iv = data.slice(0, 12)
  const encrypted = data.slice(12)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  )
  
  return decoder.decode(decrypted)
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

// Send Bitcoin transaction via BlockCypher
async function sendBitcoinTransaction(
  privateKey: string, 
  fromAddress: string, 
  toAddress: string, 
  amountSatoshi: number
): Promise<string> {
  const blockcypherToken = Deno.env.get('BLOCKCYPHER_TOKEN')
  if (!blockcypherToken) {
    throw new Error('BlockCypher Token nicht konfiguriert')
  }

  console.log(`Preparing BTC transaction: ${amountSatoshi} satoshi from ${fromAddress} to ${toAddress}`)

  // Step 1: Create new transaction skeleton
  const txResponse = await fetch(
    `https://api.blockcypher.com/v1/btc/main/txs/new?token=${blockcypherToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: [{ addresses: [fromAddress] }],
        outputs: [{ addresses: [toAddress], value: amountSatoshi }]
      })
    }
  )

  if (!txResponse.ok) {
    const errorText = await txResponse.text()
    console.error('BTC tx creation error:', errorText)
    throw new Error(`BTC Transaktion erstellen fehlgeschlagen: ${errorText}`)
  }

  const txData = await txResponse.json()
  
  if (txData.errors && txData.errors.length > 0) {
    console.error('BTC tx errors:', txData.errors)
    throw new Error(`BTC Fehler: ${txData.errors.join(', ')}`)
  }

  console.log('Created BTC transaction skeleton, hash:', txData.tx?.hash)

  // Step 2: Sign and send the transaction
  const signedResponse = await fetch(
    `https://api.blockcypher.com/v1/btc/main/txs/send?token=${blockcypherToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx: txData,
        private_keys: [privateKey]
      })
    }
  )

  if (!signedResponse.ok) {
    const errorText = await signedResponse.text()
    console.error('BTC send error:', errorText)
    throw new Error(`BTC Transaktion senden fehlgeschlagen: ${errorText}`)
  }

  const signedData = await signedResponse.json()
  
  if (signedData.errors && signedData.errors.length > 0) {
    console.error('BTC send errors:', signedData.errors)
    throw new Error(`BTC Senden Fehler: ${signedData.errors.join(', ')}`)
  }

  const txHash = signedData.tx?.hash
  console.log('BTC transaction sent successfully, tx hash:', txHash)
  
  return txHash
}

// Send Litecoin transaction via BlockCypher
async function sendLitecoinTransaction(
  privateKey: string,
  fromAddress: string,
  toAddress: string,
  amountLitoshi: number
): Promise<string> {
  const blockcypherToken = Deno.env.get('BLOCKCYPHER_TOKEN')
  if (!blockcypherToken) {
    throw new Error('BlockCypher Token nicht konfiguriert')
  }

  console.log(`Preparing LTC transaction: ${amountLitoshi} litoshi from ${fromAddress} to ${toAddress}`)

  // Step 1: Create new transaction skeleton
  const txResponse = await fetch(
    `https://api.blockcypher.com/v1/ltc/main/txs/new?token=${blockcypherToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: [{ addresses: [fromAddress] }],
        outputs: [{ addresses: [toAddress], value: amountLitoshi }]
      })
    }
  )

  if (!txResponse.ok) {
    const errorText = await txResponse.text()
    console.error('LTC tx creation error:', errorText)
    throw new Error(`LTC Transaktion erstellen fehlgeschlagen: ${errorText}`)
  }

  const txData = await txResponse.json()
  
  if (txData.errors && txData.errors.length > 0) {
    console.error('LTC tx errors:', txData.errors)
    throw new Error(`LTC Fehler: ${txData.errors.join(', ')}`)
  }

  console.log('Created LTC transaction skeleton, hash:', txData.tx?.hash)

  // Step 2: Sign and send the transaction
  const signedResponse = await fetch(
    `https://api.blockcypher.com/v1/ltc/main/txs/send?token=${blockcypherToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx: txData,
        private_keys: [privateKey]
      })
    }
  )

  if (!signedResponse.ok) {
    const errorText = await signedResponse.text()
    console.error('LTC send error:', errorText)
    throw new Error(`LTC Transaktion senden fehlgeschlagen: ${errorText}`)
  }

  const signedData = await signedResponse.json()
  
  if (signedData.errors && signedData.errors.length > 0) {
    console.error('LTC send errors:', signedData.errors)
    throw new Error(`LTC Senden Fehler: ${signedData.errors.join(', ')}`)
  }

  const txHash = signedData.tx?.hash
  console.log('LTC transaction sent successfully, tx hash:', txHash)
  
  return txHash
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

    console.log(`Processing withdrawal request: ${amount} EUR in ${currency} to ${destinationAddress} for user ${user.id}`)

    // Validate currency
    if (!['BTC', 'LTC'].includes(currency)) {
      return new Response(
        JSON.stringify({ error: 'Ungültige Währung. Nur BTC und LTC unterstützt.' }),
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

    // Calculate fees
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
    const totalCryptoNeeded = amountEur / currentPrice

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

    // Get user's wallet address and encrypted private key
    const { data: addressData, error: addressError } = await adminClient
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('currency', currency)
      .eq('is_active', true)
      .single()

    if (addressError || !addressData || !addressData.private_key_encrypted) {
      console.error('Address error:', addressError)
      return new Response(
        JSON.stringify({ error: `Keine aktive ${currency}-Wallet gefunden. Bitte zuerst Wallet generieren.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create withdrawal request with status 'processing'
    const { data: withdrawalRequest, error: insertError } = await adminClient
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        currency,
        amount_crypto: cryptoAmount,
        amount_eur: amountEur,
        destination_address: destinationAddress,
        status: 'processing',
        fee_eur: totalFeeEur,
      })
      .select()
      .single()

    if (insertError || !withdrawalRequest) {
      console.error('Insert error:', insertError)
      throw new Error('Auszahlungsanfrage konnte nicht erstellt werden')
    }

    console.log(`Created withdrawal request ${withdrawalRequest.id}, now processing blockchain transaction...`)

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

    // Create pending transaction record
    const { data: txRecord } = await adminClient.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount_eur: -amountEur,
      amount_btc: currency === 'BTC' ? -totalCryptoNeeded : 0,
      status: 'pending',
      description: `${currency} Auszahlung an ${destinationAddress.slice(0, 10)}...`,
      transaction_direction: 'outgoing',
    }).select().single()

    // Now attempt to send the actual blockchain transaction
    try {
      // Decrypt private key
      const privateKey = await decryptPrivateKey(addressData.private_key_encrypted, user.id)
      
      let txHash: string
      
      if (currency === 'BTC') {
        // Convert to satoshi (1 BTC = 100,000,000 satoshi)
        const satoshiAmount = Math.floor(cryptoAmount * 100000000)
        txHash = await sendBitcoinTransaction(
          privateKey,
          addressData.address,
          destinationAddress,
          satoshiAmount
        )
      } else {
        // Convert to litoshi (1 LTC = 100,000,000 litoshi)
        const litoshiAmount = Math.floor(cryptoAmount * 100000000)
        txHash = await sendLitecoinTransaction(
          privateKey,
          addressData.address,
          destinationAddress,
          litoshiAmount
        )
      }

      // Update withdrawal as completed
      await adminClient
        .from('withdrawal_requests')
        .update({ 
          status: 'completed',
          tx_hash: txHash,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawalRequest.id)

      // Update transaction record
      if (txRecord) {
        await adminClient
          .from('transactions')
          .update({ 
            status: 'confirmed',
            btc_tx_hash: txHash,
            confirmed_at: new Date().toISOString()
          })
          .eq('id', txRecord.id)
      }

      console.log(`Withdrawal ${withdrawalRequest.id} completed successfully. TX: ${txHash}`)

      return new Response(
        JSON.stringify({
          success: true,
          withdrawal_id: withdrawalRequest.id,
          tx_hash: txHash,
          message: 'Auszahlung erfolgreich gesendet!',
          fee_eur: totalFeeEur,
          net_amount_eur: netAmountEur,
          crypto_amount: cryptoAmount,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (txError) {
      console.error('Blockchain transaction failed:', txError)
      
      // Mark withdrawal as failed
      await adminClient
        .from('withdrawal_requests')
        .update({ 
          status: 'failed',
          notes: txError.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawalRequest.id)

      // Refund the balance
      await adminClient
        .from('wallet_balances')
        .update({
          [balanceField]: userBalance, // Restore original balance
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      // Update transaction as failed
      if (txRecord) {
        await adminClient
          .from('transactions')
          .update({ 
            status: 'failed',
            description: `${currency} Auszahlung fehlgeschlagen: ${txError.message}`
          })
          .eq('id', txRecord.id)
      }

      return new Response(
        JSON.stringify({ 
          error: `Blockchain-Transaktion fehlgeschlagen: ${txError.message}`,
          details: 'Dein Guthaben wurde zurückerstattet.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in withdrawal processing:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Auszahlung fehlgeschlagen' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})