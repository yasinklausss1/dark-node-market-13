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
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create admin client for verifying JWT
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the JWT and get user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      throw new Error('Not authenticated');
    }

    console.log('User authenticated:', user.id);

    const { creditsAmount } = await req.json();
    
    if (!creditsAmount || creditsAmount <= 0) {
      throw new Error('Invalid credits amount');
    }

    const eurAmount = creditsAmount; // 1 Credit = 1 EUR
    const nowpaymentsApiKey = Deno.env.get('NOWPAYMENTS_API_KEY');

    console.log(`Creating payment for ${creditsAmount} credits (${eurAmount} EUR) for user ${user.id}`);

    // Create payment with NOWPayments
    const paymentResponse = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': nowpaymentsApiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: eurAmount,
        price_currency: 'eur',
        pay_currency: 'btc', // Default to BTC, user can choose on payment page
        ipn_callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/nowpayments-webhook`,
        order_id: crypto.randomUUID(),
        order_description: `${creditsAmount} Credits`,
      }),
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('NOWPayments error:', errorText);
      throw new Error(`Payment creation failed: ${errorText}`);
    }

    const paymentData = await paymentResponse.json();
    console.log('Payment created:', paymentData);

    // Save to database using admin client
    const { data: purchase, error: dbError } = await supabaseAdmin
      .from('credit_purchases')
      .insert({
        user_id: user.id,
        credits_amount: creditsAmount,
        eur_amount: eurAmount,
        payment_provider: 'nowpayments',
        payment_id: paymentData.payment_id,
        payment_url: paymentData.invoice_url,
        crypto_currency: paymentData.pay_currency,
        crypto_amount: paymentData.pay_amount,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('Credit purchase created:', purchase.id);

    return new Response(
      JSON.stringify({
        success: true,
        purchaseId: purchase.id,
        paymentUrl: paymentData.invoice_url,
        paymentId: paymentData.payment_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-credit-purchase:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
