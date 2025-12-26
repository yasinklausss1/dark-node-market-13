import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_USER_ID = '0af916bb-1c03-4173-a898-fd4274ae4a2b'

// Decrypt private key (AES-GCM) - MUST use same key as encryption in generate-user-addresses
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

// Send Bitcoin transaction via BlockCypher
async function sendBitcoinTransaction(
  privateKey: string, 
  fromAddress: string, 
  toAddress: string, 
  amountSatoshi: number
): Promise<{ txHash: string; fees: number }> {
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

  console.log('Created BTC transaction skeleton, fees:', txData.tx?.fees)

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
  const fees = signedData.tx?.fees || 0
  console.log('BTC transaction sent successfully, tx hash:', txHash, 'fees:', fees)
  
  return { txHash, fees }
}

// Send Litecoin transaction via BlockCypher
async function sendLitecoinTransaction(
  privateKey: string,
  fromAddress: string,
  toAddress: string,
  amountLitoshi: number
): Promise<{ txHash: string; fees: number }> {
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

  console.log('Created LTC transaction skeleton, fees:', txData.tx?.fees)

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
  const fees = signedData.tx?.fees || 0
  console.log('LTC transaction sent successfully, tx hash:', txHash, 'fees:', fees)
  
  return { txHash, fees }
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

    const { orderId, isAutoRelease } = await req.json()

    if (!orderId) throw new Error('Order ID required')

    // If not auto-release, verify the caller is the buyer
    if (!isAutoRelease) {
      const authHeader = req.headers.get('Authorization')
      const token = authHeader?.replace('Bearer ', '')
      const { data: userData } = await supabase.auth.getUser(token)
      
      // Get the order to verify buyer
      const { data: order } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', orderId)
        .maybeSingle()
      
      if (!order || order.user_id !== userData.user?.id) {
        throw new Error('Unauthorized - Only the buyer can release escrow')
      }
    }

    console.log('Releasing escrow for order:', orderId)

    // Get all escrow holdings for this order that are still held
    const { data: escrowHoldings, error: escrowError } = await supabase
      .from('escrow_holdings')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'held')

    if (escrowError) throw escrowError
    if (!escrowHoldings || escrowHoldings.length === 0) {
      throw new Error('No held escrow found for this order')
    }

    // Process each escrow holding
    for (const holding of escrowHoldings) {
      const { buyer_id, seller_id, seller_amount_crypto, fee_amount_crypto, currency, fee_amount_eur, seller_amount_eur } = holding

      console.log(`Processing escrow holding ${holding.id}: ${seller_amount_crypto} ${currency} from buyer ${buyer_id} to seller ${seller_id}`)

      // Get buyer's wallet address and private key
      const { data: buyerAddress, error: buyerAddressError } = await supabase
        .from('user_addresses')
        .select('address, private_key_encrypted')
        .eq('user_id', buyer_id)
        .eq('currency', currency.toUpperCase())
        .eq('is_active', true)
        .maybeSingle()

      if (buyerAddressError || !buyerAddress || !buyerAddress.private_key_encrypted) {
        console.error('Buyer address not found:', buyerAddressError)
        throw new Error(`Buyer ${currency} wallet not found or has no private key`)
      }

      // Get seller's wallet address
      const { data: sellerAddress, error: sellerAddressError } = await supabase
        .from('user_addresses')
        .select('address')
        .eq('user_id', seller_id)
        .eq('currency', currency.toUpperCase())
        .eq('is_active', true)
        .maybeSingle()

      if (sellerAddressError || !sellerAddress || sellerAddress.address === 'pending') {
        console.error('Seller address not found:', sellerAddressError)
        throw new Error(`Seller ${currency} wallet not found`)
      }

      // Get admin fee address for this currency
      const { data: adminFeeAddress } = await supabase
        .from('admin_fee_addresses')
        .select('address, balance')
        .eq('admin_user_id', ADMIN_USER_ID)
        .eq('currency', currency.toUpperCase())
        .maybeSingle()

      // Decrypt buyer's private key
      console.log('Decrypting buyer private key...')
      const privateKey = await decryptPrivateKey(buyerAddress.private_key_encrypted)

      // Calculate amounts in smallest unit (satoshi/litoshi)
      const sellerAmountSmallest = Math.floor(Number(seller_amount_crypto) * 100000000)
      const feeAmountSmallest = Math.floor(Number(fee_amount_crypto) * 100000000)

      let txHash = ''
      let blockchainFee = 0

      // Send blockchain transaction from buyer to seller
      try {
        console.log(`Sending ${seller_amount_crypto} ${currency} from ${buyerAddress.address} to ${sellerAddress.address}`)
        
        if (currency.toUpperCase() === 'BTC') {
          const result = await sendBitcoinTransaction(
            privateKey,
            buyerAddress.address,
            sellerAddress.address,
            sellerAmountSmallest
          )
          txHash = result.txHash
          blockchainFee = result.fees
        } else if (currency.toUpperCase() === 'LTC') {
          const result = await sendLitecoinTransaction(
            privateKey,
            buyerAddress.address,
            sellerAddress.address,
            sellerAmountSmallest
          )
          txHash = result.txHash
          blockchainFee = result.fees
        } else {
          throw new Error(`Unsupported currency: ${currency}`)
        }

        console.log(`Blockchain transaction successful! TX Hash: ${txHash}, Fee: ${blockchainFee}`)

        // Update escrow holding with blockchain details
        await supabase
          .from('escrow_holdings')
          .update({ 
            status: 'released',
            released_at: new Date().toISOString(),
            blockchain_tx_hash: txHash,
            blockchain_tx_status: 'confirmed',
            blockchain_fee_satoshi: blockchainFee
          })
          .eq('id', holding.id)

        // Credit seller's internal balance (for tracking purposes)
        const balanceField = currency.toLowerCase() === 'btc' ? 'balance_btc' : 'balance_ltc'
        
        const { data: sellerWallet } = await supabase
          .from('wallet_balances')
          .select(balanceField)
          .eq('user_id', seller_id)
          .maybeSingle()

        if (sellerWallet) {
          const currentBalance = Number(sellerWallet[balanceField] || 0)
          await supabase
            .from('wallet_balances')
            .update({ [balanceField]: currentBalance + Number(seller_amount_crypto) })
            .eq('user_id', seller_id)
        }

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
          amount_btc: currency.toLowerCase() === 'btc' ? seller_amount_crypto : 0,
          status: 'confirmed',
          description: `Sale #${String(orderId).slice(0, 8)} (${currency.toUpperCase()}) - Blockchain TX: ${txHash.slice(0, 16)}...`,
          transaction_direction: 'incoming',
          from_username: buyerProfile?.username || 'Unknown',
          related_order_id: orderId,
          btc_tx_hash: txHash
        })

        // Update admin fee address balance (fees stay in buyer's wallet for now, need separate TX)
        if (adminFeeAddress && feeAmountSmallest > 0) {
          // For simplicity, we track fees internally - a separate process can sweep them
          await supabase
            .from('admin_fee_addresses')
            .update({ balance: Number(adminFeeAddress.balance) + Number(fee_amount_crypto) })
            .eq('admin_user_id', ADMIN_USER_ID)
            .eq('currency', currency.toUpperCase())

          // Record fee transaction
          await supabase.from('admin_fee_transactions').insert({
            escrow_holding_id: holding.id,
            order_id: orderId,
            amount_eur: fee_amount_eur,
            amount_crypto: fee_amount_crypto,
            currency: currency.toUpperCase(),
            transaction_type: 'fee_collected',
            status: 'completed'
          })
        }

        console.log(`Escrow ${holding.id} released successfully with blockchain TX: ${txHash}`)

      } catch (txError) {
        console.error('Blockchain transaction failed:', txError)
        
        // Mark escrow as failed
        await supabase
          .from('escrow_holdings')
          .update({ 
            blockchain_tx_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', holding.id)

        throw new Error(`Blockchain transaction failed: ${txError.message}`)
      }
    }

    // Update order escrow status
    await supabase
      .from('orders')
      .update({ 
        escrow_status: 'released',
        buyer_confirmed_at: isAutoRelease ? null : new Date().toISOString()
      })
      .eq('id', orderId)

    return new Response(
      JSON.stringify({ success: true, message: 'Escrow released successfully - Blockchain transaction sent!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in release-escrow:', error)
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
