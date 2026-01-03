import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Central platform addresses
const CENTRAL_BTC_ADDRESS = '16rmws2YNweEAsbVAV2KauwhFjP2myDfsf';
const CENTRAL_LTC_ADDRESS = 'Lejgj3ZCYryMz4b7ConCzv5wpEHqTZriFy';

// Extract fingerprint from amount (digits 3-6 from satoshi, i.e., positions for XFFFF00 pattern)
function extractFingerprint(satoshi: number): number {
  // Amount format: XFFFF00 where FFFF is the fingerprint (4 digits)
  return Math.floor((satoshi % 1000000) / 100);
}

// Tolerance for fingerprint matching (allow some variance in last 2 digits due to fees)
const FINGERPRINT_TOLERANCE = 5; // Allow fingerprint to be off by up to 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Starting deposit check with fingerprint matching...');

    // Get current crypto prices
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

    // Check BTC transactions
    const btcRequests = pendingRequests.filter(r => r.currency === 'BTC');
    if (btcRequests.length > 0) {
      try {
        console.log(`🔍 Checking BTC address: ${CENTRAL_BTC_ADDRESS}`);
        const btcResponse = await fetch(
          `https://mempool.space/api/address/${CENTRAL_BTC_ADDRESS}/txs`
        );
        
        if (btcResponse.ok) {
          const btcTxs = await btcResponse.json();
          console.log(`📦 Found ${btcTxs.length} BTC transactions`);
          
          for (const tx of btcTxs) {
            // Check if already processed globally
            const { data: existing } = await supabase
              .from('processed_deposits')
              .select('id')
              .eq('tx_hash', tx.txid)
              .maybeSingle();

            if (existing) continue;

            // Calculate received amount
            let receivedSats = 0;
            for (const vout of tx.vout || []) {
              if (vout.scriptpubkey_address === CENTRAL_BTC_ADDRESS) {
                receivedSats += vout.value;
              }
            }

            if (receivedSats === 0) continue;

            const receivedBtc = receivedSats / 100000000;
            const confirmations = tx.status?.confirmed ? 1 : 0;

            console.log(`💸 BTC TX ${tx.txid.substring(0, 16)}...: ${receivedBtc} BTC, ${confirmations} conf`);

            // Extract fingerprint from received amount and match
            const receivedFingerprint = extractFingerprint(receivedSats);
            
            const matchingRequest = btcRequests.find(r => {
              const expectedFingerprint = r.fingerprint;
              const diff = Math.abs(receivedFingerprint - expectedFingerprint);
              return diff <= FINGERPRINT_TOLERANCE;
            });

            if (matchingRequest) {
              console.log(`✅ Matched TX to request ${matchingRequest.id} (fingerprint: ${matchingRequest.fingerprint})`);
              
              if (confirmations >= 1) {
                // Confirmed - credit balance
                const receivedEur = receivedBtc * btcPrice;
                
                // Get current balance
                const { data: currentBalance } = await supabase
                  .from('wallet_balances')
                  .select('balance_btc_deposited')
                  .eq('user_id', matchingRequest.user_id)
                  .single();

                const newBalance = (currentBalance?.balance_btc_deposited || 0) + receivedBtc;
                
                await supabase
                  .from('wallet_balances')
                  .update({ balance_btc_deposited: newBalance })
                  .eq('user_id', matchingRequest.user_id);

                // Mark request as completed
                await supabase
                  .from('deposit_requests')
                  .update({
                    status: 'completed',
                    tx_hash: tx.txid,
                    confirmations: confirmations
                  })
                  .eq('id', matchingRequest.id);

                // Record processed deposit
                await supabase
                  .from('processed_deposits')
                  .insert({
                    tx_hash: tx.txid,
                    currency: 'BTC',
                    amount_crypto: receivedBtc,
                    amount_eur: receivedEur,
                    user_id: matchingRequest.user_id
                  });

                // Create transaction record
                await supabase
                  .from('transactions')
                  .insert({
                    user_id: matchingRequest.user_id,
                    type: 'deposit',
                    amount_btc: receivedBtc,
                    amount_eur: receivedEur,
                    status: 'completed',
                    btc_tx_hash: tx.txid,
                    description: `BTC Einzahlung`
                  });

                processedCount++;
                console.log(`✅ Credited ${receivedBtc} BTC to user ${matchingRequest.user_id}`);
                
                // Remove from array to prevent double matching
                const idx = btcRequests.indexOf(matchingRequest);
                if (idx > -1) btcRequests.splice(idx, 1);
              } else {
                // Unconfirmed - mark as received
                await supabase
                  .from('deposit_requests')
                  .update({ 
                    status: 'received',
                    tx_hash: tx.txid,
                    confirmations: 0
                  })
                  .eq('id', matchingRequest.id);
                
                console.log(`⏳ TX received but waiting for confirmation`);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error checking BTC:', e);
      }
    }

    // Check LTC transactions
    const ltcRequests = pendingRequests.filter(r => r.currency === 'LTC');
    if (ltcRequests.length > 0) {
      try {
        console.log(`🔍 Checking LTC address: ${CENTRAL_LTC_ADDRESS}`);
        const ltcResponse = await fetch(
          `https://api.blockcypher.com/v1/ltc/main/addrs/${CENTRAL_LTC_ADDRESS}?limit=50`
        );
        
        if (ltcResponse.ok) {
          const ltcData = await ltcResponse.json();
          const ltcTxs = ltcData.txrefs || [];
          console.log(`📦 Found ${ltcTxs.length} LTC transactions`);
          
          for (const txRef of ltcTxs) {
            const txHash = txRef.tx_hash;
            
            // Check if already processed
            const { data: existing } = await supabase
              .from('processed_deposits')
              .select('id')
              .eq('tx_hash', txHash)
              .maybeSingle();

            if (existing) continue;

            // Only process incoming transactions
            if (txRef.tx_output_n < 0) continue;

            const receivedLitoshi = txRef.value;
            const receivedLtc = receivedLitoshi / 100000000;
            const confirmations = txRef.confirmations || 0;

            console.log(`💸 LTC TX ${txHash.substring(0, 16)}...: ${receivedLtc} LTC, ${confirmations} conf`);

            // Extract fingerprint from received amount and match
            const receivedFingerprint = extractFingerprint(receivedLitoshi);
            
            const matchingRequest = ltcRequests.find(r => {
              const expectedFingerprint = r.fingerprint;
              const diff = Math.abs(receivedFingerprint - expectedFingerprint);
              return diff <= FINGERPRINT_TOLERANCE;
            });

            if (matchingRequest) {
              console.log(`✅ Matched TX to request ${matchingRequest.id} (fingerprint: ${matchingRequest.fingerprint})`);
              
              if (confirmations >= 1) {
                // Confirmed - credit balance
                const receivedEur = receivedLtc * ltcPrice;
                
                // Get current balance
                const { data: currentBalance } = await supabase
                  .from('wallet_balances')
                  .select('balance_ltc_deposited')
                  .eq('user_id', matchingRequest.user_id)
                  .single();

                const newBalance = (currentBalance?.balance_ltc_deposited || 0) + receivedLtc;
                
                await supabase
                  .from('wallet_balances')
                  .update({ balance_ltc_deposited: newBalance })
                  .eq('user_id', matchingRequest.user_id);

                // Mark request as completed
                await supabase
                  .from('deposit_requests')
                  .update({
                    status: 'completed',
                    tx_hash: txHash,
                    confirmations: confirmations
                  })
                  .eq('id', matchingRequest.id);

                // Record processed deposit
                await supabase
                  .from('processed_deposits')
                  .insert({
                    tx_hash: txHash,
                    currency: 'LTC',
                    amount_crypto: receivedLtc,
                    amount_eur: receivedEur,
                    user_id: matchingRequest.user_id
                  });

                // Create transaction record
                await supabase
                  .from('transactions')
                  .insert({
                    user_id: matchingRequest.user_id,
                    type: 'deposit',
                    amount_btc: receivedLtc, // Using btc field for LTC
                    amount_eur: receivedEur,
                    status: 'completed',
                    btc_tx_hash: txHash,
                    description: `LTC Einzahlung`
                  });

                processedCount++;
                console.log(`✅ Credited ${receivedLtc} LTC to user ${matchingRequest.user_id}`);
                
                // Remove from array
                const idx = ltcRequests.indexOf(matchingRequest);
                if (idx > -1) ltcRequests.splice(idx, 1);
              } else {
                // Unconfirmed - mark as received
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
        }
      } catch (e) {
        console.error('Error checking LTC:', e);
      }
    }

    // Expire old requests
    await supabase
      .from('deposit_requests')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    console.log(`✅ Processed ${processedCount} deposits`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed ${processedCount} deposits`,
      processed: processedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
