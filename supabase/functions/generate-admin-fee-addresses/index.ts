import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ADMkz user ID - main platform admin
const ADMIN_USER_ID = 'b7f1a65f-4d3a-43a3-a3ac-6ca95aa5c959'

// Encryption utilities using AES-GCM
async function encryptPrivateKey(privateKey: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(privateKey)
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the caller is the admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader?.replace('Bearer ', '')
    const { data } = await supabase.auth.getUser(token)
    const user = data.user

    if (!user || user.id !== ADMIN_USER_ID) {
      throw new Error('Unauthorized - Only main admin can generate fee addresses')
    }

    console.log('Generating admin fee addresses for:', ADMIN_USER_ID)

    // Check if admin already has fee addresses
    const { data: existingAddresses } = await supabase
      .from('admin_fee_addresses')
      .select('*')
      .eq('admin_user_id', ADMIN_USER_ID)

    const btcAddr = existingAddresses?.find(a => a.currency === 'BTC')
    const ltcAddr = existingAddresses?.find(a => a.currency === 'LTC')

    // If both addresses exist, return them
    if (btcAddr?.address && ltcAddr?.address) {
      console.log('Admin already has fee addresses')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Admin already has fee addresses',
          btcAddress: btcAddr.address,
          ltcAddress: ltcAddr.address,
          btcBalance: btcAddr.balance,
          ltcBalance: ltcAddr.balance
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const blockcypherToken = Deno.env.get('BLOCKCYPHER_TOKEN')
    if (!blockcypherToken) {
      throw new Error('BlockCypher token not configured')
    }

    let btcData = null
    let ltcData = null

    // Generate Bitcoin fee address if needed
    if (!btcAddr?.address) {
      console.log('Generating new Bitcoin fee address...')
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
      console.log('Generated Bitcoin fee address:', btcData.address)
    }

    // Generate Litecoin fee address if needed
    if (!ltcAddr?.address) {
      console.log('Generating new Litecoin fee address...')
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
      console.log('Generated Litecoin fee address:', ltcData.address)
    }

    const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ADMIN_USER_ID

    // Store Bitcoin fee address
    if (btcData) {
      const encryptedBtcKey = await encryptPrivateKey(btcData.private, encryptionKey)
      
      const { error: btcError } = await supabase
        .from('admin_fee_addresses')
        .upsert({
          admin_user_id: ADMIN_USER_ID,
          currency: 'BTC',
          address: btcData.address,
          private_key_encrypted: encryptedBtcKey,
          balance: 0
        }, {
          onConflict: 'admin_user_id,currency'
        })

      if (btcError) {
        console.error('Error storing Bitcoin fee address:', btcError)
        throw btcError
      }
    }

    // Store Litecoin fee address
    if (ltcData) {
      const encryptedLtcKey = await encryptPrivateKey(ltcData.private, encryptionKey)
      
      const { error: ltcError } = await supabase
        .from('admin_fee_addresses')
        .upsert({
          admin_user_id: ADMIN_USER_ID,
          currency: 'LTC',
          address: ltcData.address,
          private_key_encrypted: encryptedLtcKey,
          balance: 0
        }, {
          onConflict: 'admin_user_id,currency'
        })

      if (ltcError) {
        console.error('Error storing Litecoin fee address:', ltcError)
        throw ltcError
      }
    }

    const finalBtcAddress = btcData?.address || btcAddr?.address
    const finalLtcAddress = ltcData?.address || ltcAddr?.address

    console.log('Successfully generated/retrieved admin fee addresses:', { 
      btc: finalBtcAddress, 
      ltc: finalLtcAddress 
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        btcAddress: finalBtcAddress,
        ltcAddress: finalLtcAddress,
        btcBalance: btcAddr?.balance || 0,
        ltcBalance: ltcAddr?.balance || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-admin-fee-addresses:', error)
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})