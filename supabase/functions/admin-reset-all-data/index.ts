import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_USER_ID = '0af916bb-1c03-4173-a898-fd4274ae4a2b';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.id !== ADMIN_USER_ID) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🧹 Admin reset initiated by:', user.id);

    // Reset all wallet balances
    const { error: walletError } = await supabase
      .from('wallet_balances')
      .update({
        balance_btc: 0,
        balance_ltc: 0,
        balance_eur: 0,
        balance_eth: 0,
        balance_xmr: 0,
        balance_btc_deposited: 0,
        balance_ltc_deposited: 0,
        balance_eth_deposited: 0,
        balance_xmr_deposited: 0,
        balance_credits: 0
      })
      .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    if (walletError) {
      console.error('Error resetting wallets:', walletError);
    } else {
      console.log('✅ All wallet balances reset to 0');
    }

    // Delete all transactions
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (txError) {
      console.error('Error deleting transactions:', txError);
    } else {
      console.log('✅ All transactions deleted');
    }

    // Delete all processed deposits
    const { error: pdError } = await supabase
      .from('processed_deposits')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (pdError) {
      console.error('Error deleting processed_deposits:', pdError);
    } else {
      console.log('✅ All processed deposits deleted');
    }

    // Delete all deposit requests
    const { error: drError } = await supabase
      .from('deposit_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (drError) {
      console.error('Error deleting deposit_requests:', drError);
    } else {
      console.log('✅ All deposit requests deleted');
    }

    // Delete all withdrawal requests
    const { error: wrError } = await supabase
      .from('withdrawal_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (wrError) {
      console.error('Error deleting withdrawal_requests:', wrError);
    } else {
      console.log('✅ All withdrawal requests deleted');
    }

    // Delete credit withdrawals
    const { error: cwError } = await supabase
      .from('credit_withdrawals')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (cwError) {
      console.error('Error deleting credit_withdrawals:', cwError);
    } else {
      console.log('✅ All credit withdrawals deleted');
    }

    // Delete credit transactions
    const { error: ctError } = await supabase
      .from('credit_transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (ctError) {
      console.error('Error deleting credit_transactions:', ctError);
    } else {
      console.log('✅ All credit transactions deleted');
    }

    console.log('🎉 All data reset complete');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'All balances and transactions reset to 0'
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
