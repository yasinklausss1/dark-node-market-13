import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Central platform addresses
const CENTRAL_BTC_ADDRESS = '16rmws2YNweEAsbVAV2KauwhFjP2myDfsf';
const CENTRAL_LTC_ADDRESS = 'Lejgj3ZCYryMz4b7ConCzv5wpEHqTZriFy';

interface Transaction {
  txid: string;
  value: number;
  confirmations: number;
  time?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Starting central deposit check...');

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

    // Get all pending deposit memos
    const { data: pendingMemos, error: memosError } = await supabase
      .from('deposit_memos')
      .select('*')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (memosError) {
      console.error('Error fetching pending memos:', memosError);
      throw memosError;
    }

    console.log(`📋 Found ${pendingMemos?.length || 0} pending deposit memos`);

    if (!pendingMemos || pendingMemos.length === 0) {
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
    const btcMemos = pendingMemos.filter(m => m.currency === 'BTC');
    if (btcMemos.length > 0) {
      try {
        console.log(`🔍 Checking BTC address: ${CENTRAL_BTC_ADDRESS}`);
        const btcResponse = await fetch(
          `https://mempool.space/api/address/${CENTRAL_BTC_ADDRESS}/txs`
        );
        
        if (btcResponse.ok) {
          const btcTxs = await btcResponse.json();
          console.log(`📦 Found ${btcTxs.length} BTC transactions`);
          
          for (const tx of btcTxs) {
            // Check if already processed
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
            const receivedEur = receivedBtc * btcPrice;
            const confirmations = tx.status?.confirmed ? 1 : 0;

            console.log(`💸 BTC TX ${tx.txid.substring(0, 16)}...: ${receivedBtc} BTC (${receivedEur.toFixed(2)}€)`);

            // Try to match with a memo (look for memo in OP_RETURN or amount matching)
            // For now, credit to oldest pending BTC memo
            const matchingMemo = btcMemos.find(m => m.status === 'pending');

            if (matchingMemo && confirmations >= 1) {
              console.log(`✅ Matched to memo ${matchingMemo.memo_code} for user ${matchingMemo.user_id}`);
              
              // Update wallet balance
              const { error: balanceError } = await supabase.rpc('get_or_create_wallet_balance', {
                user_uuid: matchingMemo.user_id
              });

              if (!balanceError) {
                await supabase
                  .from('wallet_balances')
                  .update({
                    balance_btc_deposited: supabase.rpc('coalesce', { 
                      value: receivedBtc,
                      fallback: receivedBtc 
                    })
                  })
                  .eq('user_id', matchingMemo.user_id);

                // Direct SQL update for balance
                const { data: currentBalance } = await supabase
                  .from('wallet_balances')
                  .select('balance_btc_deposited')
                  .eq('user_id', matchingMemo.user_id)
                  .single();

                const newBalance = (currentBalance?.balance_btc_deposited || 0) + receivedBtc;
                
                await supabase
                  .from('wallet_balances')
                  .update({ balance_btc_deposited: newBalance })
                  .eq('user_id', matchingMemo.user_id);

                // Mark memo as completed
                await supabase
                  .from('deposit_memos')
                  .update({
                    status: 'completed',
                    tx_hash: tx.txid,
                    amount_received: receivedBtc,
                    rate_at_receive: btcPrice,
                    eur_credited: receivedEur,
                    completed_at: new Date().toISOString()
                  })
                  .eq('id', matchingMemo.id);

                // Record processed deposit
                await supabase
                  .from('processed_deposits')
                  .insert({
                    tx_hash: tx.txid,
                    currency: 'BTC',
                    amount_crypto: receivedBtc,
                    amount_eur: receivedEur,
                    user_id: matchingMemo.user_id,
                    deposit_memo_id: matchingMemo.id
                  });

                // Create transaction record
                await supabase
                  .from('transactions')
                  .insert({
                    user_id: matchingMemo.user_id,
                    type: 'deposit',
                    amount_btc: receivedBtc,
                    amount_eur: receivedEur,
                    status: 'completed',
                    btc_tx_hash: tx.txid,
                    description: `BTC Einzahlung (Memo: ${matchingMemo.memo_code})`
                  });

                processedCount++;
                console.log(`✅ Credited ${receivedBtc} BTC to user ${matchingMemo.user_id}`);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error checking BTC:', e);
      }
    }

    // Check LTC transactions
    const ltcMemos = pendingMemos.filter(m => m.currency === 'LTC');
    if (ltcMemos.length > 0) {
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
            const receivedEur = receivedLtc * ltcPrice;
            const confirmations = txRef.confirmations || 0;

            console.log(`💸 LTC TX ${txHash.substring(0, 16)}...: ${receivedLtc} LTC (${receivedEur.toFixed(2)}€)`);

            // Match to oldest pending LTC memo
            const matchingMemo = ltcMemos.find(m => m.status === 'pending');

            if (matchingMemo && confirmations >= 1) {
              console.log(`✅ Matched to memo ${matchingMemo.memo_code} for user ${matchingMemo.user_id}`);
              
              // Get current balance
              const { data: currentBalance } = await supabase
                .from('wallet_balances')
                .select('balance_ltc_deposited')
                .eq('user_id', matchingMemo.user_id)
                .single();

              const newBalance = (currentBalance?.balance_ltc_deposited || 0) + receivedLtc;
              
              await supabase
                .from('wallet_balances')
                .update({ balance_ltc_deposited: newBalance })
                .eq('user_id', matchingMemo.user_id);

              // Mark memo as completed
              await supabase
                .from('deposit_memos')
                .update({
                  status: 'completed',
                  tx_hash: txHash,
                  amount_received: receivedLtc,
                  rate_at_receive: ltcPrice,
                  eur_credited: receivedEur,
                  completed_at: new Date().toISOString()
                })
                .eq('id', matchingMemo.id);

              // Record processed deposit
              await supabase
                .from('processed_deposits')
                .insert({
                  tx_hash: txHash,
                  currency: 'LTC',
                  amount_crypto: receivedLtc,
                  amount_eur: receivedEur,
                  user_id: matchingMemo.user_id,
                  deposit_memo_id: matchingMemo.id
                });

              // Create transaction record
              await supabase
                .from('transactions')
                .insert({
                  user_id: matchingMemo.user_id,
                  type: 'deposit',
                  amount_btc: receivedLtc, // Using btc field for LTC amount too
                  amount_eur: receivedEur,
                  status: 'completed',
                  btc_tx_hash: txHash,
                  description: `LTC Einzahlung (Memo: ${matchingMemo.memo_code})`
                });

              processedCount++;
              console.log(`✅ Credited ${receivedLtc} LTC to user ${matchingMemo.user_id}`);
              
              // Remove from array to not match again
              const idx = ltcMemos.indexOf(matchingMemo);
              if (idx > -1) ltcMemos.splice(idx, 1);
            }
          }
        }
      } catch (e) {
        console.error('Error checking LTC:', e);
      }
    }

    // Expire old memos
    await supabase
      .from('deposit_memos')
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
