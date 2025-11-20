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

    // Create client with user's auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user (the new user who just signed up)
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log('Processing referral for new user:', user.id);

    // Get referrer profile by username
    const { data: referrerProfile, error: referrerError } = await supabaseClient
      .from('profiles')
      .select('user_id, username')
      .eq('username', referrerUsername)
      .maybeSingle();

    if (referrerError || !referrerProfile) {
      console.error('Referrer not found:', referrerError);
      throw new Error('Referrer not found');
    }

    console.log('Found referrer:', referrerProfile.username);

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

    // Get referrer's referral code and check usage limit
    const { data: referralCode, error: codeError } = await supabaseClient
      .from('referral_codes')
      .select('code, uses_count')
      .eq('user_id', referrerProfile.user_id)
      .maybeSingle();

    if (codeError || !referralCode) {
      console.error('Referral code not found:', codeError);
      throw new Error('Referral code not found');
    }

    // Check if referral code has reached its limit (3 uses)
    if (referralCode.uses_count >= 3) {
      throw new Error('This referral code has reached its maximum usage limit');
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
      console.error('Reward insert error:', rewardError);
      throw rewardError;
    }

    // Use service role key for updating balances
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current balances
    const { data: referrerBalance } = await supabaseAdmin
      .from('wallet_balances')
      .select('balance_credits')
      .eq('user_id', referrerProfile.user_id)
      .single();

    const { data: referredBalance } = await supabaseAdmin
      .from('wallet_balances')
      .select('balance_credits')
      .eq('user_id', user.id)
      .single();

    // Add 3 credits to both users
    await supabaseAdmin
      .from('wallet_balances')
      .update({
        balance_credits: (referrerBalance?.balance_credits || 0) + 3,
      })
      .eq('user_id', referrerProfile.user_id);

    await supabaseAdmin
      .from('wallet_balances')
      .update({
        balance_credits: (referredBalance?.balance_credits || 0) + 3,
      })
      .eq('user_id', user.id);

    // Create credit transactions for transparency
    await supabaseAdmin.from('credit_transactions').insert([
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
    const { data: codeData } = await supabaseAdmin
      .from('referral_codes')
      .select('uses_count')
      .eq('user_id', referrerProfile.user_id)
      .single();

    await supabaseAdmin
      .from('referral_codes')
      .update({
        uses_count: (codeData?.uses_count || 0) + 1,
      })
      .eq('user_id', referrerProfile.user_id);

    console.log(`Successfully processed referral: ${referrerProfile.username} -> ${user.email}`);

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
