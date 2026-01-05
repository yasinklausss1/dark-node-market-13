import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ADMkz user ID - main platform admin
const ADMIN_USER_ID = '0af916bb-1c03-4173-a898-fd4274ae4a2b'

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
      throw new Error('Unauthorized - Only main admin can generate pool addresses')
    }

    const body = await req.json().catch(() => ({}))
    const forceRegenerate = body.forceRegenerate === true

    console.log('🚀 Generating Tatum pool addresses for:', ADMIN_USER_ID, 'force:', forceRegenerate)

    const tatumApiKey = Deno.env.get('TATUM_API_KEY')
    if (!tatumApiKey) {
      throw new Error('Tatum API key not configured')
    }

    // Check if admin already has pool addresses
    const { data: existingAddresses } = await supabase
      .from('admin_fee_addresses')
      .select('*')
      .eq('admin_user_id', ADMIN_USER_ID)

    const btcAddr = existingAddresses?.find(a => a.currency === 'BTC')
    const ltcAddr = existingAddresses?.find(a => a.currency === 'LTC')

    // If both addresses exist AND we're not forcing regeneration, return them
    if (btcAddr?.address && ltcAddr?.address && !forceRegenerate) {
      console.log('✅ Admin already has pool addresses')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Admin already has pool addresses',
          btcAddress: btcAddr.address,
          ltcAddress: ltcAddr.address,
          btcBalance: btcAddr.balance,
          ltcBalance: ltcAddr.balance
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // If forcing regeneration, delete old addresses first
    if (forceRegenerate) {
      console.log('🔄 Force regenerating - deleting old addresses...')
      await supabase
        .from('admin_fee_addresses')
        .delete()
        .eq('admin_user_id', ADMIN_USER_ID)
    }

    let btcData = null
    let ltcData = null

    // Generate Bitcoin pool address using Tatum
    if (!btcAddr?.address || forceRegenerate) {
      console.log('📦 Generating new Bitcoin pool address via Tatum...')
      
      // Generate BTC wallet
      const btcWalletResponse = await fetch('https://api.tatum.io/v3/bitcoin/wallet', {
        method: 'GET',
        headers: {
          'x-api-key': tatumApiKey,
        }
      })

      if (!btcWalletResponse.ok) {
        const errorText = await btcWalletResponse.text()
        console.error('Tatum BTC wallet error:', btcWalletResponse.status, errorText)
        throw new Error(`Tatum Bitcoin wallet error: ${btcWalletResponse.statusText}`)
      }

      const btcWallet = await btcWalletResponse.json()
      console.log('BTC Wallet generated, xpub:', btcWallet.xpub?.substring(0, 20) + '...')

      // Generate address from xpub (index 0)
      const btcAddressResponse = await fetch(`https://api.tatum.io/v3/bitcoin/address/${btcWallet.xpub}/0`, {
        method: 'GET',
        headers: {
          'x-api-key': tatumApiKey,
        }
      })

      if (!btcAddressResponse.ok) {
        const errorText = await btcAddressResponse.text()
        console.error('Tatum BTC address error:', btcAddressResponse.status, errorText)
        throw new Error(`Tatum Bitcoin address error: ${btcAddressResponse.statusText}`)
      }

      const btcAddress = await btcAddressResponse.json()

      // Generate private key for index 0
      const btcPrivKeyResponse = await fetch('https://api.tatum.io/v3/bitcoin/wallet/priv', {
        method: 'POST',
        headers: {
          'x-api-key': tatumApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          index: 0,
          mnemonic: btcWallet.mnemonic
        })
      })

      if (!btcPrivKeyResponse.ok) {
        const errorText = await btcPrivKeyResponse.text()
        console.error('Tatum BTC privkey error:', btcPrivKeyResponse.status, errorText)
        throw new Error(`Tatum Bitcoin private key error: ${btcPrivKeyResponse.statusText}`)
      }

      const btcPrivKey = await btcPrivKeyResponse.json()

      btcData = {
        address: btcAddress.address,
        privateKey: btcPrivKey.key,
        mnemonic: btcWallet.mnemonic,
        xpub: btcWallet.xpub
      }
      console.log('✅ Generated Bitcoin pool address:', btcData.address)
    }

    // Generate Litecoin pool address using Tatum
    if (!ltcAddr?.address || forceRegenerate) {
      console.log('📦 Generating new Litecoin pool address via Tatum...')
      
      // Generate LTC wallet
      const ltcWalletResponse = await fetch('https://api.tatum.io/v3/litecoin/wallet', {
        method: 'GET',
        headers: {
          'x-api-key': tatumApiKey,
        }
      })

      if (!ltcWalletResponse.ok) {
        const errorText = await ltcWalletResponse.text()
        console.error('Tatum LTC wallet error:', ltcWalletResponse.status, errorText)
        throw new Error(`Tatum Litecoin wallet error: ${ltcWalletResponse.statusText}`)
      }

      const ltcWallet = await ltcWalletResponse.json()
      console.log('LTC Wallet generated, xpub:', ltcWallet.xpub?.substring(0, 20) + '...')

      // Generate address from xpub (index 0)
      const ltcAddressResponse = await fetch(`https://api.tatum.io/v3/litecoin/address/${ltcWallet.xpub}/0`, {
        method: 'GET',
        headers: {
          'x-api-key': tatumApiKey,
        }
      })

      if (!ltcAddressResponse.ok) {
        const errorText = await ltcAddressResponse.text()
        console.error('Tatum LTC address error:', ltcAddressResponse.status, errorText)
        throw new Error(`Tatum Litecoin address error: ${ltcAddressResponse.statusText}`)
      }

      const ltcAddress = await ltcAddressResponse.json()

      // Generate private key for index 0
      const ltcPrivKeyResponse = await fetch('https://api.tatum.io/v3/litecoin/wallet/priv', {
        method: 'POST',
        headers: {
          'x-api-key': tatumApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          index: 0,
          mnemonic: ltcWallet.mnemonic
        })
      })

      if (!ltcPrivKeyResponse.ok) {
        const errorText = await ltcPrivKeyResponse.text()
        console.error('Tatum LTC privkey error:', ltcPrivKeyResponse.status, errorText)
        throw new Error(`Tatum Litecoin private key error: ${ltcPrivKeyResponse.statusText}`)
      }

      const ltcPrivKey = await ltcPrivKeyResponse.json()

      ltcData = {
        address: ltcAddress.address,
        privateKey: ltcPrivKey.key,
        mnemonic: ltcWallet.mnemonic,
        xpub: ltcWallet.xpub
      }
      console.log('✅ Generated Litecoin pool address:', ltcData.address)
    }

    const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ADMIN_USER_ID

    // Store Bitcoin pool address
    if (btcData) {
      // Store private key (WIF format from Tatum)
      const encryptedBtcKey = await encryptPrivateKey(btcData.privateKey, encryptionKey)
      
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
        console.error('Error storing Bitcoin pool address:', btcError)
        throw btcError
      }
      console.log('💾 Stored BTC pool address in database')
    }

    // Store Litecoin pool address
    if (ltcData) {
      const encryptedLtcKey = await encryptPrivateKey(ltcData.privateKey, encryptionKey)
      
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
        console.error('Error storing Litecoin pool address:', ltcError)
        throw ltcError
      }
      console.log('💾 Stored LTC pool address in database')
    }

    const finalBtcAddress = btcData?.address || btcAddr?.address
    const finalLtcAddress = ltcData?.address || ltcAddr?.address

    console.log('🎉 Successfully generated Tatum pool addresses:', { 
      btc: finalBtcAddress, 
      ltc: finalLtcAddress 
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        btcAddress: finalBtcAddress,
        ltcAddress: finalLtcAddress,
        btcBalance: 0,
        ltcBalance: 0,
        provider: 'tatum'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in generate-tatum-pool-addresses:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
