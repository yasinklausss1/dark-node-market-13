import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get current BTC blockchain height
async function getBtcBlockHeight(apiKey: string): Promise<number> {
  try {
    const response = await fetch(
      'https://api.tatum.io/v3/bitcoin/info',
      { headers: { 'x-api-key': apiKey } }
    );
    if (response.ok) {
      const data = await response.json();
      return data.blocks || 0;
    }
  } catch (e) {
    console.error('Failed to get BTC block height:', e);
  }
  return 0;
}

// Get current LTC blockchain height
async function getLtcBlockHeight(apiKey: string): Promise<number> {
  try {
    const response = await fetch(
      'https://api.tatum.io/v3/litecoin/info',
      { headers: { 'x-api-key': apiKey } }
    );
    if (response.ok) {
      const data = await response.json();
      return data.blocks || 0;
    }
  } catch (e) {
    console.error('Failed to get LTC block height:', e);
  }
  return 0;
}

// Get transactions for a BTC address via Tatum
async function getBtcTransactions(address: string, apiKey: string): Promise<any[]> {
  try {
    const response = await fetch(
      `https://api.tatum.io/v3/bitcoin/transaction/address/${address}?pageSize=50`,
      { headers: { 'x-api-key': apiKey } }
    );
    
    if (!response.ok) {
      console.error(`BTC TX fetch failed for ${address}:`, response.status);
      return [];
    }
    
    return await response.json();
  } catch (e) {
    console.error(`BTC TX error for ${address}:`, e);
    return [];
  }
}

// Get transactions for a LTC address via Tatum
async function getLtcTransactions(address: string, apiKey: string): Promise<any[]> {
  try {
    const response = await fetch(
      `https://api.tatum.io/v3/litecoin/transaction/address/${address}?pageSize=50`,
      { headers: { 'x-api-key': apiKey } }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LTC TX fetch failed for ${address}:`, response.status, errorText);
      return [];
    }
    
    return await response.json();
  } catch (e) {
    console.error(`LTC TX error for ${address}:`, e);
    return [];
  }
}

// Get current crypto prices
async function getCryptoPrices(): Promise<{ btc: number; ltc: number }> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin&vs_currencies=eur'
    );
    
    if (response.ok) {
      const data = await response.json();
      return {
        btc: data.bitcoin?.eur || 90000,
        ltc: data.litecoin?.eur || 100
      };
    }
  } catch (e) {
    console.log('Using fallback prices');
  }
  
  return { btc: 90000, ltc: 100 };
}

// Calculate confirmations from block number
function calculateConfirmations(txBlockNumber: number | null | undefined, currentBlockHeight: number): number {
  if (!txBlockNumber || txBlockNumber === 0 || currentBlockHeight === 0) {
    return 0; // Unconfirmed transaction (not in a block yet)
  }
  return Math.max(0, currentBlockHeight - txBlockNumber + 1);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tatumApiKey = Deno.env.get('TATUM_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Starting deposit monitoring...');

    // Get crypto prices and blockchain heights in parallel
    const [prices, btcHeight, ltcHeight] = await Promise.all([
      getCryptoPrices(),
      getBtcBlockHeight(tatumApiKey),
      getLtcBlockHeight(tatumApiKey)
    ]);
    
    console.log(`💰 Prices: BTC=${prices.btc}€, LTC=${prices.ltc}€`);
    console.log(`📊 Block heights: BTC=${btcHeight}, LTC=${ltcHeight}`);

    // Get all pending or received deposits that haven't expired
    const { data: pendingDeposits, error: fetchError } = await supabase
      .from('deposit_addresses')
      .select('*')
      .in('status', ['pending', 'received'])
      .gt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching pending deposits:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Found ${pendingDeposits?.length || 0} pending deposits to check`);

    if (!pendingDeposits || pendingDeposits.length === 0) {
      // Expire old pending deposits
      await supabase
        .from('deposit_addresses')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString());

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending deposits',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let processedCount = 0;

    // Process each pending deposit
    for (const deposit of pendingDeposits) {
      console.log(`\n🔎 Checking deposit ${deposit.id}: ${deposit.currency} ${deposit.address.substring(0, 16)}...`);

      let transactions: any[] = [];
      let currentBlockHeight = 0;
      
      if (deposit.currency === 'BTC') {
        transactions = await getBtcTransactions(deposit.address, tatumApiKey);
        currentBlockHeight = btcHeight;
      } else if (deposit.currency === 'LTC') {
        transactions = await getLtcTransactions(deposit.address, tatumApiKey);
        currentBlockHeight = ltcHeight;
      }

      console.log(`   Found ${transactions.length} transactions`);

      // Find incoming transactions to this address
      for (const tx of transactions) {
        const txHash = tx.hash;
        
        // Skip if we already processed this tx
        if (deposit.tx_hash === txHash && deposit.status === 'completed') {
          continue;
        }

        // Calculate received amount from outputs
        let receivedSatoshi = 0;
        for (const output of tx.outputs || []) {
          if (output.address === deposit.address) {
            receivedSatoshi += Math.round(parseFloat(output.value) * 100000000);
          }
        }

        if (receivedSatoshi === 0) continue;

        const receivedCrypto = receivedSatoshi / 100000000;
        
        // Calculate confirmations from block number (Tatum doesn't provide confirmations directly for LTC)
        const txBlockNumber = tx.blockNumber;
        const confirmations = tx.confirmations !== undefined 
          ? tx.confirmations 
          : calculateConfirmations(txBlockNumber, currentBlockHeight);

        console.log(`   💰 TX ${txHash.substring(0, 16)}...: ${receivedCrypto} ${deposit.currency}, block=${txBlockNumber || 'pending'}, ${confirmations} confirmations`);

        // Update status based on confirmations
        if (confirmations >= deposit.required_confirmations) {
          // Transaction confirmed - credit the user
          const price = deposit.currency === 'BTC' ? prices.btc : prices.ltc;
          const eurValue = receivedCrypto * price;

          console.log(`   ✅ Confirmed! Crediting ${receivedCrypto} ${deposit.currency} (€${eurValue.toFixed(2)})`);

          // Get current wallet balance
          const { data: wallet } = await supabase
            .from('wallet_balances')
            .select('*')
            .eq('user_id', deposit.user_id)
            .maybeSingle();

          const balanceField = deposit.currency === 'BTC' ? 'balance_btc' : 'balance_ltc';
          const depositedField = deposit.currency === 'BTC' ? 'balance_btc_deposited' : 'balance_ltc_deposited';

          const currentBalance = wallet?.[balanceField] || 0;
          const currentDeposited = wallet?.[depositedField] || 0;

          // Update wallet balance
          await supabase
            .from('wallet_balances')
            .upsert({
              user_id: deposit.user_id,
              [balanceField]: currentBalance + receivedCrypto,
              [depositedField]: currentDeposited + receivedCrypto
            }, { onConflict: 'user_id' });

          // Update deposit status
          await supabase
            .from('deposit_addresses')
            .update({
              status: 'completed',
              tx_hash: txHash,
              confirmations: confirmations,
              received_amount_crypto: receivedCrypto,
              confirmed_at: new Date().toISOString()
            })
            .eq('id', deposit.id);

          // Create transaction record
          await supabase
            .from('transactions')
            .insert({
              user_id: deposit.user_id,
              type: 'deposit',
              amount_btc: deposit.currency === 'BTC' ? receivedCrypto : 0,
              amount_ltc: deposit.currency === 'LTC' ? receivedCrypto : 0,
              amount_eur: eurValue,
              status: 'completed',
              btc_tx_hash: txHash,
              description: `${deposit.currency} Einzahlung: ${receivedCrypto.toFixed(8)} ${deposit.currency}`
            });

          // Create processed deposit record
          await supabase
            .from('processed_deposits')
            .insert({
              tx_hash: txHash,
              currency: deposit.currency,
              amount_crypto: receivedCrypto,
              amount_eur: eurValue,
              user_id: deposit.user_id
            });

          processedCount++;
          
        } else if (deposit.status === 'pending') {
          // Transaction seen but not confirmed yet
          console.log(`   ⏳ Waiting for confirmations (${confirmations}/${deposit.required_confirmations})`);

          await supabase
            .from('deposit_addresses')
            .update({
              status: 'received',
              tx_hash: txHash,
              confirmations: confirmations,
              received_amount_crypto: receivedCrypto
            })
            .eq('id', deposit.id);
        } else if (deposit.status === 'received') {
          // Update confirmation count
          await supabase
            .from('deposit_addresses')
            .update({ confirmations: confirmations })
            .eq('id', deposit.id);
        }

        // Only process first matching transaction
        break;
      }
    }

    // Expire old pending deposits
    await supabase
      .from('deposit_addresses')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    console.log(`\n✅ Processed ${processedCount} deposits`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed ${processedCount} deposits`,
      processed: processedCount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
