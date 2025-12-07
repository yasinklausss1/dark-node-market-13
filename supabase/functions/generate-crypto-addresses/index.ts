import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
        Insert: {
          id?: string
          user_id: string
          currency: string
          address: string
          private_key_encrypted?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          currency?: string
          address?: string
          private_key_encrypted?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      wallet_balances: {
        Row: {
          id: string
          user_id: string
          balance_eur: number
          balance_btc: number
          balance_ltc: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance_eur?: number
          balance_btc?: number
          balance_ltc?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance_eur?: number
          balance_btc?: number
          balance_ltc?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Encryption utilities
async function encryptPrivateKey(privateKey: string, userKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(privateKey)
  const keyData = encoder.encode(userKey.slice(0, 32).padEnd(32, '0'))
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )
  
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  )
  
  const result = new Uint8Array(iv.length + encrypted.byteLength)
  result.set(iv)
  result.set(new Uint8Array(encrypted), iv.length)
  
  return btoa(String.fromCharCode(...result))
}

// Generate Bitcoin address using Crypto APIs
async function generateBitcoinAddress(): Promise<{ address: string; privateKey: string }> {
  const apiKey = Deno.env.get('CRYPTO_APIS_KEY')
  if (!apiKey) {
    throw new Error('Crypto APIs key not found')
  }

  const response = await fetch('https://rest.cryptoapis.io/v2/generate-address', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      context: 'generate new bitcoin address',
      data: {
        item: {
          walletName: 'btc-wallet-' + crypto.randomUUID(),
          network: 'bitcoin',
          addressFormat: 'P2PKH'
        }
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Crypto APIs error: ${response.status}`)
  }

  const data = await response.json()
  return {
    address: data.data.item.address,
    privateKey: data.data.item.privateKey
  }
}

// Generate Litecoin address using Crypto APIs
async function generateLitecoinAddress(): Promise<{ address: string; privateKey: string }> {
  const apiKey = Deno.env.get('CRYPTO_APIS_KEY')
  if (!apiKey) {
    throw new Error('Crypto APIs key not found')
  }

  const response = await fetch('https://rest.cryptoapis.io/v2/generate-address', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      context: 'generate new litecoin address',
      data: {
        item: {
          walletName: 'ltc-wallet-' + crypto.randomUUID(),
          network: 'litecoin',
          addressFormat: 'P2PKH'
        }
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Crypto APIs error: ${response.status}`)
  }

  const data = await response.json()
  return {
    address: data.data.item.address,
    privateKey: data.data.item.privateKey
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

    // Check if user already has addresses
    const { data: existingAddresses } = await supabaseClient
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (existingAddresses && existingAddresses.length >= 2) {
      return new Response(
        JSON.stringify({
          btcAddress: existingAddresses.find(a => a.currency === 'BTC')?.address,
          ltcAddress: existingAddresses.find(a => a.currency === 'LTC')?.address,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Generating new crypto addresses for user:', user.id)

    // Generate Bitcoin address
    const btcResult = await generateBitcoinAddress()
    const encryptedBtcKey = await encryptPrivateKey(btcResult.privateKey, user.id)

    // Generate Litecoin address
    const ltcResult = await generateLitecoinAddress()
    const encryptedLtcKey = await encryptPrivateKey(ltcResult.privateKey, user.id)

    // Store addresses in database
    const { error: insertError } = await supabaseClient
      .from('user_addresses')
      .upsert([
        {
          user_id: user.id,
          currency: 'BTC',
          address: btcResult.address,
          private_key_encrypted: encryptedBtcKey,
          is_active: true,
        },
        {
          user_id: user.id,
          currency: 'LTC',
          address: ltcResult.address,
          private_key_encrypted: encryptedLtcKey,
          is_active: true,
        },
      ])

    if (insertError) {
      console.error('Database error:', insertError)
      throw new Error('Failed to save addresses')
    }

    // Ensure wallet balance entry exists
    await supabaseClient
      .from('wallet_balances')
      .upsert({
        user_id: user.id,
        balance_eur: 0,
        balance_btc: 0,
        balance_ltc: 0,
      })

    console.log('Successfully generated addresses:', { btc: btcResult.address, ltc: ltcResult.address })

    return new Response(
      JSON.stringify({
        btcAddress: btcResult.address,
        ltcAddress: ltcResult.address,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating addresses:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})