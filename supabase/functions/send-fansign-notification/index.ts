import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FansignNotificationRequest {
  userEmail: string;
  orderId: string;
  productTitle: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, orderId, productTitle }: FansignNotificationRequest = await req.json();

    console.log("Sending fansign notification to:", userEmail);

    const emailResponse = await resend.emails.send({
      from: "Oracle Market <orders@oracle-market.store>",
      to: [userEmail],
      subject: `Fansign Uploaded - Order #${orderId.substring(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Fansign Image Uploaded</h1>
          <p style="font-size: 16px; color: #666;">
            Great news! The seller has uploaded the fansign image for your order.
          </p>
          
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Order Details</h2>
            <p style="margin: 5px 0;"><strong>Order ID:</strong> #${orderId.substring(0, 8)}</p>
            <p style="margin: 5px 0;"><strong>Product:</strong> ${productTitle}</p>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            You can view the fansign image in your order details page.
          </p>
          
          <div style="margin: 30px 0;">
            <a href="https://oracle-market.store/orders" 
               style="display: inline-block; padding: 12px 24px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Order
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
    console.error("Error in send-fansign-notification function:", error);
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
