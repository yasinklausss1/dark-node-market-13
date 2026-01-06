import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_USER_ID = '0af916bb-1c03-4173-a898-fd4274ae4a2b';

// Extract fingerprint from amount (digits 3-6 from satoshi, i.e., positions for XFFFF00 pattern)
function extractFingerprint(satoshi: number): number {
  return Math.floor((satoshi % 1000000) / 100);
}

const FINGERPRINT_TOLERANCE = 5;

// Tatum API helper for getting transactions
async function getTatumTransactions(address: string, currency: 'BTC' | 'LTC', apiKey: string): Promise<any[]> {
  const chain = currency === 'BTC' ? 'bitcoin' : 'litecoin';
  
  try {
    const response = await fetch(
      `https://api.tatum.io/v3/${chain}/address/transaction/${address}?pageSize=50`,
      {
        headers: {
          'x-api-key': apiKey,
        },
      }
    );
    
    if (!response.ok) {
      console.error(`Tatum ${currency} TX fetch failed:`, response.status);
      return [];
    }
    
    return await response.json();
  } catch (e) {
    console.error(`Tatum ${currency} TX error:`, e);
    return [];
  }
}

// Tatum API helper for getting balance
async function getTatumBalance(address: string, currency: 'BTC' | 'LTC', apiKey: string): Promise<number> {
  const chain = currency === 'BTC' ? 'bitcoin' : 'litecoin';
  
  try {
    const response = await fetch(
      `https://api.tatum.io/v3/${chain}/address/balance/${address}`,
      {
        headers: {
          'x-api-key': apiKey,
        },
      }
    );
    
    if (!response.ok) {
      console.error(`Tatum ${currency} balance fetch failed:`, response.status);
      return 0;
    }
    
    const data = await response.json();
    // Tatum returns balance as string with incoming and outgoing
    const incoming = parseFloat(data.incoming || '0');
    const outgoing = parseFloat(data.outgoing || '0');
    return incoming - outgoing;
  } catch (e) {
    console.error(`Tatum ${currency} balance error:`, e);
    return 0;
  }
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

    console.log('🔍 Starting Tatum deposit check with fingerprint matching...');

    // Get central pool addresses from admin_fee_addresses
    const { data: poolAddresses, error: poolError } = await supabase
      .from('admin_fee_addresses')
      .select('currency, address')
      .eq('admin_user_id', ADMIN_USER_ID);

    if (poolError || !poolAddresses?.length) {
      console.error('No pool addresses configured:', poolError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Pool addresses not configured. Run generate-tatum-pool-addresses first.',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const CENTRAL_BTC_ADDRESS = poolAddresses.find(a => a.currency === 'BTC')?.address;
    const CENTRAL_LTC_ADDRESS = poolAddresses.find(a => a.currency === 'LTC')?.address;

    console.log('Pool addresses:', { BTC: CENTRAL_BTC_ADDRESS, LTC: CENTRAL_LTC_ADDRESS });

    // Get crypto prices
    let btcPrice = 90000;
    let ltcPrice = 100;
    
    try {
      const priceResponse = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin&vs_currencies=eur'
      );
      if (priceResponse.ok) {
        const prices = await priceResponse.json();
        btcPrice = prices.bitcoin?.eur || btcPrice;
        ltcPrice = prices.litecoin?.eur || ltcPrice;
      }
    } catch (e) {
      console.log('⚠️ Using fallback prices');
    }

    console.log(`💰 Prices: BTC=${btcPrice}€, LTC=${ltcPrice}€`);

    // Get all pending deposit requests
    const { data: pendingRequests, error: requestsError } = await supabase
      .from('deposit_requests')
      .select('*')
      .in('status', ['pending', 'received'])
      .gt('expires_at', new Date().toISOString());

    if (requestsError) {
      console.error('Error fetching pending requests:', requestsError);
      throw requestsError;
    }

    console.log(`📋 Found ${pendingRequests?.length || 0} pending deposit requests`);

    if (!pendingRequests || pendingRequests.length === 0) {
      // Expire old requests
      await supabase
        .from('deposit_requests')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString());

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending deposits to check',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processedCount = 0;

    // Check BTC transactions via Tatum
    const btcRequests = pendingRequests.filter(r => r.currency === 'BTC');
    if (btcRequests.length > 0 && CENTRAL_BTC_ADDRESS) {
      try {
        console.log(`🔍 Checking BTC via Tatum: ${CENTRAL_BTC_ADDRESS}`);
        const btcTxs = await getTatumTransactions(CENTRAL_BTC_ADDRESS, 'BTC', tatumApiKey);
        console.log(`📦 Found ${btcTxs.length} BTC transactions`);
        
        for (const tx of btcTxs) {
          const txHash = tx.hash;
          
          // Check if already processed
          const { data: existing } = await supabase
            .from('processed_deposits')
            .select('id')
            .eq('tx_hash', txHash)
            .maybeSingle();

          if (existing) continue;

          // Calculate received amount from outputs
          let receivedSats = 0;
          for (const output of tx.outputs || []) {
            if (output.address === CENTRAL_BTC_ADDRESS) {
              receivedSats += Math.round(parseFloat(output.value) * 100000000);
            }
          }

          if (receivedSats === 0) continue;

          const receivedBtc = receivedSats / 100000000;
          const confirmations = tx.confirmations || 0;

          console.log(`💸 BTC TX ${txHash.substring(0, 16)}...: ${receivedBtc} BTC, ${confirmations} conf`);

          // Extract fingerprint and match
          const receivedFingerprint = extractFingerprint(receivedSats);
          
          const matchingRequest = btcRequests.find(r => {
            const expectedFingerprint = r.fingerprint;
            const diff = Math.abs(receivedFingerprint - expectedFingerprint);
            return diff <= FINGERPRINT_TOLERANCE;
          });

          if (matchingRequest) {
            console.log(`✅ Matched TX to request ${matchingRequest.id} (fingerprint: ${matchingRequest.fingerprint})`);
            
            if (confirmations >= 1) {
              const receivedEurValue = receivedBtc * btcPrice;
              
              // Get current balance
              const { data: currentBalance } = await supabase
                .from('wallet_balances')
                .select('balance_btc, balance_btc_deposited')
                .eq('user_id', matchingRequest.user_id)
                .single();

              const newBtcBalance = (currentBalance?.balance_btc || 0) + receivedBtc;
              const newBtcDeposited = (currentBalance?.balance_btc_deposited || 0) + receivedBtc;
              
              await supabase
                .from('wallet_balances')
                .update({ 
                  balance_btc: newBtcBalance,
                  balance_btc_deposited: newBtcDeposited
                })
                .eq('user_id', matchingRequest.user_id);

              await supabase
                .from('deposit_requests')
                .update({
                  status: 'completed',
                  tx_hash: txHash,
                  confirmations: confirmations
                })
                .eq('id', matchingRequest.id);

              await supabase
                .from('processed_deposits')
                .insert({
                  tx_hash: txHash,
                  currency: 'BTC',
                  amount_crypto: receivedBtc,
                  amount_eur: receivedEurValue,
                  user_id: matchingRequest.user_id
                });

              await supabase
                .from('transactions')
                .insert({
                  user_id: matchingRequest.user_id,
                  type: 'deposit',
                  amount_btc: receivedBtc,
                  amount_ltc: 0,
                  amount_eur: receivedEurValue,
                  status: 'completed',
                  btc_tx_hash: txHash,
                  description: `BTC Einzahlung: ${receivedBtc.toFixed(8)} BTC`
                });

              processedCount++;
              console.log(`✅ Credited ${receivedBtc} BTC to user ${matchingRequest.user_id}`);
              
              const idx = btcRequests.indexOf(matchingRequest);
              if (idx > -1) btcRequests.splice(idx, 1);
            } else {
              await supabase
                .from('deposit_requests')
                .update({ 
                  status: 'received',
                  tx_hash: txHash,
                  confirmations: 0
                })
                .eq('id', matchingRequest.id);
              
              console.log(`⏳ TX received but waiting for confirmation`);
            }
          }
        }
      } catch (e) {
        console.error('Error checking BTC via Tatum:', e);
      }
    }

    // Check LTC transactions via Tatum
    const ltcRequests = pendingRequests.filter(r => r.currency === 'LTC');
    if (ltcRequests.length > 0 && CENTRAL_LTC_ADDRESS) {
      try {
        console.log(`🔍 Checking LTC via Tatum: ${CENTRAL_LTC_ADDRESS}`);
        const ltcTxs = await getTatumTransactions(CENTRAL_LTC_ADDRESS, 'LTC', tatumApiKey);
        console.log(`📦 Found ${ltcTxs.length} LTC transactions`);
        
        for (const tx of ltcTxs) {
          const txHash = tx.hash;
          
          // Check if already processed
          const { data: existing } = await supabase
            .from('processed_deposits')
            .select('id')
            .eq('tx_hash', txHash)
            .maybeSingle();

          if (existing) continue;

          // Calculate received amount from outputs
          let receivedLitoshi = 0;
          for (const output of tx.outputs || []) {
            if (output.address === CENTRAL_LTC_ADDRESS) {
              receivedLitoshi += Math.round(parseFloat(output.value) * 100000000);
            }
          }

          if (receivedLitoshi === 0) continue;

          const receivedLtc = receivedLitoshi / 100000000;
          const confirmations = tx.confirmations || 0;

          console.log(`💸 LTC TX ${txHash.substring(0, 16)}...: ${receivedLtc} LTC, ${confirmations} conf`);

          // Extract fingerprint and match
          const receivedFingerprint = extractFingerprint(receivedLitoshi);
          
          const matchingRequest = ltcRequests.find(r => {
            const expectedFingerprint = r.fingerprint;
            const diff = Math.abs(receivedFingerprint - expectedFingerprint);
            return diff <= FINGERPRINT_TOLERANCE;
          });

          if (matchingRequest) {
            console.log(`✅ Matched TX to request ${matchingRequest.id} (fingerprint: ${matchingRequest.fingerprint})`);
            
            if (confirmations >= 1) {
              const receivedEurValue = receivedLtc * ltcPrice;
              
              // Get current balance
              const { data: currentBalance } = await supabase
                .from('wallet_balances')
                .select('balance_ltc, balance_ltc_deposited')
                .eq('user_id', matchingRequest.user_id)
                .single();

              const newLtcBalance = (currentBalance?.balance_ltc || 0) + receivedLtc;
              const newLtcDeposited = (currentBalance?.balance_ltc_deposited || 0) + receivedLtc;
              
              await supabase
                .from('wallet_balances')
                .update({ 
                  balance_ltc: newLtcBalance,
                  balance_ltc_deposited: newLtcDeposited
                })
                .eq('user_id', matchingRequest.user_id);

              await supabase
                .from('deposit_requests')
                .update({
                  status: 'completed',
                  tx_hash: txHash,
                  confirmations: confirmations
                })
                .eq('id', matchingRequest.id);

              await supabase
                .from('processed_deposits')
                .insert({
                  tx_hash: txHash,
                  currency: 'LTC',
                  amount_crypto: receivedLtc,
                  amount_eur: receivedEurValue,
                  user_id: matchingRequest.user_id
                });

              await supabase
                .from('transactions')
                .insert({
                  user_id: matchingRequest.user_id,
                  type: 'deposit',
                  amount_btc: 0,
                  amount_ltc: receivedLtc,
                  amount_eur: receivedEurValue,
                  status: 'completed',
                  btc_tx_hash: txHash,
                  description: `LTC Einzahlung: ${receivedLtc.toFixed(8)} LTC`
                });

              processedCount++;
              console.log(`✅ Credited ${receivedLtc} LTC to user ${matchingRequest.user_id}`);
              
              const idx = ltcRequests.indexOf(matchingRequest);
              if (idx > -1) ltcRequests.splice(idx, 1);
            } else {
              await supabase
                .from('deposit_requests')
                .update({ 
                  status: 'received',
                  tx_hash: txHash,
                  confirmations: 0
                })
                .eq('id', matchingRequest.id);
              
              console.log(`⏳ TX received but waiting for confirmation`);
            }
          }
        }
      } catch (e) {
        console.error('Error checking LTC via Tatum:', e);
      }
    }

    // Expire old requests
    await supabase
      .from('deposit_requests')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    // Sync pool balances via Tatum
    try {
      if (CENTRAL_BTC_ADDRESS) {
        const btcBalance = await getTatumBalance(CENTRAL_BTC_ADDRESS, 'BTC', tatumApiKey);
        await supabase
          .from('admin_fee_addresses')
          .update({ balance: btcBalance, updated_at: new Date().toISOString() })
          .eq('address', CENTRAL_BTC_ADDRESS);
        console.log(`📊 Updated BTC pool balance via Tatum: ${btcBalance} BTC`);
      }

      if (CENTRAL_LTC_ADDRESS) {
        const ltcBalance = await getTatumBalance(CENTRAL_LTC_ADDRESS, 'LTC', tatumApiKey);
        await supabase
          .from('admin_fee_addresses')
          .update({ balance: ltcBalance, updated_at: new Date().toISOString() })
          .eq('address', CENTRAL_LTC_ADDRESS);
        console.log(`📊 Updated LTC pool balance via Tatum: ${ltcBalance} LTC`);
      }
    } catch (e) {
      console.log('⚠️ Could not sync pool balances:', e);
    }

    console.log(`✅ Processed ${processedCount} deposits via Tatum`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed ${processedCount} deposits via Tatum`,
      processed: processedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
