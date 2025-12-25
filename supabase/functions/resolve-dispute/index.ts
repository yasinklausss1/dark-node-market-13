import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_USER_ID = "0af916bb-1c03-4173-a898-fd4274ae4a2b";

type ResolutionType = "buyer_favor" | "seller_favor" | "partial" | "dismissed";

function getResolutionLabel(type: ResolutionType) {
  switch (type) {
    case "buyer_favor":
      return "Zugunsten Käufer";
    case "seller_favor":
      return "Zugunsten Verkäufer";
    case "partial":
      return "Teilweise Erstattung";
    case "dismissed":
      return "Abgelehnt";
    default:
      return type;
  }
}

function getWalletBalanceField(currency: string): "balance_btc" | "balance_ltc" | "balance_eth" {
  const c = String(currency || "").toLowerCase();
  if (c === "btc" || c === "bitcoin") return "balance_btc";
  if (c === "ltc" || c === "litecoin") return "balance_ltc";
  // default to ETH if unknown (prevents crashes; still logs below)
  return "balance_eth";
}

async function ensureWalletRow(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("wallet_balances")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { error: insertError } = await supabase.from("wallet_balances").insert({
      user_id: userId,
      balance_eur: 0,
      balance_btc: 0,
      balance_ltc: 0,
      balance_eth: 0,
      balance_btc_deposited: 0,
      balance_ltc_deposited: 0,
      balance_eth_deposited: 0,
      balance_credits: 0,
      balance_xmr: 0,
      balance_xmr_deposited: 0,
    });
    if (insertError) throw insertError;
  }
}

async function incrementWallet(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  currency: string,
  amountCrypto: number,
) {
  if (!amountCrypto || Number.isNaN(amountCrypto)) return;

  await ensureWalletRow(supabase, userId);

  const balanceField = getWalletBalanceField(currency);

  const { data: wallet, error: fetchError } = await supabase
    .from("wallet_balances")
    .select(balanceField)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const current = Number(wallet?.[balanceField] ?? 0);
  const next = current + Number(amountCrypto);

  const { error: updateError } = await supabase
    .from("wallet_balances")
    .update({ [balanceField]: next, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (updateError) throw updateError;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Server-Konfiguration fehlt (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
    }

    // Admin client with service role - can verify any JWT token
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get authorization header (case-insensitive)
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
    console.log("Auth header received:", authHeader ? "Present" : "Missing");

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    console.log("Token extracted:", token ? `${token.substring(0, 20)}...` : "Empty");

    if (!token) {
      console.log("No token found in request");
      return new Response(JSON.stringify({ success: false, error: "Nicht eingeloggt." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Use service role client to verify the JWT token directly
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    console.log(
      "User lookup result:",
      userData?.user?.id || "No user",
      userError?.message || "No error",
    );

    if (userError || !userData?.user) {
      console.log("Auth failed:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: userError?.message || "Nicht eingeloggt." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 },
      );
    }

    // Only moderators/admins
    const { data: isModOrAdmin, error: roleError } = await supabaseAdmin.rpc(
      "is_moderator_or_admin",
      { user_uuid: userData.user.id },
    );

    if (roleError) throw roleError;
    if (!isModOrAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Nicht autorisiert." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const body = await req.json();
    const disputeId = String(body?.disputeId || "");
    const resolutionType = body?.resolutionType as ResolutionType;
    const resolutionNote = String(body?.resolutionNote || "").trim();
    const partialPercentRaw = Number(body?.partialPercent);

    if (!disputeId) throw new Error("disputeId fehlt");
    if (!resolutionType) throw new Error("resolutionType fehlt");
    if (!resolutionNote) throw new Error("Begründung erforderlich");

    const partialPercent =
      resolutionType === "partial"
        ? Math.min(100, Math.max(0, Number.isFinite(partialPercentRaw) ? partialPercentRaw : 50))
        : undefined;

    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from("disputes")
      .select("*")
      .eq("id", disputeId)
      .maybeSingle();

    if (disputeError) throw disputeError;
    if (!dispute) throw new Error("Dispute nicht gefunden");

    const status = resolutionType === "dismissed" ? "dismissed" : "resolved";
    const resolutionText = `[${getResolutionLabel(resolutionType)}] ${resolutionNote}`;

    // If dismissed, only update dispute record.
    if (resolutionType === "dismissed") {
      const { error: updateDisputeError } = await supabaseAdmin
        .from("disputes")
        .update({
          status,
          resolution: resolutionText,
          resolved_at: new Date().toISOString(),
          admin_assigned: userData.user.id,
        })
        .eq("id", disputeId);

      if (updateDisputeError) throw updateDisputeError;

      return new Response(
        JSON.stringify({ success: true, status, resolution: resolutionText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch held escrow holdings for this order
    const { data: holdings, error: holdingsError } = await supabaseAdmin
      .from("escrow_holdings")
      .select("*")
      .eq("order_id", dispute.order_id)
      .eq("status", "held");

    if (holdingsError) throw holdingsError;
    if (!holdings || holdings.length === 0) {
      throw new Error("Kein 'held' Escrow für diese Bestellung gefunden");
    }

    const buyerId = dispute.plaintiff_id;
    const sellerId = dispute.defendant_id;

    // Process each holding
    for (const holding of holdings) {
      const currency = String(holding.currency || "BTC");

      if (resolutionType === "buyer_favor") {
        // Refund buyer full amount, no fees collected
        await incrementWallet(supabaseAdmin, buyerId, currency, Number(holding.amount_crypto));

        {
          const { error: escrowUpdateError } = await supabaseAdmin
            .from("escrow_holdings")
            .update({
              status: "refunded",
              released_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", holding.id);
          if (escrowUpdateError) throw escrowUpdateError;
        }

        {
          const { error: txError } = await supabaseAdmin.from("transactions").insert({
            user_id: buyerId,
            type: "refund",
            amount_eur: Number(holding.amount_eur),
            amount_btc: String(currency).toLowerCase() === "btc" ? Number(holding.amount_crypto) : 0,
            status: "confirmed",
            description: `Dispute-Rückerstattung #${String(dispute.order_id).slice(0, 8)} (${currency.toUpperCase()})`,
            transaction_direction: "incoming",
            related_order_id: dispute.order_id,
          });
          if (txError) throw txError;
        }
      }

      if (resolutionType === "seller_favor") {
        // Match release-escrow behavior (seller gets net, admin fee collected)
        await incrementWallet(supabaseAdmin, sellerId, currency, Number(holding.seller_amount_crypto));

        // Admin fee address + transaction
        const { data: feeAddress, error: feeAddressError } = await supabaseAdmin
          .from("admin_fee_addresses")
          .select("*")
          .eq("admin_user_id", ADMIN_USER_ID)
          .eq("currency", currency.toUpperCase())
          .maybeSingle();

        if (feeAddressError) throw feeAddressError;

        if (feeAddress) {
          const { error: feeAddrUpdateError } = await supabaseAdmin
            .from("admin_fee_addresses")
            .update({ balance: Number(feeAddress.balance) + Number(holding.fee_amount_crypto) })
            .eq("id", feeAddress.id);
          if (feeAddrUpdateError) throw feeAddrUpdateError;
        }

        {
          const { error: feeTxError } = await supabaseAdmin.from("admin_fee_transactions").insert({
            escrow_holding_id: holding.id,
            order_id: dispute.order_id,
            amount_eur: Number(holding.fee_amount_eur),
            amount_crypto: Number(holding.fee_amount_crypto),
            currency: currency.toUpperCase(),
            transaction_type: "fee_collected",
            status: "completed",
          });
          if (feeTxError) throw feeTxError;
        }

        {
          const { error: escrowUpdateError } = await supabaseAdmin
            .from("escrow_holdings")
            .update({
              status: "released",
              released_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", holding.id);
          if (escrowUpdateError) throw escrowUpdateError;
        }

        {
          const { error: saleTxError } = await supabaseAdmin.from("transactions").insert({
            user_id: sellerId,
            type: "sale",
            amount_eur: Number(holding.seller_amount_eur),
            amount_btc: String(currency).toLowerCase() === "btc" ? Number(holding.seller_amount_crypto) : 0,
            status: "confirmed",
            description: `Sale #${String(dispute.order_id).slice(0, 8)} (${currency.toUpperCase()}) - Dispute entschieden`,
            transaction_direction: "incoming",
            related_order_id: dispute.order_id,
          });
          if (saleTxError) throw saleTxError;
        }
      }

      if (resolutionType === "partial") {
        const buyerPercent = partialPercent ?? 50;
        const sellerPercent = 100 - buyerPercent;

        const amountCrypto = Number(holding.amount_crypto);
        const amountEur = Number(holding.amount_eur);

        const buyerRefundCrypto = (amountCrypto * buyerPercent) / 100;
        const sellerGrossCrypto = amountCrypto - buyerRefundCrypto;

        const feeCryptoFull = Number(holding.fee_amount_crypto);
        const feeEurFull = Number(holding.fee_amount_eur);

        // Fee only on seller side (proportional)
        const feeCrypto = (feeCryptoFull * sellerPercent) / 100;
        const feeEur = (feeEurFull * sellerPercent) / 100;
        const sellerNetCrypto = sellerGrossCrypto - feeCrypto;

        if (buyerRefundCrypto > 0) {
          await incrementWallet(supabaseAdmin, buyerId, currency, buyerRefundCrypto);
          const { error: refundTxError } = await supabaseAdmin.from("transactions").insert({
            user_id: buyerId,
            type: "refund",
            amount_eur: (amountEur * buyerPercent) / 100,
            amount_btc: String(currency).toLowerCase() === "btc" ? buyerRefundCrypto : 0,
            status: "confirmed",
            description: `Teilweise Dispute-Rückerstattung (${buyerPercent}%) #${String(dispute.order_id).slice(0, 8)} (${currency.toUpperCase()})`,
            transaction_direction: "incoming",
            related_order_id: dispute.order_id,
          });
          if (refundTxError) throw refundTxError;
        }

        if (sellerNetCrypto > 0) {
          await incrementWallet(supabaseAdmin, sellerId, currency, sellerNetCrypto);
          const { error: saleTxError } = await supabaseAdmin.from("transactions").insert({
            user_id: sellerId,
            type: "sale",
            amount_eur: (amountEur * sellerPercent) / 100 - feeEur,
            amount_btc: String(currency).toLowerCase() === "btc" ? sellerNetCrypto : 0,
            status: "confirmed",
            description: `Teilweise Dispute-Freigabe (${sellerPercent}%) #${String(dispute.order_id).slice(0, 8)} (${currency.toUpperCase()})`,
            transaction_direction: "incoming",
            related_order_id: dispute.order_id,
          });
          if (saleTxError) throw saleTxError;
        }

        if (feeCrypto > 0) {
          const { data: feeAddress, error: feeAddressError } = await supabaseAdmin
            .from("admin_fee_addresses")
            .select("*")
            .eq("admin_user_id", ADMIN_USER_ID)
            .eq("currency", currency.toUpperCase())
            .maybeSingle();

          if (feeAddressError) throw feeAddressError;

          if (feeAddress) {
            const { error: feeAddrUpdateError } = await supabaseAdmin
              .from("admin_fee_addresses")
              .update({ balance: Number(feeAddress.balance) + feeCrypto })
              .eq("id", feeAddress.id);
            if (feeAddrUpdateError) throw feeAddrUpdateError;
          }

          const { error: feeTxError } = await supabaseAdmin.from("admin_fee_transactions").insert({
            escrow_holding_id: holding.id,
            order_id: dispute.order_id,
            amount_eur: feeEur,
            amount_crypto: feeCrypto,
            currency: currency.toUpperCase(),
            transaction_type: "fee_collected",
            status: "completed",
          });
          if (feeTxError) throw feeTxError;
        }

        {
          const { error: escrowUpdateError } = await supabaseAdmin
            .from("escrow_holdings")
            .update({
              status: "partial_refund",
              released_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", holding.id);
          if (escrowUpdateError) throw escrowUpdateError;
        }
      }
    }

    // Update order escrow status
    const nextEscrowStatus =
      resolutionType === "buyer_favor"
        ? "refunded"
        : resolutionType === "seller_favor"
          ? "released"
          : "partial_refund";

    {
      const { error: orderUpdateError } = await supabaseAdmin
        .from("orders")
        .update({ escrow_status: nextEscrowStatus })
        .eq("id", dispute.order_id);
      if (orderUpdateError) throw orderUpdateError;
    }

    // Update dispute record (single source of truth)
    const { error: updateDisputeError } = await supabaseAdmin
      .from("disputes")
      .update({
        status,
        resolution: resolutionText,
        resolved_at: new Date().toISOString(),
        admin_assigned: userData.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", disputeId);

    if (updateDisputeError) throw updateDisputeError;

    return new Response(
      JSON.stringify({
        success: true,
        status,
        escrow_status: nextEscrowStatus,
        resolution: resolutionText,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in resolve-dispute:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message ?? "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
