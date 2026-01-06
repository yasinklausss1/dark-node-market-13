import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_USER_ID = '0af916bb-1c03-4173-a898-fd4274ae4a2b';
const MIN_SWEEP_BTC = 0.00005; // Minimum BTC to sweep (covers network fees)
const MIN_SWEEP_LTC = 0.001;   // Minimum LTC to sweep

// Decryption utility - same as other functions
async function decryptPrivateKey(encryptedKey: string, encryptionKey: string): Promise<string> {
  const decoder = new TextDecoder();
  const keyData = new TextEncoder().encode(encryptionKey.slice(0, 32).padEnd(32, '0'));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const encryptedBytes = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
  const iv = encryptedBytes.slice(0, 12);
  const data = encryptedBytes.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  return decoder.decode(decrypted);
}

// Get address balance via Tatum
async function getAddressBalance(currency: string, address: string, tatumApiKey: string): Promise<number> {
  try {
    const chain = currency === 'BTC' ? 'bitcoin' : 'litecoin';
    const response = await fetch(`https://api.tatum.io/v3/${chain}/address/balance/${address}`, {
      headers: { 'x-api-key': tatumApiKey }
    });
    
    if (!response.ok) {
      console.log(`   ⚠️ Balance check failed for ${address.substring(0, 16)}...: ${response.status}`);
      return 0;
    }
    
    const data = await response.json();
    // Tatum returns incoming - outgoing as available balance
    const balance = parseFloat(data.incoming || '0') - parseFloat(data.outgoing || '0');
    return balance > 0 ? balance : 0;
  } catch (error) {
    console.error(`Error fetching ${currency} balance for ${address}:`, error);
    return 0;
  }
}

// Get UTXOs for an address via Tatum
async function getAddressUTXOs(currency: string, address: string, tatumApiKey: string): Promise<any[]> {
  try {
    const chain = currency === 'BTC' ? 'bitcoin' : 'litecoin';
    const response = await fetch(`https://api.tatum.io/v3/data/utxos?chain=${chain}&address=${address}&totalValue=999999`, {
      headers: { 'x-api-key': tatumApiKey }
    });
    
    if (!response.ok) {
      // Fallback to transaction-based UTXO detection
      console.log(`   ⚠️ UTXO endpoint unavailable, using transaction endpoint`);
      return [];
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error(`Error fetching UTXOs for ${address}:`, error);
    return [];
  }
}

// Send sweep transaction via Tatum
async function sendSweepTransaction(
  currency: string,
  fromAddress: string,
  toAddress: string,
  privateKeyWIF: string,
  tatumApiKey: string
): Promise<{ txId: string; amount: number } | null> {
  const chain = currency === 'BTC' ? 'bitcoin' : 'litecoin';
  
  // First get the current balance
  const balance = await getAddressBalance(currency, fromAddress, tatumApiKey);
  
  if (balance <= 0) {
    console.log(`   ⏭️ No balance to sweep from ${fromAddress.substring(0, 16)}...`);
    return null;
  }

  const minSweep = currency === 'BTC' ? MIN_SWEEP_BTC : MIN_SWEEP_LTC;
  if (balance < minSweep) {
    console.log(`   ⏭️ Balance ${balance} ${currency} below minimum sweep threshold ${minSweep}`);
    return null;
  }

  // Estimate network fee (conservative estimate)
  const estimatedFee = currency === 'BTC' ? 0.00003 : 0.0001; // ~3000 sats for BTC, 10000 litoshi for LTC
  const sendAmount = balance - estimatedFee;

  if (sendAmount <= 0) {
    console.log(`   ⏭️ Balance too low after fee deduction`);
    return null;
  }

  console.log(`   📤 Sweeping ${sendAmount.toFixed(8)} ${currency} from ${fromAddress.substring(0, 16)}... to pool`);
  
  try {
    // Use Tatum's transaction endpoint
    const response = await fetch(`https://api.tatum.io/v3/${chain}/transaction`, {
      method: 'POST',
      headers: {
        'x-api-key': tatumApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fromAddress: [{
          address: fromAddress,
          privateKey: privateKeyWIF
        }],
        to: [{
          address: toAddress,
          value: sendAmount
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error(`   ❌ Tatum sweep error:`, errorData);
      return null;
    }

    const result = await response.json();
    console.log(`   ✅ Sweep TX: ${result.txId}`);
    return { txId: result.txId, amount: sendAmount };
  } catch (error) {
    console.error(`   ❌ Sweep transaction failed:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tatumApiKey = Deno.env.get('TATUM_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧹 Starting deposit sweep process...');
    console.log(`   Timestamp: ${new Date().toISOString()}`);

    // Get pool addresses
    const { data: poolAddresses, error: poolError } = await supabase
      .from('admin_fee_addresses')
      .select('currency, address, balance')
      .eq('admin_user_id', ADMIN_USER_ID);

    if (poolError || !poolAddresses?.length) {
      throw new Error('Pool addresses not configured');
    }

    const btcPoolAddress = poolAddresses.find(p => p.currency === 'BTC')?.address;
    const ltcPoolAddress = poolAddresses.find(p => p.currency === 'LTC')?.address;

    if (!btcPoolAddress || !ltcPoolAddress) {
      throw new Error('Missing BTC or LTC pool address');
    }

    console.log(`   BTC Pool: ${btcPoolAddress}`);
    console.log(`   LTC Pool: ${ltcPoolAddress}`);

    // Get completed deposits that haven't been swept yet
    // We track this by adding a 'swept_at' column or by checking if balance remains
    const { data: completedDeposits, error: depositError } = await supabase
      .from('deposit_addresses')
      .select('*')
      .eq('status', 'completed')
      .is('swept_at', null) // Only deposits not yet swept
      .not('private_key_encrypted', 'is', null)
      .order('confirmed_at', { ascending: true })
      .limit(20); // Process 20 at a time to avoid timeouts

    if (depositError) {
      console.error('Error fetching deposits:', depositError);
      throw depositError;
    }

    console.log(`📋 Found ${completedDeposits?.length || 0} deposits to potentially sweep`);

    if (!completedDeposits || completedDeposits.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No deposits to sweep',
        swept: 0,
        totalBtc: 0,
        totalLtc: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const encryptionKey = supabaseServiceKey;
    let sweptCount = 0;
    let totalBtcSwept = 0;
    let totalLtcSwept = 0;
    const sweepResults: Array<{ depositId: string; txId: string; amount: number; currency: string }> = [];

    // Process each deposit
    for (const deposit of completedDeposits) {
      console.log(`\n🔍 Processing deposit ${deposit.id.substring(0, 8)}...`);
      console.log(`   Currency: ${deposit.currency}, Address: ${deposit.address.substring(0, 20)}...`);

      // Check if there's actually balance to sweep
      const currentBalance = await getAddressBalance(deposit.currency, deposit.address, tatumApiKey);
      
      if (currentBalance <= 0) {
        console.log(`   ⏭️ No balance remaining, marking as swept`);
        await supabase
          .from('deposit_addresses')
          .update({ swept_at: new Date().toISOString() })
          .eq('id', deposit.id);
        continue;
      }

      console.log(`   💰 Current balance: ${currentBalance.toFixed(8)} ${deposit.currency}`);

      // Decrypt private key
      let privateKeyWIF: string;
      try {
        privateKeyWIF = await decryptPrivateKey(deposit.private_key_encrypted, encryptionKey);
      } catch (decryptError) {
        console.error(`   ❌ Failed to decrypt key for deposit ${deposit.id}:`, decryptError);
        continue;
      }

      // Determine target pool address
      const poolAddress = deposit.currency === 'BTC' ? btcPoolAddress : ltcPoolAddress;

      // Execute sweep
      const result = await sendSweepTransaction(
        deposit.currency,
        deposit.address,
        poolAddress,
        privateKeyWIF,
        tatumApiKey
      );

      if (result) {
        // Update deposit as swept
        await supabase
          .from('deposit_addresses')
          .update({ 
            swept_at: new Date().toISOString(),
            sweep_tx_hash: result.txId,
            swept_amount: result.amount
          })
          .eq('id', deposit.id);

        // Update pool balance in database
        const { data: currentPool } = await supabase
          .from('admin_fee_addresses')
          .select('balance')
          .eq('currency', deposit.currency)
          .eq('admin_user_id', ADMIN_USER_ID)
          .single();

        const newPoolBalance = (currentPool?.balance || 0) + result.amount;
        await supabase
          .from('admin_fee_addresses')
          .update({ balance: newPoolBalance })
          .eq('currency', deposit.currency)
          .eq('admin_user_id', ADMIN_USER_ID);

        // Record sweep transaction in processed_deposits or a new table
        await supabase
          .from('transactions')
          .insert({
            user_id: ADMIN_USER_ID,
            type: 'sweep',
            amount_btc: deposit.currency === 'BTC' ? result.amount : 0,
            amount_ltc: deposit.currency === 'LTC' ? result.amount : 0,
            amount_eur: 0, // Will be calculated dynamically when displayed
            status: 'completed',
            btc_tx_hash: result.txId,
            description: `Sweep from ${deposit.address.substring(0, 12)}... to pool`
          });

        sweepResults.push({
          depositId: deposit.id,
          txId: result.txId,
          amount: result.amount,
          currency: deposit.currency
        });

        sweptCount++;
        if (deposit.currency === 'BTC') {
          totalBtcSwept += result.amount;
        } else {
          totalLtcSwept += result.amount;
        }

        console.log(`   ✅ Successfully swept ${result.amount.toFixed(8)} ${deposit.currency}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ Sweep complete!`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Swept: ${sweptCount} deposits`);
    console.log(`   Total BTC: ${totalBtcSwept.toFixed(8)}`);
    console.log(`   Total LTC: ${totalLtcSwept.toFixed(8)}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Swept ${sweptCount} deposits`,
      swept: sweptCount,
      totalBtc: totalBtcSwept,
      totalLtc: totalLtcSwept,
      results: sweepResults,
      duration: duration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Sweep error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
