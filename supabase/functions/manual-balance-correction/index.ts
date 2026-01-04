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
    const ltcDelta = Number(addLtc || 0);
    const btcDelta = Number(addBtc || 0);
    const eurDelta = Number(addEur || 0);

    const newLtc = Number(balance.balance_ltc || 0) + ltcDelta;
    const newBtc = Number(balance.balance_btc || 0) + btcDelta;
    const newEur = Number(balance.balance_eur || 0) + eurDelta;

    // Manual corrections should NOT change *_deposited fields (those are for real deposits only)

    // Update balance
    const { error: updateError } = await supabase
      .from('wallet_balances')
      .update({
        balance_ltc: newLtc,
        balance_btc: newBtc,
        balance_eur: newEur,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Create transaction record (store BTC/LTC in correct columns)
    const isOutgoing = (ltcDelta + btcDelta + eurDelta) < 0;

    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        amount_eur: eurDelta,
        amount_btc: btcDelta,
        amount_ltc: ltcDelta,
        btc_tx_hash: txHash || `manual-correction-${Date.now()}`,
        btc_confirmations: 1,
        status: 'completed',
        description: description || 'Manual balance correction',
        transaction_direction: isOutgoing ? 'outgoing' : 'incoming'
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
