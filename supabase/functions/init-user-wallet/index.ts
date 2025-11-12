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
          updated_at: string
        }
        Insert: {
          user_id: string
          currency: string
          address: string
          private_key_encrypted?: string | null
          is_active?: boolean
        }
      }
      wallet_balances: {
        Row: {
          id: string
          user_id: string
          balance_eur: number
          balance_btc: number
          balance_ltc: number
          balance_btc_deposited: number
          balance_ltc_deposited: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          balance_eur?: number
          balance_btc?: number
          balance_ltc?: number
          balance_btc_deposited?: number
          balance_ltc_deposited?: number
        }
      }
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data } = await supabaseClient.auth.getUser(token)
    const user = data.user

    if (!user) {
      throw new Error('Unauthorized')
    }

    console.log('Initializing wallet for user:', user.id)

    // Check if user already has addresses
    const { data: existingAddresses } = await supabaseClient
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (existingAddresses && existingAddresses.length >= 2) {
      console.log('User already has wallet initialized')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Wallet already initialized',
          addresses: existingAddresses 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const blockcypherToken = Deno.env.get('BLOCKCYPHER_TOKEN')
    if (!blockcypherToken) {
      throw new Error('BlockCypher token not configured')
    }

    const results: any[] = []

    // Generate Bitcoin address if not exists
    const btcExists = existingAddresses?.some(a => a.currency === 'BTC')
    if (!btcExists) {
      console.log('Generating Bitcoin address...')
      const btcResponse = await fetch(
        `https://api.blockcypher.com/v1/btc/main/addrs?token=${blockcypherToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      )

      if (!btcResponse.ok) {
        throw new Error(`BlockCypher Bitcoin API error: ${btcResponse.statusText}`)
      }

      const btcData = await btcResponse.json()
      console.log('Generated Bitcoin address:', btcData.address)

      const { error: btcError } = await supabaseClient
        .from('user_addresses')
        .upsert({
          user_id: user.id,
          currency: 'BTC',
          address: btcData.address,
          private_key_encrypted: btcData.private,
          is_active: true
        }, {
          onConflict: 'user_id,currency'
        })

      if (btcError) {
        console.error('Error storing Bitcoin address:', btcError)
        throw btcError
      }

      results.push({ currency: 'BTC', address: btcData.address })
    }

    // Generate Litecoin address if not exists
    const ltcExists = existingAddresses?.some(a => a.currency === 'LTC')
    if (!ltcExists) {
      console.log('Generating Litecoin address...')
      const ltcResponse = await fetch(
        `https://api.blockcypher.com/v1/ltc/main/addrs?token=${blockcypherToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      )

      if (!ltcResponse.ok) {
        throw new Error(`BlockCypher Litecoin API error: ${ltcResponse.statusText}`)
      }

      const ltcData = await ltcResponse.json()
      console.log('Generated Litecoin address:', ltcData.address)

      const { error: ltcError } = await supabaseClient
        .from('user_addresses')
        .upsert({
          user_id: user.id,
          currency: 'LTC',
          address: ltcData.address,
          private_key_encrypted: ltcData.private,
          is_active: true
        }, {
          onConflict: 'user_id,currency'
        })

      if (ltcError) {
        console.error('Error storing Litecoin address:', ltcError)
        throw ltcError
      }

      results.push({ currency: 'LTC', address: ltcData.address })
    }

    // Ensure wallet balance exists
    const { error: balanceError } = await supabaseClient
      .from('wallet_balances')
      .upsert({
        user_id: user.id,
        balance_eur: 0,
        balance_btc: 0,
        balance_ltc: 0,
        balance_btc_deposited: 0,
        balance_ltc_deposited: 0
      }, {
        onConflict: 'user_id'
      })

    if (balanceError) {
      console.error('Error creating wallet balance:', balanceError)
    }

    console.log('Wallet initialization complete for user:', user.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        addresses: results.length > 0 ? results : existingAddresses
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in init-user-wallet:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})