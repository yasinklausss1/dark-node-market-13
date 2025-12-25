import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_USER_ID = '0af916bb-1c03-4173-a898-fd4274ae4a2b'

// Decryption utility
async function decryptPrivateKey(encryptedKey: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(encryptionKey.slice(0, 32).padEnd(32, '0'))
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  
  const encrypted = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0))
  const iv = encrypted.slice(0, 12)
  const data = encrypted.slice(12)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  )
  
  return new TextDecoder().decode(decrypted)
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

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: userData } = await supabase.auth.getUser(token)
    
    if (!userData.user || userData.user.id !== ADMIN_USER_ID) {
      throw new Error('Unauthorized - Only main admin can withdraw fees')
    }

    const { currency, destinationAddress, amount } = await req.json()

    if (!currency || !destinationAddress || !amount) {
      throw new Error('Currency, destination address and amount are required')
    }

    const currencyUpper = currency.toUpperCase()
    if (!['BTC', 'LTC'].includes(currencyUpper)) {
      throw new Error('Invalid currency - must be BTC or LTC')
    }

    console.log(`Admin withdrawing ${amount} ${currencyUpper} to ${destinationAddress}`)

    // Get admin fee address
    const { data: feeAddress, error: feeError } = await supabase
      .from('admin_fee_addresses')
      .select('*')
      .eq('admin_user_id', ADMIN_USER_ID)
      .eq('currency', currencyUpper)
      .maybeSingle()

    if (feeError || !feeAddress) {
      throw new Error('Fee address not found')
    }

    if (Number(feeAddress.balance) < Number(amount)) {
      throw new Error(`Insufficient balance. Available: ${feeAddress.balance} ${currencyUpper}`)
    }

    // Get BlockCypher token
    const blockcypherToken = Deno.env.get('BLOCKCYPHER_TOKEN')
    if (!blockcypherToken) {
      throw new Error('BlockCypher token not configured')
    }

    // Decrypt private key
    const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ADMIN_USER_ID
    const privateKey = await decryptPrivateKey(feeAddress.private_key_encrypted, encryptionKey)

    // Create transaction using BlockCypher
    const network = currencyUpper === 'BTC' ? 'btc/main' : 'ltc/main'
    
    // Step 1: Create new transaction skeleton
    const satoshiAmount = Math.floor(Number(amount) * 100000000)
    
    const newTxResponse = await fetch(
      `https://api.blockcypher.com/v1/${network}/txs/new?token=${blockcypherToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: [{ addresses: [feeAddress.address] }],
          outputs: [{ addresses: [destinationAddress], value: satoshiAmount }]
        })
      }
    )

    if (!newTxResponse.ok) {
      const errorText = await newTxResponse.text()
      console.error('BlockCypher new tx error:', errorText)
      throw new Error(`Failed to create transaction: ${errorText}`)
    }

    const txSkeleton = await newTxResponse.json()
    console.log('Transaction skeleton created')

    // Step 2: Sign the transaction
    // Note: This is a simplified signing - in production you'd use proper ECDSA
    const signatures = txSkeleton.tosign.map(() => privateKey)
    const pubkeys = Array(txSkeleton.tosign.length).fill(feeAddress.address)

    txSkeleton.signatures = signatures
    txSkeleton.pubkeys = pubkeys

    // Step 3: Send signed transaction
    const sendTxResponse = await fetch(
      `https://api.blockcypher.com/v1/${network}/txs/send?token=${blockcypherToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txSkeleton)
      }
    )

    if (!sendTxResponse.ok) {
      const errorText = await sendTxResponse.text()
      console.error('BlockCypher send tx error:', errorText)
      throw new Error(`Failed to send transaction: ${errorText}`)
    }

    const sentTx = await sendTxResponse.json()
    console.log('Transaction sent:', sentTx.tx.hash)

    // Update balance
    await supabase
      .from('admin_fee_addresses')
      .update({ balance: Number(feeAddress.balance) - Number(amount) })
      .eq('id', feeAddress.id)

    // Record withdrawal transaction
    await supabase.from('admin_fee_transactions').insert({
      order_id: '00000000-0000-0000-0000-000000000000', // Placeholder for withdrawals
      amount_eur: 0, // Would need price lookup
      amount_crypto: amount,
      currency: currencyUpper,
      transaction_type: 'withdrawal',
      destination_address: destinationAddress,
      tx_hash: sentTx.tx.hash,
      status: 'completed'
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        txHash: sentTx.tx.hash,
        message: `Successfully withdrew ${amount} ${currencyUpper}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in withdraw-admin-fees:', error)
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})