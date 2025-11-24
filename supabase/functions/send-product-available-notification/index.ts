import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductAvailableRequest {
  userEmail: string;
  productTitle: string;
  productId: string;
  price: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, productTitle, productId, price }: ProductAvailableRequest = await req.json();

    console.log("Sending product available notification to:", userEmail);

    const emailResponse = await resend.emails.send({
      from: "Oracle Market <notifications@oracle-market.store>",
      to: [userEmail],
      subject: `Product Back in Stock: ${productTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Product Back in Stock!</h1>
          <p style="font-size: 16px; color: #666;">
            Good news! A product you were interested in is now back in stock.
          </p>
          
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">${productTitle}</h2>
            <p style="margin: 10px 0; font-size: 24px; font-weight: bold; color: #8B5CF6;">€${price.toFixed(2)}</p>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            Don't miss out! This product is in high demand and may sell out quickly.
          </p>
          
          <div style="margin: 30px 0;">
            <a href="https://oracle-market.store/marketplace?product=${productId}" 
               style="display: inline-block; padding: 12px 24px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Product
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
    console.error("Error in send-product-available-notification function:", error);
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
