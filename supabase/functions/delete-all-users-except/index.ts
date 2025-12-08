import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const KEEP_USER_ID = '0af916bb-1c03-4173-a898-fd4274ae4a2b' // ADMkz

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client for auth verification
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // SECURITY: Verify the caller is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - No token provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Admin verified, starting deletion of all users except ADMkz...')

    // Get all users from auth
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return new Response(JSON.stringify({ error: 'Failed to list users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const usersToDelete = authUsers.users.filter(user => user.id !== KEEP_USER_ID)
    console.log(`Found ${usersToDelete.length} users to delete (keeping ADMkz)`)

    let deleted = 0
    let errors = 0

    for (const user of usersToDelete) {
      try {
        // Delete profile first
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('user_id', user.id)

        // Delete auth user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
        
        if (deleteError) {
          console.error(`Error deleting user ${user.id}:`, deleteError)
          errors++
        } else {
          console.log(`Deleted user: ${user.id}`)
          deleted++
        }
      } catch (err) {
        console.error(`Error processing user ${user.id}:`, err)
        errors++
      }
    }

    console.log(`Deletion complete. Deleted: ${deleted}, Errors: ${errors}`)

    return new Response(JSON.stringify({ 
      success: true, 
      deleted, 
      errors,
      kept: 'ADMkz'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in delete-all-users-except:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})