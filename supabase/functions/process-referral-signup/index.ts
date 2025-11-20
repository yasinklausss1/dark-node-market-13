import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referrerUsername } = await req.json();

    if (!referrerUsername) {
      throw new Error('Referrer username is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user (the new user who just signed up)
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get referrer profile by username
    const { data: referrerProfile, error: referrerError } = await supabaseClient
      .from('profiles')
      .select('user_id, username')
      .eq('username', referrerUsername)
      .maybeSingle();

    if (referrerError || !referrerProfile) {
      throw new Error('Referrer not found');
    }

    // Prevent self-referral
    if (referrerProfile.user_id === user.id) {
      throw new Error('Cannot refer yourself');
    }

    // Check if user already has been referred
    const { data: existingReward } = await supabaseClient
      .from('referral_rewards')
      .select('id')
      .eq('referred_id', user.id)
      .maybeSingle();

    if (existingReward) {
      throw new Error('User has already been referred');
    }

    // Get referrer's referral code
    const { data: referralCode, error: codeError } = await supabaseClient
      .from('referral_codes')
      .select('code')
      .eq('user_id', referrerProfile.user_id)
      .maybeSingle();

    if (codeError || !referralCode) {
      throw new Error('Referral code not found');
    }

    // Create referral reward entry
    const { error: rewardError } = await supabaseClient
      .from('referral_rewards')
      .insert({
        referrer_id: referrerProfile.user_id,
        referred_id: user.id,
        referral_code: referralCode.code,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

    if (rewardError) {
      throw rewardError;
    }

    // Add 3 credits to both users
    const { error: referrerBalanceError } = await supabaseClient
      .from('wallet_balances')
      .update({
        balance_credits: supabaseClient.rpc('increment', { x: 3 }),
      })
      .eq('user_id', referrerProfile.user_id);

    if (referrerBalanceError) {
      console.error('Error updating referrer balance:', referrerBalanceError);
    }

    const { error: referredBalanceError } = await supabaseClient
      .from('wallet_balances')
      .update({
        balance_credits: supabaseClient.rpc('increment', { x: 3 }),
      })
      .eq('user_id', user.id);

    if (referredBalanceError) {
      console.error('Error updating referred balance:', referredBalanceError);
    }

    // Create credit transactions for transparency
    await supabaseClient.from('credit_transactions').insert([
      {
        user_id: referrerProfile.user_id,
        amount: 3,
        type: 'referral_reward',
        description: `Referral reward for inviting ${user.email}`,
      },
      {
        user_id: user.id,
        amount: 3,
        type: 'referral_bonus',
        description: `Welcome bonus from referral by ${referrerProfile.username}`,
      },
    ]);

    // Update referral code usage count
    await supabaseClient
      .from('referral_codes')
      .update({
        uses_count: supabaseClient.rpc('increment', { x: 1 }),
      })
      .eq('user_id', referrerProfile.user_id);

    console.log(`Processed referral: ${referrerProfile.username} -> ${user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Referral processed successfully. Both users received 3 credits!',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing referral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
