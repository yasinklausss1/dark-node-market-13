import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      user_addresses: {
        Row: {
          id: string
          user_id: string
          currency: string
          address: string
          private_key_encrypted: string | null
          is_active: boolean
          created_at: string
        }
      }
      deposit_requests: {
        Row: {
          id: string
          user_id: string
          currency: string
          amount_crypto: number
          amount_eur: number
          address: string
          status: string
          transaction_hash: string | null
          confirmations: number | null
          expire_at: string
          created_at: string
          updated_at: string
        }
        Update: {
          status?: string
          transaction_hash?: string | null
          confirmations?: number | null
          updated_at?: string
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
          confirmations?: number | null
          sender_address?: string | null
          receiver_address?: string | null
        }
      }
      wallet_balances: {
        Update: {
          balance_eur?: number
          balance_btc?: number
          balance_ltc?: number
          updated_at?: string
        }
      }
    }
  }
}

// Fetch Bitcoin transactions using Crypto APIs
async function fetchBitcoinTransactions(address: string): Promise<any[]> {
  const apiKey = Deno.env.get('CRYPTO_APIS_KEY')
  if (!apiKey) {
    throw new Error('Crypto APIs key not found')
  }

  const response = await fetch(
    `https://rest.cryptoapis.io/v2/blockchain-data/bitcoin/mainnet/addresses/${address}/transactions?limit=10`,
    {
      headers: {
        'X-API-Key': apiKey,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Crypto APIs error: ${response.status}`)
  }

  const data = await response.json()
  return data.data.items || []
}

// Fetch Litecoin transactions using Crypto APIs
async function fetchLitecoinTransactions(address: string): Promise<any[]> {
  const apiKey = Deno.env.get('CRYPTO_APIS_KEY')
  if (!apiKey) {
    throw new Error('Crypto APIs key not found')
  }

  const response = await fetch(
    `https://rest.cryptoapis.io/v2/blockchain-data/litecoin/mainnet/addresses/${address}/transactions?limit=10`,
    {
      headers: {
        'X-API-Key': apiKey,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Crypto APIs error: ${response.status}`)
  }

  const data = await response.json()
  return data.data.items || []
}

// Get current crypto prices from CoinGecko
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting crypto deposit check...')

    // Get current crypto prices
    const prices = await getCryptoPrices()
    console.log('Current prices:', prices)

    // Get all active user addresses
    const { data: addresses, error: addressError } = await supabaseClient
      .from('user_addresses')
      .select('*')
      .eq('is_active', true)

    if (addressError) {
      throw new Error(`Error fetching addresses: ${addressError.message}`)
    }

    if (!addresses || addresses.length === 0) {
      console.log('No active addresses found')
      return new Response(
        JSON.stringify({ message: 'No active addresses found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Checking ${addresses.length} addresses for deposits`)

    let totalProcessed = 0
    let totalNewDeposits = 0

    for (const address of addresses) {
      try {
        console.log(`Checking ${address.currency} address: ${address.address}`)

        let transactions: any[] = []
        if (address.currency === 'BTC') {
          transactions = await fetchBitcoinTransactions(address.address)
        } else if (address.currency === 'LTC') {
          transactions = await fetchLitecoinTransactions(address.address)
        }

        console.log(`Found ${transactions.length} transactions for ${address.address}`)

        for (const tx of transactions) {
          // Check if we already processed this transaction
          const { data: existingTx } = await supabaseClient
            .from('transactions')
            .select('id')
            .eq('transaction_hash', tx.transactionId)
            .single()

          if (existingTx) {
            console.log(`Transaction ${tx.transactionId} already processed`)
            continue
          }

          // Calculate received amount for this address
          let receivedAmount = 0
          if (tx.recipients) {
            for (const recipient of tx.recipients) {
              if (recipient.address === address.address) {
                receivedAmount += parseFloat(recipient.amount)
              }
            }
          }

          if (receivedAmount <= 0) {
            console.log(`No funds received in transaction ${tx.transactionId}`)
            continue
          }

          console.log(`Processing deposit: ${receivedAmount} ${address.currency} to ${address.address}`)

          const currentPrice = address.currency === 'BTC' ? prices.btc : prices.ltc
          const amountEur = receivedAmount * currentPrice
          const confirmations = tx.blockHeight ? (tx.blockHeight > 0 ? 6 : 0) : 0

          // Find matching deposit request
          const { data: depositRequest } = await supabaseClient
            .from('deposit_requests')
            .select('*')
            .eq('user_id', address.user_id)
            .eq('address', address.address)
            .eq('status', 'pending')
            .gte('expire_at', new Date().toISOString())
            .single()

          if (depositRequest) {
            // Update deposit request
            await supabaseClient
              .from('deposit_requests')
              .update({
                status: confirmations >= 1 ? 'confirmed' : 'received',
                transaction_hash: tx.transactionId,
                confirmations: confirmations,
                updated_at: new Date().toISOString(),
              })
              .eq('id', depositRequest.id)

            console.log(`Updated deposit request ${depositRequest.id}`)
          }

          // Insert transaction record
          await supabaseClient
            .from('transactions')
            .insert({
              user_id: address.user_id,
              type: 'deposit',
              amount_eur: amountEur,
              amount_btc: address.currency === 'BTC' ? receivedAmount : null,
              amount_ltc: address.currency === 'LTC' ? receivedAmount : null,
              status: confirmations >= 1 ? 'confirmed' : 'pending',
              description: `${address.currency} deposit`,
              transaction_hash: tx.transactionId,
              confirmations: confirmations,
              sender_address: tx.senders?.[0]?.address || null,
              receiver_address: address.address,
            })

          // Update wallet balance if confirmed
          if (confirmations >= 1) {
            const balanceField = address.currency === 'BTC' ? 'balance_btc' : 'balance_ltc'
            
            await supabaseClient.rpc('sql', {
              query: `
                UPDATE wallet_balances 
                SET 
                  balance_eur = balance_eur + ${amountEur},
                  ${balanceField} = ${balanceField} + ${receivedAmount},
                  updated_at = NOW()
                WHERE user_id = '${address.user_id}'
              `
            })

            console.log(`Updated wallet balance for user ${address.user_id}`)
          }

          totalNewDeposits++
        }

        totalProcessed++
      } catch (error) {
        console.error(`Error processing address ${address.address}:`, error)
      }
    }

    console.log(`Deposit check completed. Processed ${totalProcessed} addresses, found ${totalNewDeposits} new deposits`)

    return new Response(
      JSON.stringify({
        message: 'Deposit check completed',
        addressesProcessed: totalProcessed,
        newDeposits: totalNewDeposits,
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