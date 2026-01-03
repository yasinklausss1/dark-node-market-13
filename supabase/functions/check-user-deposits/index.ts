import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SATS = 1e8;
// 5% tolerance to account for network fees deducted by sending wallets (e.g., Exodus)
const TOLERANCE_PERCENT = 0.05;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking user deposits...');

    // FIRST: Retry any confirmed deposits that failed balance update
    const { data: failedDeposits } = await supabase
      .from('deposit_requests')
      .select('id, user_id, currency, requested_eur, crypto_amount, tx_hash')
      .eq('status', 'confirmed'); // These are confirmed but balance update failed

    if (failedDeposits && failedDeposits.length > 0) {
      console.log(`Retrying ${failedDeposits.length} failed balance updates...`);
      
      for (const deposit of failedDeposits) {
        try {
          // Check if transaction already exists
          const { data: existingTx } = await supabase
            .from('transactions')
            .select('id, status')
            .eq('btc_tx_hash', deposit.tx_hash)
            .eq('user_id', deposit.user_id)
            .maybeSingle();

          // Create transaction if missing
          if (!existingTx) {
            await supabase.from('transactions').insert({
              user_id: deposit.user_id,
              type: 'deposit',
              amount_eur: deposit.requested_eur,
              amount_btc: deposit.crypto_amount,
              btc_tx_hash: deposit.tx_hash,
              btc_confirmations: 1,
              status: 'completed',
              description: `${deposit.currency} deposit (retry)`
            });
          } else if (existingTx.status === 'pending') {
            await supabase.from('transactions')
              .update({ status: 'completed', btc_confirmations: 1 })
              .eq('id', existingTx.id);
          }

          // Update wallet balance
          const { data: bal } = await supabase
            .from('wallet_balances')
            .select('balance_eur, balance_btc, balance_ltc, balance_btc_deposited, balance_ltc_deposited')
            .eq('user_id', deposit.user_id)
            .maybeSingle();

          if (bal) {
            const updateData: any = {
              balance_eur: Number(bal.balance_eur) + Number(deposit.requested_eur)
            };
            
            if (deposit.currency === 'BTC') {
              updateData.balance_btc = Number(bal.balance_btc) + Number(deposit.crypto_amount);
              updateData.balance_btc_deposited = Number(bal.balance_btc_deposited || 0) + Number(deposit.crypto_amount);
            } else {
              updateData.balance_ltc = Number(bal.balance_ltc) + Number(deposit.crypto_amount);
              updateData.balance_ltc_deposited = Number(bal.balance_ltc_deposited || 0) + Number(deposit.crypto_amount);
            }

            const { error: updateError } = await supabase
              .from('wallet_balances')
              .update(updateData)
              .eq('user_id', deposit.user_id);

            if (!updateError) {
              await supabase
                .from('deposit_requests')
                .update({ status: 'completed' })
                .eq('id', deposit.id);
              console.log(`✅ Retry successful for deposit ${deposit.id}`);
            }
          }
        } catch (err) {
          console.error(`Retry failed for deposit ${deposit.id}:`, err);
        }
      }
    }

    // Get all active user addresses
    const { data: userAddresses, error: addressError } = await supabase
      .from('user_addresses')
      .select('user_id, currency, address')
      .eq('is_active', true);

    if (addressError) throw addressError;

    // Get current crypto prices
    const [btcResponse, ltcResponse] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur'),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=eur')
    ]);

    const btcData = await btcResponse.json();
    const ltcData = await ltcResponse.json();
    const BTC_EUR = btcData.bitcoin.eur as number;
    const LTC_EUR = ltcData.litecoin.eur as number;

    let processedCount = 0;

    // Process each address
    for (const userAddr of userAddresses) {
      try {
        let apiUrl = '';
        let currentPrice = 0;
        
        if (userAddr.currency === 'BTC') {
          apiUrl = `https://mempool.space/api/address/${userAddr.address}/txs`;
          currentPrice = BTC_EUR;
        } else if (userAddr.currency === 'LTC') {
          apiUrl = `https://api.blockcypher.com/v1/ltc/main/addrs/${userAddr.address}/full`;
          currentPrice = LTC_EUR;
        } else {
          continue;
        }

        console.log(`Checking ${userAddr.currency} address: ${userAddr.address}`);

        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.error(`API error for ${userAddr.currency}:`, response.statusText);
          continue;
        }

        let transactions = [];
        
        if (userAddr.currency === 'BTC') {
          transactions = await response.json();
        } else {
          // LTC from BlockCypher
          const data = await response.json();
          transactions = data.txs || [];
        }

        for (const tx of transactions) {
          let amountSats = 0;
          let txHash = tx.hash;

          // Calculate amount received to this address
          if (userAddr.currency === 'BTC') {
            for (const vout of tx.vout || []) {
              if (vout.scriptpubkey_address === userAddr.address) {
                amountSats += vout.value;
              }
            }
          } else {
            // LTC
            for (const output of tx.outputs || []) {
              if (output.addresses && output.addresses.includes(userAddr.address)) {
                amountSats += output.value;
              }
            }
          }

          if (amountSats <= 0) continue;

          const amountCrypto = amountSats / SATS;

          // Check if we already processed this transaction
          const { data: existingTx } = await supabase
            .from('transactions')
            .select('id')
            .eq('btc_tx_hash', txHash)
            .eq('user_id', userAddr.user_id)
            .maybeSingle();

          if (existingTx) continue;

          // Find matching pending deposit request
          // Use percentage tolerance to handle network fees from sending wallets
          const tolerance = amountCrypto * TOLERANCE_PERCENT;
          const now = new Date();

          // Get all pending requests for this user and currency, then filter
          const { data: requests, error: reqErr } = await supabase
            .from('deposit_requests')
            .select('id, user_id, requested_eur, crypto_amount, rate_locked, created_at, expires_at')
            .eq('user_id', userAddr.user_id)
            .eq('currency', userAddr.currency)
            .eq('status', 'pending')
            .gt('expires_at', now.toISOString())
            .order('created_at', { ascending: false });

          if (reqErr) throw reqErr;
          
          // Find request where received amount is within 5% of expected (allowing for fees)
          // Received amount should be <= expected (fees deducted) but >= expected - 5%
          const matchingRequest = requests?.find(req => {
            const expected = req.crypto_amount;
            const minAccepted = expected * (1 - TOLERANCE_PERCENT); // 95% of expected
            const maxAccepted = expected * (1 + 0.01); // Allow 1% overpayment
            return amountCrypto >= minAccepted && amountCrypto <= maxAccepted;
          });

          if (!matchingRequest) continue;

          const request = matchingRequest;

          // Get confirmations
          let confirmations = 0;
          if (userAddr.currency === 'BTC' && tx.status?.confirmed && tx.status.block_height) {
            const tipRes = await fetch('https://mempool.space/api/blocks/tip/height');
            const tip = await tipRes.json();
            confirmations = Math.max(0, tip - tx.status.block_height + 1);
          } else if (userAddr.currency === 'LTC' && tx.confirmations) {
            confirmations = tx.confirmations;
          }

          // Calculate actual EUR value based on received crypto (may be less due to fees)
          // Use the locked rate from the request for consistency
          const actualEur = amountCrypto * request.rate_locked;
          const amountEur = Math.min(actualEur, request.requested_eur); // Don't credit more than requested

          // CRITICAL: If confirmed, do ALL operations atomically before marking as confirmed
          if (confirmations >= 1) {
            // Step 1: Create transaction record FIRST
            const { error: txError } = await supabase.from('transactions').insert({
              user_id: request.user_id,
              type: 'deposit',
              amount_eur: amountEur,
              amount_btc: userAddr.currency === 'BTC' ? amountCrypto : amountCrypto, // Store crypto amount in amount_btc for both
              btc_tx_hash: txHash,
              btc_confirmations: confirmations,
              status: 'completed',
              description: `${userAddr.currency} deposit (individual address)`
            });

            if (txError) {
              console.error(`Failed to create transaction for ${request.id}:`, txError);
              continue; // Skip this one, try again next time
            }

            // Step 2: Update wallet balance
            const { data: bal } = await supabase
              .from('wallet_balances')
              .select('balance_eur, balance_btc, balance_ltc, balance_btc_deposited, balance_ltc_deposited')
              .eq('user_id', request.user_id)
              .maybeSingle();

            let balanceUpdateSuccess = false;

            if (bal) {
              const updateData: any = {
                balance_eur: Number(bal.balance_eur) + amountEur
              };
              
              if (userAddr.currency === 'BTC') {
                updateData.balance_btc = Number(bal.balance_btc) + amountCrypto;
                updateData.balance_btc_deposited = Number(bal.balance_btc_deposited || 0) + amountCrypto;
              } else {
                updateData.balance_ltc = Number(bal.balance_ltc) + amountCrypto;
                updateData.balance_ltc_deposited = Number(bal.balance_ltc_deposited || 0) + amountCrypto;
              }

              const { error: updateError } = await supabase
                .from('wallet_balances')
                .update(updateData)
                .eq('user_id', request.user_id);

              balanceUpdateSuccess = !updateError;
              if (updateError) {
                console.error(`Failed to update balance for ${request.user_id}:`, updateError);
              }
            } else {
              // Create new balance
              const newBalance: any = {
                user_id: request.user_id,
                balance_eur: amountEur,
                balance_btc: 0,
                balance_ltc: 0,
                balance_btc_deposited: 0,
                balance_ltc_deposited: 0
              };

              if (userAddr.currency === 'BTC') {
                newBalance.balance_btc = amountCrypto;
                newBalance.balance_btc_deposited = amountCrypto;
              } else {
                newBalance.balance_ltc = amountCrypto;
                newBalance.balance_ltc_deposited = amountCrypto;
              }

              const { error: insertError } = await supabase
                .from('wallet_balances')
                .insert(newBalance);

              balanceUpdateSuccess = !insertError;
              if (insertError) {
                console.error(`Failed to create balance for ${request.user_id}:`, insertError);
              }
            }

            // Step 3: ONLY mark as completed if balance was updated successfully
            if (balanceUpdateSuccess) {
              await supabase
                .from('deposit_requests')
                .update({
                  status: 'completed', // Use 'completed' to indicate fully processed
                  tx_hash: txHash,
                  confirmations: confirmations
                })
                .eq('id', request.id);

              console.log(`✅ Credited ${amountEur} EUR (${amountCrypto} ${userAddr.currency}) to user ${request.user_id}`);
              processedCount++;
            } else {
              // Mark as confirmed but not completed - will be retried
              await supabase
                .from('deposit_requests')
                .update({
                  status: 'confirmed', // Needs balance update retry
                  tx_hash: txHash,
                  confirmations: confirmations
                })
                .eq('id', request.id);
              
              console.warn(`⚠️ Deposit ${request.id} confirmed but balance update failed - will retry`);
            }
          } else {
            // Not yet confirmed - just mark as received
            await supabase
              .from('deposit_requests')
              .update({
                status: 'received',
                tx_hash: txHash,
                confirmations: confirmations
              })
              .eq('id', request.id);

            // Create pending transaction record
            await supabase.from('transactions').insert({
              user_id: request.user_id,
              type: 'deposit',
              amount_eur: amountEur,
              amount_btc: userAddr.currency === 'BTC' ? amountCrypto : amountCrypto,
              btc_tx_hash: txHash,
              btc_confirmations: confirmations,
              status: 'pending',
              description: `${userAddr.currency} deposit (awaiting confirmation)`
            });
          }
        }
      } catch (error) {
        console.error(`Error processing ${userAddr.currency} address ${userAddr.address}:`, error);
        continue;
      }
    }

    console.log(`Processed ${processedCount} new deposits`);
    return new Response(
      JSON.stringify({ ok: true, processed: processedCount }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Error in check-user-deposits:', e);
    return new Response(
      JSON.stringify({ error: String(e) }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});