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
    const { userId, addLtc, addBtc, addEur, txHash, description } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current balance
    const { data: balance, error: balError } = await supabase
      .from('wallet_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (balError) throw balError;

    if (!balance) {
      return new Response(
        JSON.stringify({ error: 'User balance not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate new balances
    const newLtc = Number(balance.balance_ltc) + (addLtc || 0);
    const newBtc = Number(balance.balance_btc) + (addBtc || 0);
    const newEur = Number(balance.balance_eur) + (addEur || 0);
    const newLtcDeposited = Number(balance.balance_ltc_deposited || 0) + (addLtc || 0);
    const newBtcDeposited = Number(balance.balance_btc_deposited || 0) + (addBtc || 0);

    // Update balance
    const { error: updateError } = await supabase
      .from('wallet_balances')
      .update({
        balance_ltc: newLtc,
        balance_btc: newBtc,
        balance_eur: newEur,
        balance_ltc_deposited: newLtcDeposited,
        balance_btc_deposited: newBtcDeposited,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Create transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        amount_eur: addEur || 0,
        amount_btc: addLtc || addBtc || 0,
        btc_tx_hash: txHash || `manual-correction-${Date.now()}`,
        btc_confirmations: 1,
        status: 'completed',
        description: description || 'Manual balance correction',
        transaction_direction: 'incoming'
      });

    if (txError) {
      console.error('Transaction insert error:', txError);
    }

    console.log(`✅ Corrected balance for user ${userId}: +${addLtc || 0} LTC, +${addBtc || 0} BTC, +${addEur || 0} EUR`);

    return new Response(
      JSON.stringify({ 
        success: true,
        newBalance: {
          balance_ltc: newLtc,
          balance_btc: newBtc,
          balance_eur: newEur
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Error:', e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
