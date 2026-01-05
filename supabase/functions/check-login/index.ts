import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_HOURS = 24;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get client IP from headers
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

    const { action, username, password } = await req.json();

    // Check if IP is blocked
    const { data: blockedIp } = await supabaseAdmin
      .from('blocked_ips')
      .select('*')
      .eq('ip_address', ip)
      .maybeSingle();

    if (blockedIp) {
      // Check if block has expired
      if (blockedIp.blocked_until && new Date(blockedIp.blocked_until) < new Date()) {
        // Remove expired block
        await supabaseAdmin.from('blocked_ips').delete().eq('ip_address', ip);
      } else {
        console.log(`Blocked IP attempted login: ${ip}`);
        return new Response(
          JSON.stringify({ 
            error: 'IP blockiert', 
            message: 'Zu viele fehlgeschlagene Anmeldeversuche. Versuche es später erneut.',
            blocked: true 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'check') {
      // Just check if IP is blocked
      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'login') {
      // Try to login
      const email = `${username}@example.com`;
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Record failed attempt
        await supabaseAdmin.from('login_attempts').insert({
          ip_address: ip,
          username,
          success: false,
        });

        // Count recent failed attempts (last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await supabaseAdmin
          .from('login_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('ip_address', ip)
          .eq('success', false)
          .gte('attempted_at', oneHourAgo);

        console.log(`Failed login attempt from ${ip} for user ${username}. Attempts: ${count}`);

        if (count && count >= MAX_ATTEMPTS) {
          // Block the IP
          const blockedUntil = new Date(Date.now() + BLOCK_DURATION_HOURS * 60 * 60 * 1000).toISOString();
          
          await supabaseAdmin.from('blocked_ips').upsert({
            ip_address: ip,
            blocked_until: blockedUntil,
            reason: `${MAX_ATTEMPTS} failed login attempts`,
          }, { onConflict: 'ip_address' });

          console.log(`IP ${ip} has been blocked until ${blockedUntil}`);

          return new Response(
            JSON.stringify({ 
              error: 'IP blockiert', 
              message: 'Zu viele fehlgeschlagene Anmeldeversuche. Deine IP wurde für 24 Stunden blockiert.',
              blocked: true 
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const remainingAttempts = MAX_ATTEMPTS - (count || 0);
        return new Response(
          JSON.stringify({ 
            error: authError.message,
            remainingAttempts,
            message: `Falsches Passwort. Noch ${remainingAttempts} Versuche übrig.`
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Successful login - record it
      await supabaseAdmin.from('login_attempts').insert({
        ip_address: ip,
        username,
        success: true,
      });

      console.log(`Successful login from ${ip} for user ${username}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          session: authData.session,
          user: authData.user
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-login:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
