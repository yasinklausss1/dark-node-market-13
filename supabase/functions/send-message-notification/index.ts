import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MessageNotificationRequest {
  userEmail: string;
  senderUsername: string;
  messagePreview: string;
  conversationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, senderUsername, messagePreview, conversationId }: MessageNotificationRequest = await req.json();

    console.log("Sending message notification to:", userEmail);

    const emailResponse = await resend.emails.send({
      from: "Oracle Market <messages@oracle-market.store>",
      to: [userEmail],
      subject: `New Message from ${senderUsername}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Message</h1>
          <p style="font-size: 16px; color: #666;">
            You have received a new message from <strong>${senderUsername}</strong>.
          </p>
          
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic; color: #555;">"${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}"</p>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            Click below to view and reply to this message.
          </p>
          
          <div style="margin: 30px 0;">
            <a href="https://oracle-market.store/messages?conversation=${conversationId}" 
               style="display: inline-block; padding: 12px 24px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Message
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Best regards,<br>
            Oracle Market Team
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-message-notification function:", error);
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
