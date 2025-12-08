import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple WIF validation and address derivation
// WIF (Wallet Import Format) is base58check encoded
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function isValidBase58(str: string): boolean {
  for (const char of str) {
    if (!BASE58_ALPHABET.includes(char)) return false;
  }
  return true;
}

function validateBtcWif(wif: string): boolean {
  // BTC WIF starts with 5, K, or L (mainnet)
  if (!wif || wif.length < 51 || wif.length > 52) return false;
  if (!['5', 'K', 'L'].includes(wif[0])) return false;
  return isValidBase58(wif);
}

function validateLtcWif(wif: string): boolean {
  // LTC WIF starts with 6 or T (mainnet)
  if (!wif || wif.length < 51 || wif.length > 52) return false;
  if (!['6', 'T'].includes(wif[0])) return false;
  return isValidBase58(wif);
}

function validateBtcAddress(address: string): boolean {
  // BTC addresses: Legacy (1), SegWit (3), Native SegWit (bc1)
  if (!address) return false;
  if (address.startsWith('1') && address.length >= 26 && address.length <= 35) return true;
  if (address.startsWith('3') && address.length >= 26 && address.length <= 35) return true;
  if (address.startsWith('bc1') && address.length >= 42 && address.length <= 62) return true;
  return false;
}

function validateLtcAddress(address: string): boolean {
  // LTC addresses: Legacy (L), SegWit (M), Native SegWit (ltc1)
  if (!address) return false;
  if (address.startsWith('L') && address.length >= 26 && address.length <= 35) return true;
  if (address.startsWith('M') && address.length >= 26 && address.length <= 35) return true;
  if (address.startsWith('ltc1') && address.length >= 42 && address.length <= 62) return true;
  return false;
}

// Simple base64 encoding for storage
function encodePrivateKey(privateKey: string): string {
  return btoa(privateKey);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Ungültiges Token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { currency, privateKey, address } = await req.json();

    console.log(`Import request for user ${user.id}, currency: ${currency}`);

    // Validate input
    if (!currency || !privateKey || !address) {
      return new Response(
        JSON.stringify({ error: 'Währung, Private Key und Adresse sind erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['BTC', 'LTC'].includes(currency.toUpperCase())) {
      return new Response(
        JSON.stringify({ error: 'Nur BTC und LTC werden unterstützt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedCurrency = currency.toUpperCase();

    // Validate WIF format
    if (normalizedCurrency === 'BTC' && !validateBtcWif(privateKey)) {
      return new Response(
        JSON.stringify({ error: 'Ungültiges Bitcoin WIF-Format. Muss mit 5, K oder L beginnen.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (normalizedCurrency === 'LTC' && !validateLtcWif(privateKey)) {
      return new Response(
        JSON.stringify({ error: 'Ungültiges Litecoin WIF-Format. Muss mit 6 oder T beginnen.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate address format
    if (normalizedCurrency === 'BTC' && !validateBtcAddress(address)) {
      return new Response(
        JSON.stringify({ error: 'Ungültige Bitcoin-Adresse' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (normalizedCurrency === 'LTC' && !validateLtcAddress(address)) {
      return new Response(
        JSON.stringify({ error: 'Ungültige Litecoin-Adresse' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encode the private key for storage
    const encodedKey = encodePrivateKey(privateKey);

    // Deactivate existing addresses for this currency
    const { error: deactivateError } = await supabase
      .from('user_addresses')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('currency', normalizedCurrency);

    if (deactivateError) {
      console.error('Error deactivating old addresses:', deactivateError);
    }

    // Insert the imported wallet
    const { error: insertError } = await supabase
      .from('user_addresses')
      .insert({
        user_id: user.id,
        currency: normalizedCurrency,
        address: address,
        private_key_encrypted: encodedKey,
        is_active: true
      });

    if (insertError) {
      console.error('Error inserting imported wallet:', insertError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Speichern der Wallet' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully imported ${normalizedCurrency} wallet for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${normalizedCurrency} Wallet erfolgreich importiert`,
        address: address
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import wallet error:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
