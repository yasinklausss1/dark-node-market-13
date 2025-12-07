import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      withdrawal_requests: {
        Row: {
          id: string
          user_id: string
          currency: string
          amount_crypto: number
          amount_eur: number
          destination_address: string
          status: string
          transaction_hash: string | null
          fee_crypto: number
          fee_eur: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          currency: string
          amount_crypto: number
          amount_eur: number
          destination_address: string
          status?: string
          transaction_hash?: string | null
          fee_crypto: number
          fee_eur: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: string
          transaction_hash?: string | null
          updated_at?: string
        }
      }
      wallet_balances: {
        Row: {
          user_id: string
          balance_eur: number
          balance_btc: number
          balance_ltc: number
        }
        Update: {
          balance_eur?: number
          balance_btc?: number
          balance_ltc?: number
          updated_at?: string
        }
      }
      user_addresses: {
        Row: {
          user_id: string
          currency: string
          address: string
          private_key_encrypted: string | null
          is_active: boolean
        }
      }
      transactions: {
        Insert: {
          user_id: string
          type: string
          amount_eur: number
          amount_btc?: number | null
          amount_ltc?: number | null
          status: string
          description?: string | null
          transaction_hash?: string | null
          sender_address?: string | null
          receiver_address?: string | null
        }
      }
      withdrawal_fees: {
        Row: {
          currency: string
          fee_percentage: number
          min_fee_eur: number
          max_fee_eur: number
          network_fee_crypto: number
        }
      }
    }
  }
}

// Decryption utility
async function decryptPrivateKey(encryptedKey: string, userKey: string): Promise<string> {
  const decoder = new TextDecoder()
  const keyData = new TextEncoder().encode(userKey.slice(0, 32).padEnd(32, '0'))
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  
  const encryptedData = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0))
  const iv = encryptedData.slice(0, 12)
  const encrypted = encryptedData.slice(12)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  )
  
  return decoder.decode(decrypted)
}

// Validate Bitcoin address format
function validateBitcoinAddress(address: string): boolean {
  // Basic Bitcoin address validation (P2PKH, P2SH, Bech32)
  const btcRegex = /^([13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})$/
  return btcRegex.test(address)
}

// Validate Litecoin address format
function validateLitecoinAddress(address: string): boolean {
  // Basic Litecoin address validation (P2PKH, P2SH, Bech32)
  const ltcRegex = /^([LM3][a-km-zA-HJ-NP-Z1-9]{26,33}|ltc1[a-z0-9]{39,59})$/
  return ltcRegex.test(address)
}

// Send Bitcoin transaction using Crypto APIs
async function sendBitcoinTransaction(
  fromAddress: string,
  toAddress: string,
  amount: number,
  privateKey: string
): Promise<string> {
  const apiKey = Deno.env.get('CRYPTO_APIS_KEY')
  if (!apiKey) {
    throw new Error('Crypto APIs key not found')
  }

  console.log(`Sending Bitcoin transaction: ${amount} BTC from ${fromAddress} to ${toAddress}`)

  const response = await fetch('https://rest.cryptoapis.io/v2/blockchain-data/bitcoin/mainnet/transactions/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      context: 'withdrawal transaction',
      data: {
        item: {
          fromAddress: fromAddress,
          toAddress: toAddress,
          amount: amount.toString(),
          privateKey: privateKey,
          fee: 'recommended'
        }
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Bitcoin transaction failed: ${error}`)
  }

  const data = await response.json()
  return data.data.item.transactionId
}

// Send Litecoin transaction using Crypto APIs
async function sendLitecoinTransaction(
  fromAddress: string,
  toAddress: string,
  amount: number,
  privateKey: string
): Promise<string> {
  const apiKey = Deno.env.get('CRYPTO_APIS_KEY')
  if (!apiKey) {
    throw new Error('Crypto APIs key not found')
  }

  console.log(`Sending Litecoin transaction: ${amount} LTC from ${fromAddress} to ${toAddress}`)

  const response = await fetch('https://rest.cryptoapis.io/v2/blockchain-data/litecoin/mainnet/transactions/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      context: 'withdrawal transaction',
      data: {
        item: {
          fromAddress: fromAddress,
          toAddress: toAddress,
          amount: amount.toString(),
          privateKey: privateKey,
          fee: 'recommended'
        }
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Litecoin transaction failed: ${error}`)
  }

  const data = await response.json()
  return data.data.item.transactionId
}

// Get current crypto prices
async function getCryptoPrices(): Promise<{ btc: number; ltc: number }> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin&vs_currencies=eur'
    )
    const data = await response.json()
    return {
      btc: data.bitcoin?.eur || 0,
      ltc: data.litecoin?.eur || 0,
    }
  } catch (error) {
    console.error('Error fetching prices:', error)
    return { btc: 0, ltc: 0 }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { currency, amount, destinationAddress } = await req.json()

    console.log(`Processing withdrawal request: ${amount} ${currency} to ${destinationAddress}`)

    // Validate currency
    if (!['BTC', 'LTC'].includes(currency)) {
      return new Response(
        JSON.stringify({ error: 'Invalid currency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate destination address
    const isValidAddress = currency === 'BTC' 
      ? validateBitcoinAddress(destinationAddress)
      : validateLitecoinAddress(destinationAddress)

    if (!isValidAddress) {
      return new Response(
        JSON.stringify({ error: 'Invalid destination address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get withdrawal fees
    const { data: feeData } = await supabaseClient
      .from('withdrawal_fees')
      .select('*')
      .eq('currency', currency)
      .single()

    if (!feeData) {
      return new Response(
        JSON.stringify({ error: 'Withdrawal fees not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current prices
    const prices = await getCryptoPrices()
    const currentPrice = currency === 'BTC' ? prices.btc : prices.ltc

    if (currentPrice <= 0) {
      return new Response(
        JSON.stringify({ error: 'Unable to fetch current price' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate fees
    const amountEur = amount * currentPrice
    const percentageFee = amountEur * (feeData.fee_percentage / 100)
    const totalFeeEur = Math.max(feeData.min_fee_eur, Math.min(percentageFee, feeData.max_fee_eur))
    const networkFeeCrypto = feeData.network_fee_crypto
    const totalFeeCrypto = (totalFeeEur / currentPrice) + networkFeeCrypto

    // Check user balance
    const { data: balance } = await supabaseClient
      .from('wallet_balances')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!balance) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userBalance = currency === 'BTC' ? balance.balance_btc : balance.balance_ltc
    const totalRequired = amount + totalFeeCrypto

    if (userBalance < totalRequired) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create withdrawal request
    const { data: withdrawalRequest, error: insertError } = await supabaseClient
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        currency,
        amount_crypto: amount,
        amount_eur: amountEur,
        destination_address: destinationAddress,
        status: 'pending',
        fee_crypto: totalFeeCrypto,
        fee_eur: totalFeeEur,
      })
      .select()
      .single()

    if (insertError || !withdrawalRequest) {
      throw new Error('Failed to create withdrawal request')
    }

    console.log(`Created withdrawal request ${withdrawalRequest.id}`)

    // Process withdrawal asynchronously
    setTimeout(async () => {
      try {
        // Update status to processing
        await supabaseClient
          .from('withdrawal_requests')
          .update({ 
            status: 'processing',
            updated_at: new Date().toISOString() 
          })
          .eq('id', withdrawalRequest.id)

        // Get user's crypto address and private key
        const { data: userAddress } = await supabaseClient
          .from('user_addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('currency', currency)
          .eq('is_active', true)
          .single()

        if (!userAddress || !userAddress.private_key_encrypted) {
          throw new Error('User crypto address not found')
        }

        // Decrypt private key
        const privateKey = await decryptPrivateKey(userAddress.private_key_encrypted, user.id)

        // Send transaction
        let txHash: string
        if (currency === 'BTC') {
          txHash = await sendBitcoinTransaction(
            userAddress.address,
            destinationAddress,
            amount,
            privateKey
          )
        } else {
          txHash = await sendLitecoinTransaction(
            userAddress.address,
            destinationAddress,
            amount,
            privateKey
          )
        }

        console.log(`Transaction sent successfully: ${txHash}`)

        // Update withdrawal request with success
        await supabaseClient
          .from('withdrawal_requests')
          .update({
            status: 'completed',
            transaction_hash: txHash,
            updated_at: new Date().toISOString(),
          })
          .eq('id', withdrawalRequest.id)

        // Update wallet balance
        const balanceField = currency === 'BTC' ? 'balance_btc' : 'balance_ltc'
        const newBalance = userBalance - totalRequired
        const newBalanceEur = balance.balance_eur - amountEur - totalFeeEur

        await supabaseClient
          .from('wallet_balances')
          .update({
            balance_eur: newBalanceEur,
            [balanceField]: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)

        // Insert transaction record
        await supabaseClient
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'withdrawal',
            amount_eur: amountEur,
            amount_btc: currency === 'BTC' ? amount : null,
            amount_ltc: currency === 'LTC' ? amount : null,
            status: 'completed',
            description: `${currency} withdrawal`,
            transaction_hash: txHash,
            sender_address: userAddress.address,
            receiver_address: destinationAddress,
          })

        console.log(`Withdrawal completed successfully for user ${user.id}`)

      } catch (error) {
        console.error('Error processing withdrawal:', error)

        // Update withdrawal request with failure
        await supabaseClient
          .from('withdrawal_requests')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', withdrawalRequest.id)
      }
    }, 1000)

    return new Response(
      JSON.stringify({
        success: true,
        withdrawalId: withdrawalRequest.id,
        message: 'Withdrawal request created and is being processed',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in withdrawal processing:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})