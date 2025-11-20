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
    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting cleanup of old referral codes...');

    // Get all users with multiple codes
    const { data: allCodes, error: fetchError } = await supabaseAdmin
      .from('referral_codes')
      .select('id, user_id, code, created_at, uses_count')
      .order('user_id')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    if (!allCodes || allCodes.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No codes found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group codes by user_id and keep only the latest
    const userCodesMap = new Map<string, typeof allCodes>();
    
    for (const code of allCodes) {
      if (!userCodesMap.has(code.user_id)) {
        userCodesMap.set(code.user_id, []);
      }
      userCodesMap.get(code.user_id)!.push(code);
    }

    let totalDeleted = 0;
    const deletedByUser: Record<string, number> = {};

    // For each user, delete all codes except the latest one
    for (const [userId, codes] of userCodesMap) {
      if (codes.length > 1) {
        // Keep the first one (latest), delete the rest
        const latestCode = codes[0];
        const oldCodes = codes.slice(1);
        
        console.log(`User ${userId}: Keeping code ${latestCode.code} (uses: ${latestCode.uses_count}), deleting ${oldCodes.length} old codes`);
        
        const idsToDelete = oldCodes.map(c => c.id);
        
        const { error: deleteError } = await supabaseAdmin
          .from('referral_codes')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error(`Error deleting codes for user ${userId}:`, deleteError);
        } else {
          totalDeleted += idsToDelete.length;
          deletedByUser[userId] = idsToDelete.length;
        }
      }
    }

    console.log(`Cleanup complete. Deleted ${totalDeleted} old codes from ${Object.keys(deletedByUser).length} users`);

    return new Response(
      JSON.stringify({ 
        success: true,
        totalDeleted,
        usersAffected: Object.keys(deletedByUser).length,
        details: deletedByUser
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error cleaning up referral codes:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
