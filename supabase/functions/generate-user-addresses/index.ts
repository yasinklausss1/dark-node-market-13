import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Encryption utilities using AES-GCM
async function encryptPrivateKey(privateKey: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(privateKey)
  // Use first 32 bytes of encryption key (padded if needed)
  const keyData = encoder.encode(encryptionKey.slice(0, 32).padEnd(32, '0'))
  
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data } = await supabaseClient.auth.getUser(token)
    const user = data.user

    if (!user) {
      console.error('No user found from token')
      throw new Error('Unauthorized')
    }

    console.log('Generating real addresses for user:', user.id)

    // Check if user already has real (non-pending) addresses
    const { data: existingAddresses } = await supabaseClient
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const btcAddr = existingAddresses?.find(a => a.currency === 'BTC')
    const ltcAddr = existingAddresses?.find(a => a.currency === 'LTC')

    // If both addresses exist and are not 'pending', return them
    if (btcAddr?.address && btcAddr.address !== 'pending' && 
        ltcAddr?.address && ltcAddr.address !== 'pending') {
      console.log('User already has real addresses')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User already has addresses',
          btcAddress: btcAddr.address,
          ltcAddress: ltcAddr.address
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate Bitcoin address using BlockCypher API
    const blockcypherToken = Deno.env.get('BLOCKCYPHER_TOKEN')
    if (!blockcypherToken) {
      console.error('BlockCypher token not configured')
      throw new Error('BlockCypher token not configured')
    }

    let btcData = null
    let ltcData = null

    // Generate Bitcoin address if needed
    if (!btcAddr?.address || btcAddr.address === 'pending') {
      console.log('Generating new Bitcoin address...')
      const btcResponse = await fetch(
        `https://api.blockcypher.com/v1/btc/main/addrs?token=${blockcypherToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      )

      if (!btcResponse.ok) {
        const errorText = await btcResponse.text()
        console.error('BlockCypher BTC API error:', btcResponse.status, errorText)
        throw new Error(`BlockCypher Bitcoin API error: ${btcResponse.statusText}`)
      }

      btcData = await btcResponse.json()
      console.log('Generated Bitcoin address:', btcData.address)
    }

    // Generate Litecoin address if needed
    if (!ltcAddr?.address || ltcAddr.address === 'pending') {
      console.log('Generating new Litecoin address...')
      const ltcResponse = await fetch(
        `https://api.blockcypher.com/v1/ltc/main/addrs?token=${blockcypherToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      )

      if (!ltcResponse.ok) {
        const errorText = await ltcResponse.text()
        console.error('BlockCypher LTC API error:', ltcResponse.status, errorText)
        throw new Error(`BlockCypher Litecoin API error: ${ltcResponse.statusText}`)
      }

      ltcData = await ltcResponse.json()
      console.log('Generated Litecoin address:', ltcData.address)
    }

    // Encryption key - use a combination of user id and service role key
    const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || user.id

    // Update or insert Bitcoin address
    if (btcData) {
      const encryptedBtcKey = await encryptPrivateKey(btcData.private, encryptionKey)
      
      const { error: btcError } = await supabaseClient
        .from('user_addresses')
        .upsert({
          user_id: user.id,
          currency: 'BTC',
          address: btcData.address,
          private_key_encrypted: encryptedBtcKey,
          is_active: true
        }, {
          onConflict: 'user_id,currency'
        })

      if (btcError) {
        console.error('Error storing Bitcoin address:', btcError)
        throw btcError
      }
    }

    // Update or insert Litecoin address
    if (ltcData) {
      const encryptedLtcKey = await encryptPrivateKey(ltcData.private, encryptionKey)
      
      const { error: ltcError } = await supabaseClient
        .from('user_addresses')
        .upsert({
          user_id: user.id,
          currency: 'LTC',
          address: ltcData.address,
          private_key_encrypted: encryptedLtcKey,
          is_active: true
        }, {
          onConflict: 'user_id,currency'
        })

      if (ltcError) {
        console.error('Error storing Litecoin address:', ltcError)
        throw ltcError
      }
    }

    const finalBtcAddress = btcData?.address || btcAddr?.address
    const finalLtcAddress = ltcData?.address || ltcAddr?.address

    console.log('Successfully generated/retrieved addresses:', { 
      btc: finalBtcAddress, 
      ltc: finalLtcAddress 
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        btcAddress: finalBtcAddress,
        ltcAddress: finalLtcAddress
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-user-addresses:', error)
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})