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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user profile for username
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Check if user already has a referral code
    const { data: existingCode } = await supabaseClient
      .from('referral_codes')
      .select('code')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingCode) {
      return new Response(
        JSON.stringify({
          code: existingCode.code,
          link: `https://oracle-market.store/invite/${profile.username}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique code (8 characters, alphanumeric, no confusing chars)
    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, 1, I
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let code = generateCode();
    let attempts = 0;
    let codeExists = true;

    // Ensure code is unique
    while (codeExists && attempts < 10) {
      const { data } = await supabaseClient
        .from('referral_codes')
        .select('id')
        .eq('code', code)
        .maybeSingle();

      if (!data) {
        codeExists = false;
      } else {
        code = generateCode();
        attempts++;
      }
    }

    // Insert new referral code
    const { error: insertError } = await supabaseClient
      .from('referral_codes')
      .insert({
        user_id: user.id,
        code: code,
      });

    if (insertError) {
      throw insertError;
    }

    console.log(`Generated referral code ${code} for user ${user.id}`);

    return new Response(
      JSON.stringify({
        code: code,
        link: `https://oracle-market.store/invite/${profile.username}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating referral code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
