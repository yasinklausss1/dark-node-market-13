import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CartItem = { id: string; quantity: number };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { userId, items, method, btcPrice, ltcPrice, useEscrow } = body as {
      userId: string;
      items: CartItem[];
      method: 'btc' | 'ltc';
      btcPrice?: number;
      ltcPrice?: number;
      useEscrow?: boolean;
    };

    if (!userId || !items?.length || !method) throw new Error('Invalid payload');

    console.log(`Processing order for user ${userId}, method: ${method}, useEscrow: ${useEscrow}`);

    // Load product info and compute totals + amounts per seller
    const sellerTotals: Record<string, { eur: number; btc: number; ltc: number }> = {};
    let totalEUR = 0;

    for (const it of items) {
      const { data: product, error } = await supabase
        .from('products')
        .select('id, price, seller_id, stock')
        .eq('id', it.id)
        .maybeSingle();
      if (error || !product) throw error ?? new Error('Product not found');
      if (product.stock < it.quantity) throw new Error('Insufficient stock');

      const lineEUR = Number(product.price) * it.quantity;
      totalEUR += lineEUR;

      const btcAmt = btcPrice ? lineEUR / btcPrice : 0;
      const ltcAmt = ltcPrice ? lineEUR / ltcPrice : 0;

      const s = sellerTotals[product.seller_id] || { eur: 0, btc: 0, ltc: 0 };
      s.eur += lineEUR;
      s.btc += btcAmt;
      s.ltc += ltcAmt;
      sellerTotals[product.seller_id] = s;
    }

    // Check buyer balance
    const { data: buyerBal } = await supabase
      .from('wallet_balances')
      .select('balance_eur, balance_btc, balance_ltc')
      .eq('user_id', userId)
      .maybeSingle();
    if (!buyerBal) throw new Error('Buyer wallet not found');

    const totalBTC = method === 'btc' ? (totalEUR / (btcPrice || 1)) : 0;
    const totalLTC = method === 'ltc' ? (totalEUR / (ltcPrice || 1)) : 0;

    if (method === 'btc' && Number(buyerBal.balance_btc) + 1e-12 < totalBTC) throw new Error('Insufficient BTC balance');
    if (method === 'ltc' && Number((buyerBal as any).balance_ltc || 0) + 1e-12 < totalLTC) throw new Error('Insufficient LTC balance');

    // Get buyer's wallet address and private key for blockchain transactions
    const { data: buyerAddress } = await supabase
      .from('user_addresses')
      .select('address, private_key_encrypted')
      .eq('user_id', userId)
      .eq('currency', method.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!buyerAddress || !buyerAddress.private_key_encrypted) {
      throw new Error(`Buyer ${method.toUpperCase()} wallet not found or has no private key`);
    }

    // Create order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({ 
        user_id: userId, 
        total_amount_eur: totalEUR, 
        status: 'confirmed',
        payment_currency: method.toUpperCase()
      })
      .select()
      .maybeSingle();
    if (orderErr || !order) throw orderErr ?? new Error('Order creation failed');

    console.log(`Created order ${order.id}`);

    // Create order items and update stock
    for (const it of items) {
      const { data: product } = await supabase
        .from('products')
        .select('id, price, stock')
        .eq('id', it.id)
        .maybeSingle();
      if (!product) throw new Error('Product missing');

      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: it.id,
        quantity: it.quantity,
        price_eur: product.price,
      });

      const newStock = Math.max(0, Number(product.stock) - it.quantity);
      await supabase.from('products').update({ stock: newStock }).eq('id', it.id);
    }

    // Deduct buyer's internal balance
    if (method === 'btc') {
      await supabase.from('wallet_balances')
        .update({ balance_btc: Number(buyerBal.balance_btc) - totalBTC })
        .eq('user_id', userId);
    } else {
      await supabase.from('wallet_balances')
        .update({ balance_ltc: Number((buyerBal as any).balance_ltc || 0) - totalLTC })
        .eq('user_id', userId);
    }

    // Get buyer username for transaction tracking
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', userId)
      .maybeSingle();

    // Decrypt buyer's private key for blockchain transactions
    console.log('Decrypting buyer private key...');
    const buyerPrivateKey = await decryptPrivateKey(buyerAddress.private_key_encrypted);

    // Track all blockchain transactions
    const blockchainTxHashes: string[] = [];

    // Process each seller - send real blockchain transactions
    for (const [sellerId, sums] of Object.entries(sellerTotals)) {
      // Get seller's wallet address
      const { data: sellerAddress } = await supabase
        .from('user_addresses')
        .select('address')
        .eq('user_id', sellerId)
        .eq('currency', method.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (!sellerAddress || sellerAddress.address === 'pending') {
        throw new Error(`Seller ${sellerId} has no active ${method.toUpperCase()} wallet`);
      }

      // Get seller username
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', sellerId)
        .maybeSingle();

      const cryptoAmount = method === 'btc' ? sums.btc : sums.ltc;
      const amountSmallest = Math.floor(cryptoAmount * 100000000);

      console.log(`Sending ${cryptoAmount} ${method.toUpperCase()} from ${buyerAddress.address} to ${sellerAddress.address}`);

      let txResult: { txHash: string; fees: number };

      try {
        if (method === 'btc') {
          txResult = await sendBitcoinTransaction(
            buyerPrivateKey,
            buyerAddress.address,
            sellerAddress.address,
            amountSmallest
          );
        } else {
          txResult = await sendLitecoinTransaction(
            buyerPrivateKey,
            buyerAddress.address,
            sellerAddress.address,
            amountSmallest
          );
        }

        blockchainTxHashes.push(txResult.txHash);
        console.log(`Blockchain TX successful: ${txResult.txHash}`);

        // Credit seller's internal balance (for tracking)
        const { data: sBal } = await supabase
          .from('wallet_balances')
          .select('balance_btc, balance_ltc')
          .eq('user_id', sellerId)
          .maybeSingle();

        if (sBal) {
          if (method === 'btc') {
            await supabase.from('wallet_balances')
              .update({ balance_btc: Number(sBal.balance_btc) + sums.btc })
              .eq('user_id', sellerId);
          } else {
            await supabase.from('wallet_balances')
              .update({ balance_ltc: Number((sBal as any).balance_ltc || 0) + sums.ltc })
              .eq('user_id', sellerId);
          }
        } else {
          await supabase.from('wallet_balances')
            .insert({ 
              user_id: sellerId, 
              balance_eur: 0, 
              balance_btc: method === 'btc' ? sums.btc : 0, 
              balance_ltc: method === 'ltc' ? sums.ltc : 0 
            });
        }

        // Create seller transaction with TX hash
        await supabase.from('transactions').insert({
          user_id: sellerId,
          type: 'sale',
          amount_eur: sums.eur,
          amount_btc: method === 'btc' ? sums.btc : sums.ltc,
          status: 'confirmed',
          description: `Sale #${String(order.id).slice(0,8)} (${method.toUpperCase()}) - TX: ${txResult.txHash.slice(0, 12)}...`,
          transaction_direction: 'incoming',
          from_username: buyerProfile?.username || 'Unknown',
          related_order_id: order.id,
          btc_tx_hash: txResult.txHash
        });

      } catch (txError) {
        console.error(`Blockchain transaction to seller ${sellerId} failed:`, txError);
        
        // Mark order as failed
        await supabase.from('orders')
          .update({ status: 'payment_failed' })
          .eq('id', order.id);

        // Refund buyer's internal balance
        if (method === 'btc') {
          await supabase.from('wallet_balances')
            .update({ balance_btc: Number(buyerBal.balance_btc) })
            .eq('user_id', userId);
        } else {
          await supabase.from('wallet_balances')
            .update({ balance_ltc: Number((buyerBal as any).balance_ltc || 0) })
            .eq('user_id', userId);
        }

        throw new Error(`Blockchain transaction failed: ${txError.message}`);
      }
    }

    // Create buyer transaction record
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'purchase',
      amount_eur: -totalEUR,
      amount_btc: method === 'btc' ? -totalBTC : -totalLTC,
      status: 'confirmed',
      description: `Order #${String(order.id).slice(0,8)} (${method.toUpperCase()}) - ${blockchainTxHashes.length} Blockchain TX`,
      transaction_direction: 'outgoing',
      related_order_id: order.id,
      btc_tx_hash: blockchainTxHashes[0] || null
    });

    console.log(`Order ${order.id} completed with ${blockchainTxHashes.length} blockchain transactions`);

    return new Response(JSON.stringify({ 
      ok: true, 
      orderId: order.id,
      blockchainTxHashes
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('process-order error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
