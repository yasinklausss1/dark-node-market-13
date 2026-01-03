import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { depositRequestId } = await req.json();

    if (!depositRequestId) {
      return new Response(
        JSON.stringify({ error: 'depositRequestId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fixing deposit balance for request: ${depositRequestId}`);

    // Get the deposit request
    const { data: deposit, error: depositError } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('id', depositRequestId)
      .single();

    if (depositError || !deposit) {
      return new Response(
        JSON.stringify({ error: 'Deposit request not found', details: depositError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (deposit.status !== 'confirmed') {
      return new Response(
        JSON.stringify({ error: 'Deposit not confirmed', status: deposit.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if transaction already exists
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('btc_tx_hash', deposit.tx_hash)
      .eq('user_id', deposit.user_id)
      .maybeSingle();

    if (existingTx) {
      return new Response(
        JSON.stringify({ error: 'Transaction already processed', transactionId: existingTx.id }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallet_balances')
      .select('*')
      .eq('user_id', deposit.user_id)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found', details: walletError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the transaction record
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: deposit.user_id,
      type: 'deposit',
      amount_eur: deposit.requested_eur,
      amount_btc: deposit.currency === 'BTC' ? deposit.crypto_amount : deposit.crypto_amount,
      btc_tx_hash: deposit.tx_hash,
      btc_confirmations: deposit.confirmations,
      status: 'completed',
      description: `${deposit.currency} Einzahlung (Korrektur)`,
      transaction_direction: 'incoming'
    });

    if (txError) {
      console.error('Failed to create transaction:', txError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction', details: txError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update wallet balance
    const updateData: any = {
      balance_eur: Number(wallet.balance_eur) + Number(deposit.requested_eur),
      updated_at: new Date().toISOString()
    };

    if (deposit.currency === 'BTC') {
      updateData.balance_btc = Number(wallet.balance_btc) + Number(deposit.crypto_amount);
      updateData.balance_btc_deposited = Number(wallet.balance_btc_deposited || 0) + Number(deposit.crypto_amount);
    } else if (deposit.currency === 'LTC') {
      updateData.balance_ltc = Number(wallet.balance_ltc) + Number(deposit.crypto_amount);
      updateData.balance_ltc_deposited = Number(wallet.balance_ltc_deposited || 0) + Number(deposit.crypto_amount);
    }

    const { error: updateError } = await supabase
      .from('wallet_balances')
      .update(updateData)
      .eq('user_id', deposit.user_id);

    if (updateError) {
      console.error('Failed to update wallet:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update wallet', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update deposit request status to 'completed'
    await supabase
      .from('deposit_requests')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', depositRequestId);

    console.log(`Successfully fixed deposit for user ${deposit.user_id}: ${deposit.crypto_amount} ${deposit.currency} (${deposit.requested_eur} EUR)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Credited ${deposit.crypto_amount} ${deposit.currency} (${deposit.requested_eur} EUR) to wallet`,
        newBalance: updateData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('Error in fix-deposit-balance:', e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
