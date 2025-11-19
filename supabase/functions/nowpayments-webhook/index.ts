import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-nowpayments-sig',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.text();
    const signature = req.headers.get('x-nowpayments-sig');
    const ipnSecret = Deno.env.get('NOWPAYMENTS_IPN_SECRET');

    console.log('Received webhook from NOWPayments');

    // Verify signature
    if (signature && ipnSecret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(ipnSecret),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign']
      );
      
      const hmac = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      const expectedSignature = Array.from(new Uint8Array(hmac))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (signature !== expectedSignature) {
        console.error('Invalid signature');
        return new Response('Invalid signature', { status: 401, headers: corsHeaders });
      }
    }

    const payload = JSON.parse(body);
    console.log('Webhook payload:', payload);

    const { payment_id, payment_status, order_id } = payload;

    // Find the credit purchase
    const { data: purchase, error: findError } = await supabaseAdmin
      .from('credit_purchases')
      .select('*')
      .eq('payment_id', payment_id)
      .single();

    if (findError || !purchase) {
      console.error('Purchase not found:', payment_id);
      return new Response('Purchase not found', { status: 404, headers: corsHeaders });
    }

    console.log(`Processing payment ${payment_id} with status ${payment_status}`);

    // Update purchase status based on payment status
    let newStatus = 'pending';
    if (payment_status === 'finished' || payment_status === 'confirmed') {
      newStatus = 'completed';
    } else if (payment_status === 'failed' || payment_status === 'refunded') {
      newStatus = 'failed';
    } else if (payment_status === 'expired') {
      newStatus = 'expired';
    }

    // Update purchase
    await supabaseAdmin
      .from('credit_purchases')
      .update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', purchase.id);

    // If payment completed, credit the user
    if (newStatus === 'completed' && purchase.status !== 'completed') {
      console.log(`Crediting ${purchase.credits_amount} credits to user ${purchase.user_id}`);

      // Update wallet balance
      const { error: walletError } = await supabaseAdmin.rpc('get_or_create_wallet_balance', {
        user_uuid: purchase.user_id
      });

      if (walletError) {
        console.error('Error getting wallet:', walletError);
      }

      // Get current balance
      const { data: currentBalance } = await supabaseAdmin
        .from('wallet_balances')
        .select('balance_credits')
        .eq('user_id', purchase.user_id)
        .single();

      const newBalance = (currentBalance?.balance_credits || 0) + purchase.credits_amount;

      const { error: updateError } = await supabaseAdmin
        .from('wallet_balances')
        .update({
          balance_credits: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', purchase.user_id);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        throw updateError;
      }

      // Create transaction record
      await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: purchase.user_id,
          amount: purchase.credits_amount,
          type: 'purchase',
          description: `Purchased ${purchase.credits_amount} credits`,
          related_purchase_id: purchase.id,
        });

      console.log(`Successfully credited ${purchase.credits_amount} credits to user ${purchase.user_id}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in nowpayments-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
