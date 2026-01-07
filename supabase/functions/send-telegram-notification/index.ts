import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderNotification {
  orderId: string;
  buyerUsername: string;
  sellerUsernames: string[];
  amountCrypto: number;
  currency: 'BTC' | 'LTC';
  amountEur: number;
  products: { title: string; quantity: number; price: number }[];
  useEscrow: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) {
      console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
      return new Response(JSON.stringify({ error: 'Telegram not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: OrderNotification = await req.json();
    const { orderId, buyerUsername, sellerUsernames, amountCrypto, currency, amountEur, products, useEscrow } = body;

    console.log('Sending Telegram notification for order:', orderId);

    // Format the message
    const productsList = products
      .map(p => `• ${p.title} x${p.quantity} (€${p.price.toFixed(2)})`)
      .join('\n');

    const sellersText = sellerUsernames.length === 1 
      ? sellerUsernames[0] 
      : sellerUsernames.join(', ');

    const now = new Date();
    const dateStr = now.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const message = `🛒 *NEUE BESTELLUNG*

📦 Order: \`#${orderId.slice(0, 8)}\`
👤 Käufer: *${escapeMarkdown(buyerUsername)}*
🏪 Verkäufer: *${escapeMarkdown(sellersText)}*
💰 Betrag: \`${amountCrypto.toFixed(8)} ${currency}\` (€${amountEur.toFixed(2)})
🔐 Escrow: ${useEscrow ? '✅ Ja' : '❌ Nein'}
🕐 Zeit: ${dateStr}, ${timeStr} Uhr

📝 *Produkte:*
${productsList}`;

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API error:', result);
      return new Response(JSON.stringify({ error: 'Telegram send failed', details: result }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Telegram notification sent successfully');
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Escape special Markdown characters
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}
