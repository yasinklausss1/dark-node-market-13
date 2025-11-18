import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyCodeRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, code }: VerifyCodeRequest = await req.json();

    console.log("Verifying code for email:", email);

    // Find the verification code (allow already verified codes for retry)
    const { data: verificationData, error: fetchError } = await supabase
      .from("email_verification_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !verificationData) {
      console.error("Invalid or expired code:", fetchError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users.some(u => u.email === verificationData.email);

    let userId = null;

    if (!userExists) {
      // Create the user account
      const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
        email: verificationData.email,
        password: verificationData.password_hash,
        email_confirm: true,
        user_metadata: {
          username: verificationData.username,
          date_of_birth: verificationData.date_of_birth,
          role: "user"
        }
      });

      if (signUpError) {
        console.error("Error creating user:", signUpError);
        return new Response(
          JSON.stringify({ error: signUpError.message }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      userId = authData.user?.id;
      console.log("User created successfully:", userId);
    } else {
      console.log("User already exists, skipping creation");
      userId = existingUser?.users.find(u => u.email === verificationData.email)?.id;
    }

    // Mark code as verified (if not already)
    if (!verificationData.verified) {
      await supabase
        .from("email_verification_codes")
        .update({ verified: true })
        .eq("id", verificationData.id);
    }

    

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Email verified and account created successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-email-code function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
