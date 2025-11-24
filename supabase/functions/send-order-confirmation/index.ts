import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderConfirmationRequest {
  orderId: string;
  userEmail: string;
  totalAmount: number;
  items: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, userEmail, totalAmount, items }: OrderConfirmationRequest = await req.json();

    console.log("Sending order confirmation to:", userEmail);

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">€${item.price.toFixed(2)}</td>
      </tr>
    `).join('');

    const emailResponse = await resend.emails.send({
      from: "Oracle Market <orders@oracle-market.store>",
      to: [userEmail],
      subject: `Order Confirmation - #${orderId.substring(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Order Confirmed</h1>
          <p style="font-size: 16px; color: #666;">
            Thank you for your order! Your order has been confirmed and is being processed.
          </p>
          
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Order #${orderId.substring(0, 8)}</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <thead>
                <tr>
                  <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: left;">Product</th>
                  <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: center;">Qty</th>
                  <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 15px 10px; font-weight: bold; text-align: right;">Total:</td>
                  <td style="padding: 15px 10px; font-weight: bold; text-align: right; font-size: 18px;">€${totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            You can track your order status in your account dashboard.
          </p>
          
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
    console.error("Error in send-order-confirmation function:", error);
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
