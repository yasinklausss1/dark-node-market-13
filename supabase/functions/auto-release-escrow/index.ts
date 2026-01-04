import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as secp256k1 from "https://esm.sh/@noble/secp256k1@1.7.1"
import { hmac } from "https://esm.sh/@noble/hashes@1.3.2/hmac"
import { sha256 } from "https://esm.sh/@noble/hashes@1.3.2/sha256"

// Configure secp256k1 to use HMAC-SHA256 for RFC 6979 deterministic k generation
secp256k1.utils.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]) => {
  const combined = new Uint8Array(messages.reduce((acc, m) => acc + m.length, 0))
  let offset = 0
  for (const msg of messages) {
    combined.set(msg, offset)
    offset += msg.length
  }
  return hmac(sha256, key, combined)
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hardcoded fee addresses (1% escrow fee)
const FEE_ADDRESSES = {
  BTC: 'bc1q8qta4hckeqzly0x4kkqldx5v5483sgweuvjxp7',
  LTC: 'LYaT4LeUYAKnZsNpaRwKLQjNt3AwfKQVyf'
}

// Decrypt private key (AES-GCM)
async function decryptPrivateKey(encryptedKey: string): Promise<string> {
  const decoder = new TextDecoder()
  const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const key = new TextEncoder().encode(encryptionKey.slice(0, 32).padEnd(32, '0'))
  
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

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Send Bitcoin transaction via BlockCypher
async function sendBitcoinTransaction(
  privateKey: string, 
  fromAddress: string, 
  toAddress: string, 
  amountSatoshi: number
): Promise<{ txHash: string; fees: number }> {
  const BLOCKCYPHER_TOKEN = Deno.env.get('BLOCKCYPHER_TOKEN') || ''
  
  console.log(`[BTC] Creating TX: ${fromAddress} -> ${toAddress}, amount: ${amountSatoshi} satoshi`)
  
  // Step 1: Create unsigned transaction
  const newTxResponse = await fetch(`https://api.blockcypher.com/v1/btc/main/txs/new?token=${BLOCKCYPHER_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: [{ addresses: [fromAddress] }],
      outputs: [{ addresses: [toAddress], value: amountSatoshi }]
    })
  })
  
  if (!newTxResponse.ok) {
    const error = await newTxResponse.text()
    console.error('[BTC] Failed to create TX:', error)
    throw new Error(`Failed to create BTC transaction: ${error}`)
  }
  
  const txSkeleton = await newTxResponse.json()
  console.log('[BTC] TX skeleton created, tosign count:', txSkeleton.tosign?.length)
  
  if (!txSkeleton.tosign || txSkeleton.tosign.length === 0) {
    throw new Error('No tosign data received from BlockCypher')
  }
  
  // Step 2: Sign each tosign hash
  const privKeyBytes = hexToBytes(privateKey)
  const signatures: string[] = []
  const pubkeys: string[] = []
  
  for (const toSign of txSkeleton.tosign) {
    const msgHash = hexToBytes(toSign)
    const signature = secp256k1.signSync(msgHash, privKeyBytes, { canonical: true, der: false })
    const derSig = secp256k1.Signature.fromCompact(signature).toDERHex()
    signatures.push(derSig)
    const pubKey = secp256k1.getPublicKey(privKeyBytes, true)
    pubkeys.push(bytesToHex(pubKey))
  }
  
  txSkeleton.signatures = signatures
  txSkeleton.pubkeys = pubkeys
  
  // Step 3: Send signed transaction
  const sendResponse = await fetch(`https://api.blockcypher.com/v1/btc/main/txs/send?token=${BLOCKCYPHER_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(txSkeleton)
  })
  
  if (!sendResponse.ok) {
    const error = await sendResponse.text()
    console.error('[BTC] Failed to send TX:', error)
    throw new Error(`Failed to send BTC transaction: ${error}`)
  }
  
  const result = await sendResponse.json()
  console.log('[BTC] TX sent successfully:', result.tx?.hash)
  
  return { 
    txHash: result.tx?.hash || 'unknown',
    fees: result.tx?.fees || 0
  }
}

// Send Litecoin transaction via BlockCypher
async function sendLitecoinTransaction(
  privateKey: string, 
  fromAddress: string, 
  toAddress: string, 
  amountLitoshi: number
): Promise<{ txHash: string; fees: number }> {
  const BLOCKCYPHER_TOKEN = Deno.env.get('BLOCKCYPHER_TOKEN') || ''
  
  console.log(`[LTC] Creating TX: ${fromAddress} -> ${toAddress}, amount: ${amountLitoshi} litoshi`)
  
  // Step 1: Create unsigned transaction
  const newTxResponse = await fetch(`https://api.blockcypher.com/v1/ltc/main/txs/new?token=${BLOCKCYPHER_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: [{ addresses: [fromAddress] }],
      outputs: [{ addresses: [toAddress], value: amountLitoshi }]
    })
  })
  
  if (!newTxResponse.ok) {
    const error = await newTxResponse.text()
    console.error('[LTC] Failed to create TX:', error)
    throw new Error(`Failed to create LTC transaction: ${error}`)
  }
  
  const txSkeleton = await newTxResponse.json()
  console.log('[LTC] TX skeleton created, tosign count:', txSkeleton.tosign?.length)
  
  if (!txSkeleton.tosign || txSkeleton.tosign.length === 0) {
    throw new Error('No tosign data received from BlockCypher')
  }
  
  // Step 2: Sign each tosign hash
  const privKeyBytes = hexToBytes(privateKey)
  const signatures: string[] = []
  const pubkeys: string[] = []
  
  for (const toSign of txSkeleton.tosign) {
    const msgHash = hexToBytes(toSign)
    const signature = secp256k1.signSync(msgHash, privKeyBytes, { canonical: true, der: false })
    const derSig = secp256k1.Signature.fromCompact(signature).toDERHex()
    signatures.push(derSig)
    const pubKey = secp256k1.getPublicKey(privKeyBytes, true)
    pubkeys.push(bytesToHex(pubKey))
  }
  
  txSkeleton.signatures = signatures
  txSkeleton.pubkeys = pubkeys
  
  // Step 3: Send signed transaction
  const sendResponse = await fetch(`https://api.blockcypher.com/v1/ltc/main/txs/send?token=${BLOCKCYPHER_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(txSkeleton)
  })
  
  if (!sendResponse.ok) {
    const error = await sendResponse.text()
    console.error('[LTC] Failed to send TX:', error)
    throw new Error(`Failed to send LTC transaction: ${error}`)
  }
  
  const result = await sendResponse.json()
  console.log('[LTC] TX sent successfully:', result.tx?.hash)
  
  return { 
    txHash: result.tx?.hash || 'unknown',
    fees: result.tx?.fees || 0
  }
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

    console.log('Running auto-release escrow check...')

    // Find all escrow holdings that are past their auto-release date
    const now = new Date().toISOString()
    
    const { data: expiredHoldings, error: holdingsError } = await supabase
      .from('escrow_holdings')
      .select('*, orders(id, user_id)')
      .eq('status', 'held')
      .lte('auto_release_at', now)

    if (holdingsError) throw holdingsError

    if (!expiredHoldings || expiredHoldings.length === 0) {
      console.log('No escrow holdings ready for auto-release')
      return new Response(
        JSON.stringify({ success: true, message: 'No holdings to release', released: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${expiredHoldings.length} escrow holdings ready for auto-release`)

    let releasedCount = 0

    // Process each expired holding
    for (const holding of expiredHoldings) {
      try {
        const { 
          id: holdingId,
          seller_id, 
          buyer_id,
          seller_amount_crypto, 
          fee_amount_crypto, 
          currency, 
          fee_amount_eur, 
          order_id, 
          seller_amount_eur 
        } = holding

        const currencyUpper = currency.toUpperCase()
        console.log(`Processing holding ${holdingId} for order ${order_id} (${currencyUpper})`)

        // Get buyer's wallet address and private key
        const { data: buyerAddress, error: buyerAddrError } = await supabase
          .from('user_addresses')
          .select('address, private_key_encrypted')
          .eq('user_id', buyer_id)
          .eq('currency', currencyUpper)
          .eq('is_active', true)
          .maybeSingle()

        if (buyerAddrError || !buyerAddress?.private_key_encrypted) {
          console.error(`No buyer address found for ${buyer_id}:`, buyerAddrError)
          continue
        }

        // Get seller's wallet address
        const { data: sellerAddress, error: sellerAddrError } = await supabase
          .from('user_addresses')
          .select('address')
          .eq('user_id', seller_id)
          .eq('currency', currencyUpper)
          .eq('is_active', true)
          .maybeSingle()

        if (sellerAddrError || !sellerAddress?.address) {
          console.error(`No seller address found for ${seller_id}:`, sellerAddrError)
          continue
        }

        // Decrypt buyer's private key
        let privateKey: string
        try {
          privateKey = await decryptPrivateKey(buyerAddress.private_key_encrypted)
          console.log(`Decrypted private key for buyer ${buyer_id}`)
        } catch (decryptError) {
          console.error(`Failed to decrypt private key:`, decryptError)
          continue
        }

        // Convert crypto amounts to smallest unit
        const sellerAmountSmallest = currencyUpper === 'BTC' 
          ? Math.floor(Number(seller_amount_crypto) * 100000000) // satoshi
          : Math.floor(Number(seller_amount_crypto) * 100000000) // litoshi
        
        const feeAmountSmallest = currencyUpper === 'BTC'
          ? Math.floor(Number(fee_amount_crypto) * 100000000)
          : Math.floor(Number(fee_amount_crypto) * 100000000)

        let sellerTxHash = ''
        let feeTxHash = ''
        let blockchainFees = 0

        // Send payment to seller
        try {
          console.log(`Sending ${seller_amount_crypto} ${currencyUpper} to seller ${sellerAddress.address}`)
          
          const sellerResult = currencyUpper === 'BTC'
            ? await sendBitcoinTransaction(privateKey, buyerAddress.address, sellerAddress.address, sellerAmountSmallest)
            : await sendLitecoinTransaction(privateKey, buyerAddress.address, sellerAddress.address, sellerAmountSmallest)
          
          sellerTxHash = sellerResult.txHash
          blockchainFees += sellerResult.fees
          console.log(`Seller payment TX: ${sellerTxHash}`)
        } catch (txError) {
          console.error(`Failed to send seller payment:`, txError)
          // Still continue to try fee transaction and update internal balances
        }

        // Send fee to admin address
        if (feeAmountSmallest > 0) {
          try {
            const feeAddress = FEE_ADDRESSES[currencyUpper as keyof typeof FEE_ADDRESSES]
            console.log(`Sending ${fee_amount_crypto} ${currencyUpper} fee to ${feeAddress}`)
            
            const feeResult = currencyUpper === 'BTC'
              ? await sendBitcoinTransaction(privateKey, buyerAddress.address, feeAddress, feeAmountSmallest)
              : await sendLitecoinTransaction(privateKey, buyerAddress.address, feeAddress, feeAmountSmallest)
            
            feeTxHash = feeResult.txHash
            blockchainFees += feeResult.fees
            console.log(`Fee payment TX: ${feeTxHash}`)
          } catch (feeError) {
            console.error(`Failed to send fee:`, feeError)
          }
        }

        // Credit seller's internal CRYPTO wallet balance
        const balanceField = currencyUpper === 'BTC' ? 'balance_btc' : 'balance_ltc'
        
        const { data: sellerWallet } = await supabase
          .from('wallet_balances')
          .select(balanceField)
          .eq('user_id', seller_id)
          .maybeSingle()

        const currentBalance = Number(sellerWallet?.[balanceField] || 0)
        const newBalance = currentBalance + Number(seller_amount_crypto)

        await supabase
          .from('wallet_balances')
          .update({ [balanceField]: newBalance })
          .eq('user_id', seller_id)

        console.log(`Credited seller ${seller_id}: ${seller_amount_crypto} ${currencyUpper} (new balance: ${newBalance})`)

        // Create seller transaction record
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', buyer_id)
          .maybeSingle()

        await supabase.from('transactions').insert({
          user_id: seller_id,
          type: 'sale',
          amount_eur: seller_amount_eur,
          amount_btc: currencyUpper === 'BTC' ? seller_amount_crypto : 0,
          amount_ltc: currencyUpper === 'LTC' ? seller_amount_crypto : 0,
          status: 'confirmed',
          description: `Verkauf #${String(order_id).slice(0, 8)} (${currencyUpper}) - Auto-Release`,
          transaction_direction: 'incoming',
          from_username: buyerProfile?.username || 'Unknown',
          related_order_id: order_id,
          btc_tx_hash: sellerTxHash || null
        })

        // Record fee transaction
        await supabase.from('admin_fee_transactions').insert({
          escrow_holding_id: holdingId,
          order_id: order_id,
          amount_eur: fee_amount_eur,
          amount_crypto: fee_amount_crypto,
          currency: currencyUpper,
          transaction_type: 'fee_collected',
          status: feeTxHash ? 'completed' : 'pending',
          tx_hash: feeTxHash || null,
          destination_address: FEE_ADDRESSES[currencyUpper as keyof typeof FEE_ADDRESSES]
        })

        // Update escrow holding status
        await supabase
          .from('escrow_holdings')
          .update({ 
            status: 'released',
            released_at: new Date().toISOString(),
            blockchain_tx_hash: sellerTxHash || null,
            blockchain_tx_status: sellerTxHash ? 'confirmed' : 'failed',
            blockchain_fee_satoshi: blockchainFees
          })
          .eq('id', holdingId)

        // Update order escrow status
        await supabase
          .from('orders')
          .update({ escrow_status: 'released' })
          .eq('id', order_id)

        console.log(`Auto-released escrow ${holdingId} for order ${order_id}`)
        releasedCount++

      } catch (holdingError) {
        console.error(`Error auto-releasing holding ${holding.id}:`, holdingError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Auto-released ${releasedCount} escrow holdings`,
        released: releasedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in auto-release-escrow:', error)
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
