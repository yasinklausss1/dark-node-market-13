import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email }: PasswordResetRequest = await req.json();

    console.log("Password reset requested for email:", email);

    // Check if user exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users.some(u => u.email === email);

    if (!userExists) {
      // Return success even if user doesn't exist (security best practice)
      console.log("User not found, but returning success for security");
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists with this email, a reset code has been sent." }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check rate limiting (max 3 attempts in 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentCodes, error: rateLimitError } = await supabase
      .from("email_verification_codes")
      .select("id")
      .eq("email", email)
      .eq("verification_type", "password_reset")
      .gte("created_at", fifteenMinutesAgo);

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    }

    if (recentCodes && recentCodes.length >= 3) {
      return new Response(
        JSON.stringify({ 
          error: "Too many reset attempts. Please wait 15 minutes before trying again." 
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Store the code
    const { error: insertError } = await supabase
      .from("email_verification_codes")
      .insert({
        email,
        code,
        verification_type: "password_reset",
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        verified: false,
        // These fields are not needed for password reset but required by schema
        username: "password_reset",
        password_hash: "n/a",
        date_of_birth: new Date().toISOString().split('T')[0]
      });

    if (insertError) {
      console.error("Error storing reset code:", insertError);
      throw insertError;
    }

    // Send email with code
    const emailResponse = await resend.emails.send({
      from: "Oracle Market <verify@oracle-market.store>",
      to: [email],
      subject: "Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Password Reset Request</h1>
          <p style="font-size: 16px; color: #666;">
            We received a request to reset your password. Please use the following 4-digit code:
          </p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; font-size: 32px; letter-spacing: 8px; margin: 0;">
              ${code}
            </h2>
          </div>
          <p style="font-size: 14px; color: #666;">
            This code will expire in 15 minutes.
          </p>
          <p style="font-size: 14px; color: #666;">
            If you didn't request a password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "If an account exists with this email, a reset code has been sent."
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset-code function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send reset code. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
