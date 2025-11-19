import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use Supabase auto-provided environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the JWT token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT token and get the user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('User not authenticated');
    }

    console.log(`Testing credit webhook for user ${user.id}`);

    // Get user's most recent pending credit purchase
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('credit_purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (purchaseError || !purchase) {
      return new Response(
        JSON.stringify({ 
          error: 'No pending credit purchase found. Please create a purchase first.',
          details: purchaseError?.message 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found purchase ${purchase.id} with ${purchase.credits_amount} credits`);

    // Get balance before
    const { data: balanceBefore } = await supabaseAdmin
      .from('wallet_balances')
      .select('balance_credits')
      .eq('user_id', user.id)
      .single();

    console.log(`Balance before: ${balanceBefore?.balance_credits || 0} credits`);

    // Simulate webhook payload
    const webhookPayload = {
      payment_id: purchase.payment_id,
      payment_status: 'finished',
      order_id: purchase.payment_id,
      pay_amount: purchase.crypto_amount,
      price_amount: purchase.eur_amount,
      price_currency: 'eur',
    };

    // Call the webhook function
    const webhookResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/nowpayments-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify(webhookPayload),
      }
    );

    const webhookResult = await webhookResponse.json();
    console.log('Webhook response:', webhookResult);

    // Wait a moment for the update to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get balance after
    const { data: balanceAfter } = await supabaseAdmin
      .from('wallet_balances')
      .select('balance_credits')
      .eq('user_id', user.id)
      .single();

    // Get updated purchase status
    const { data: updatedPurchase } = await supabaseAdmin
      .from('credit_purchases')
      .select('*')
      .eq('id', purchase.id)
      .single();

    console.log(`Balance after: ${balanceAfter?.balance_credits || 0} credits`);
    console.log(`Purchase status: ${updatedPurchase?.status}`);

    const creditsAdded = (balanceAfter?.balance_credits || 0) - (balanceBefore?.balance_credits || 0);

    return new Response(
      JSON.stringify({
        success: true,
        test_results: {
          purchase_id: purchase.id,
          credits_purchased: purchase.credits_amount,
          balance_before: balanceBefore?.balance_credits || 0,
          balance_after: balanceAfter?.balance_credits || 0,
          credits_added: creditsAdded,
          purchase_status_before: 'pending',
          purchase_status_after: updatedPurchase?.status,
          webhook_response: webhookResult,
          test_passed: creditsAdded === purchase.credits_amount && updatedPurchase?.status === 'completed',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in test-credit-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
