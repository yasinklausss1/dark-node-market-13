import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse User-Agent to extract browser, OS, and device type
function parseUserAgent(ua: string | null): { browser: string; os: string; deviceType: string } {
  if (!ua) {
    return { browser: 'Unknown', os: 'Unknown', deviceType: 'unknown' };
  }

  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';
  else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'IE';

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  // Detect device type
  let deviceType = 'desktop';
  if (ua.includes('Mobile') || ua.includes('Android') && !ua.includes('Tablet')) {
    deviceType = 'mobile';
  } else if (ua.includes('Tablet') || ua.includes('iPad')) {
    deviceType = 'tablet';
  }

  return { browser, os, deviceType };
}

// Simple rate limiting - check if IP visited in last 5 seconds
async function shouldTrack(supabase: any, ip: string): Promise<boolean> {
  const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
  
  const { data, error } = await supabase
    .from('page_visits')
    .select('id')
    .eq('ip_address', ip)
    .gte('visited_at', fiveSecondsAgo)
    .limit(1);
  
  if (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow on error
  }
  
  return data.length === 0;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get IP address from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || req.headers.get('cf-connecting-ip')
      || 'unknown';

    // Rate limiting check
    const canTrack = await shouldTrack(supabase, ip);
    if (!canTrack) {
      console.log(`Rate limited IP: ${ip}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Already tracked recently' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { page = '/auth', referrer = null, sessionId = null, userId = null } = body;

    // Parse user agent
    const userAgent = req.headers.get('user-agent');
    const { browser, os, deviceType } = parseUserAgent(userAgent);

    // Check if IP has many visits (suspicious activity)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentVisits } = await supabase
      .from('page_visits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('visited_at', oneHourAgo);

    const isSuspicious = (recentVisits || 0) > 20;

    // Insert visit record
    const { error: insertError } = await supabase
      .from('page_visits')
      .insert({
        ip_address: ip,
        user_agent: userAgent,
        page: page,
        browser: browser,
        os: os,
        device_type: deviceType,
        referrer: referrer,
        session_id: sessionId,
        is_suspicious: isSuspicious,
        user_id: userId,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log(`Tracked visit from IP: ${ip}, Browser: ${browser}, OS: ${os}, Device: ${deviceType}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tracked: {
          ip: ip.substring(0, 10) + '...',
          browser,
          os,
          deviceType
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Track visitor error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
