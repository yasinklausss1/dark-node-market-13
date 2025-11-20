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

    // Extract JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    // Create client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );

    // Get authenticated user (the new user who just signed up)
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

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

    // Use service role key for atomic operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get referrer's LATEST referral code
    const { data: referralCodes, error: codeError } = await supabaseAdmin
      .from('referral_codes')
      .select('id, code, uses_count')
      .eq('user_id', referrerProfile.user_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (codeError || !referralCodes || referralCodes.length === 0) {
      console.error('Referral code not found:', codeError);
      throw new Error('Referral code not found');
    }

    const referralCode = referralCodes[0];

    // ATOMIC: Try to increment uses_count ONLY if it's still below 3
    // This prevents race conditions when multiple people use the link simultaneously
    const { data: updatedCode, error: updateError } = await supabaseAdmin
      .from('referral_codes')
      .update({ uses_count: referralCode.uses_count + 1 })
      .eq('id', referralCode.id)
      .eq('uses_count', referralCode.uses_count) // Only update if count hasn't changed
      .lt('uses_count', 3) // Only if still below limit
      .select('uses_count')
      .single();

    if (updateError || !updatedCode) {
      console.error('Failed to increment referral code - limit reached or race condition:', updateError);
      throw new Error('This referral code has reached its maximum usage limit');
    }

    console.log(`Incremented uses_count to ${updatedCode.uses_count} for code ${referralCode.code}`);

    // Create referral reward entry
    const { error: rewardError } = await supabaseAdmin
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
      // Rollback the increment if reward creation fails
      await supabaseAdmin
        .from('referral_codes')
        .update({ uses_count: referralCode.uses_count })
        .eq('id', referralCode.id);
      throw rewardError;
    }

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

    console.log(`Successfully processed referral: ${referrerProfile.username} -> ${user.email} (uses: ${updatedCode.uses_count}/3)`);

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
