import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type"
};

// Basic address validators
function isValidBtcAddress(addr: string) {
  const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
  return btcRegex.test(addr);
}
function isValidLtcAddress(addr: string) {
  const ltcRegex = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-z0-9]{39,59}$/;
  return ltcRegex.test(addr);
}

// NOTE: decryptPrivateKey should exist in your codebase (used by other functions).
// If it's named differently, replace the call below.
async function decryptPrivateKeyPlaceholder(encrypted: string, key: string) {
  // Placeholder: in repo there is a real decryptPrivateKey implementation.
  // This placeholder just returns the input (unsafe). Replace with real decrypt.
  return encrypted;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const adminClient = supabase; // for clarity (we use service role)

    const blockcypherToken = Deno.env.get("BLOCKCYPHER_TOKEN") ?? "";
    if (!blockcypherToken) {
      console.error("BLOCKCYPHER_TOKEN not configured");
      return new Response(JSON.stringify({ error: "BlockCypher token not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { amount, currency, destinationAddress } = body;

    if (!amount || !currency || !destinationAddress) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const currencyUpper = String(currency).toUpperCase();

    if (!["BTC", "LTC"].includes(currencyUpper)) {
      return new Response(JSON.stringify({ error: "Unsupported currency" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get admin fee address for this currency
    const { data: feeAddresses, error: faError } = await adminClient
      .from("admin_fee_addresses")
      .select("*")
      .eq("currency", currencyUpper)
      .limit(1);

    if (faError) {
      console.error("DB error fetching admin fee address:", faError);
      throw new Error("Failed to lookup admin fee address");
    }

    const feeAddress = (feeAddresses && feeAddresses[0]) || null;
    if (!feeAddress) {
      throw new Error(`No admin fee address configured for ${currencyUpper}`);
    }

    // Validate destination address early
    const dest = destinationAddress.trim();
    if (currencyUpper === "BTC" && !isValidBtcAddress(dest)) {
      throw new Error("Invalid Bitcoin address");
    }
    if (currencyUpper === "LTC" && !isValidLtcAddress(dest)) {
      throw new Error("Invalid Litecoin address");
    }

    // Decrypt private key for admin fee address
    // Use your repo's decryptPrivateKey implementation (may require encryption key)
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY") ?? "";
    let privateKey: string;
    try {
      // Use real decrypt function from repo, here fallback to placeholder if not found
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const decryptFn = typeof decryptPrivateKey === "function" ? decryptPrivateKey : decryptPrivateKeyPlaceholder;
      privateKey = await decryptFn(feeAddress.private_key_encrypted, encryptionKey);
    } catch (err) {
      console.error("Failed to decrypt admin private key:", err);
      throw new Error("Failed to decrypt admin private key");
    }

    // Build network path for BlockCypher
    const network = currencyUpper === "BTC" ? "btc/main" : "ltc/main";

    // Convert amount to smallest unit (satoshi/litoshi)
    const smallestUnitAmount = Math.floor(Number(amount) * 100000000);

    // Sanitize from-address (feeAddress.address) and trim whitespace
    const fromAddress = String(feeAddress.address).trim();

    console.log(`Creating tx skeleton: network=${network}, from=${fromAddress}, to=${dest}, amount=${smallestUnitAmount}`);

    // Create transaction skeleton
    const newTxResponse = await fetch(`https://api.blockcypher.com/v1/${network}/txs/new?token=${blockcypherToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: [{ addresses: [fromAddress] }],
        outputs: [{ addresses: [dest], value: smallestUnitAmount }]
      })
    });

    const newTxText = await newTxResponse.text();
    if (!newTxResponse.ok) {
      console.error("BlockCypher new tx error:", newTxText);
      // Try to parse body to include detailed error in response
      let parsed = newTxText;
      try { parsed = JSON.parse(newTxText); } catch (e) {}
      throw new Error(`Failed to create transaction: ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`);
    }

    const txSkeleton = JSON.parse(newTxText);
    console.log("Transaction skeleton created:", { tosignCount: txSkeleton.tosign?.length ?? 0, tx: !!txSkeleton.tx });

    // Defensive: ensure tx skeleton looks sane
    if ((!txSkeleton.tosign || txSkeleton.tosign.length === 0) && !txSkeleton.tx) {
      console.error("Invalid tx skeleton from BlockCypher:", JSON.stringify(txSkeleton));
      throw new Error("Invalid transaction skeleton received from BlockCypher");
    }

    // IMPORTANT: Use BlockCypher private_keys flow (requires WIF)
    // Ensure the decrypted privateKey is WIF-like (starts with 'L','M','T','6','K' etc) and not raw hex.
    const keyPreview = String(privateKey).slice(0, 2);
    console.log(`Using admin private key preview: ${keyPreview} (length ${String(privateKey).length})`);

    // Prepare send body: let BlockCypher sign with the WIF private key
    const sendBody = {
      tx: txSkeleton,
      private_keys: [privateKey]
    };

    const sendTxResponse = await fetch(`https://api.blockcypher.com/v1/${network}/txs/send?token=${blockcypherToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sendBody)
    });

    const sendText = await sendTxResponse.text();
    if (!sendTxResponse.ok) {
      console.error("BlockCypher send tx error:", sendText);
      let parsed = sendText;
      try { parsed = JSON.parse(sendText); } catch (e) {}
      throw new Error(`Failed to send transaction: ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`);
    }

    const sentTx = JSON.parse(sendText);
    console.log("Transaction sent:", sentTx?.tx?.hash);

    // Update admin_fee_addresses balance in DB (subtract the amount)
    const newBalance = Number(feeAddress.balance || 0) - Number(amount);
    await adminClient
      .from("admin_fee_addresses")
      .update({ balance: newBalance })
      .eq("id", feeAddress.id);

    // Record admin_fee_transactions
    await adminClient.from("admin_fee_transactions").insert({
      order_id: "00000000-0000-0000-0000-000000000000",
      amount_eur: 0,
      amount_crypto: amount,
      currency: currencyUpper,
      transaction_type: "withdrawal",
      destination_address: dest,
      tx_hash: sentTx.tx.hash,
      status: "completed"
    });

    return new Response(JSON.stringify({ success: true, txHash: sentTx.tx.hash, message: `Withdrawn ${amount} ${currencyUpper}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in withdraw-admin-fees:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message, success: false }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});