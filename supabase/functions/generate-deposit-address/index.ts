import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AES-GCM encryption for private keys
async function encryptPrivateKey(privateKey: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, cryptoKey, encoder.encode(privateKey)
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

// Generate BTC address via Tatum
async function generateBtcAddress(apiKey: string): Promise<{ address: string; privateKey: string } | null> {
  try {
    const response = await fetch('https://api.tatum.io/v3/bitcoin/wallet', {
      method: 'GET',
      headers: { 'x-api-key': apiKey }
    });
    
    if (!response.ok) {
      console.error('Tatum BTC wallet generation failed:', response.status);
      return null;
    }
    
    const wallet = await response.json();
    
    // Derive first address from wallet
    const addressResponse = await fetch(
      `https://api.tatum.io/v3/bitcoin/address/${wallet.xpub}/0`,
      { headers: { 'x-api-key': apiKey } }
    );
    
    if (!addressResponse.ok) {
      console.error('Tatum BTC address derivation failed:', addressResponse.status);
      return null;
    }
    
    const addressData = await addressResponse.json();
    
    // Get private key for index 0
    const privKeyResponse = await fetch(
      `https://api.tatum.io/v3/bitcoin/wallet/priv`,
      {
        method: 'POST',
        headers: { 
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          index: 0,
          mnemonic: wallet.mnemonic
        })
      }
    );
    
    if (!privKeyResponse.ok) {
      console.error('Tatum BTC private key derivation failed:', privKeyResponse.status);
      return null;
    }
    
    const privKeyData = await privKeyResponse.json();
    
    return {
      address: addressData.address,
      privateKey: privKeyData.key
    };
  } catch (e) {
    console.error('BTC address generation error:', e);
    return null;
  }
}

// Generate LTC address via Tatum
async function generateLtcAddress(apiKey: string): Promise<{ address: string; privateKey: string } | null> {
  try {
    const response = await fetch('https://api.tatum.io/v3/litecoin/wallet', {
      method: 'GET',
      headers: { 'x-api-key': apiKey }
    });
    
    if (!response.ok) {
      console.error('Tatum LTC wallet generation failed:', response.status);
      return null;
    }
    
    const wallet = await response.json();
    
    // Derive first address from wallet
    const addressResponse = await fetch(
      `https://api.tatum.io/v3/litecoin/address/${wallet.xpub}/0`,
      { headers: { 'x-api-key': apiKey } }
    );
    
    if (!addressResponse.ok) {
      console.error('Tatum LTC address derivation failed:', addressResponse.status);
      return null;
    }
    
    const addressData = await addressResponse.json();
    
    // Get private key for index 0
    const privKeyResponse = await fetch(
      `https://api.tatum.io/v3/litecoin/wallet/priv`,
      {
        method: 'POST',
        headers: { 
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          index: 0,
          mnemonic: wallet.mnemonic
        })
      }
    );
    
    if (!privKeyResponse.ok) {
      console.error('Tatum LTC private key derivation failed:', privKeyResponse.status);
      return null;
    }
    
    const privKeyData = await privKeyResponse.json();
    
    return {
      address: addressData.address,
      privateKey: privKeyData.key
    };
  } catch (e) {
    console.error('LTC address generation error:', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tatumApiKey = Deno.env.get('TATUM_API_KEY')!;
    const encryptionKey = supabaseServiceKey.slice(0, 32);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { currency, amount } = await req.json();

    if (!currency || !['BTC', 'LTC'].includes(currency)) {
      return new Response(JSON.stringify({ error: 'Invalid currency. Use BTC or LTC.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔑 Generating ${currency} address for user ${user.id}, amount: ${amount}`);

    // Check for existing pending deposit
    const { data: existingDeposit } = await supabase
      .from('deposit_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingDeposit) {
      console.log('📋 User already has pending deposit');
      return new Response(JSON.stringify({
        success: true,
        deposit: existingDeposit,
        message: 'Existing pending deposit found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate new address
    let addressData: { address: string; privateKey: string } | null = null;
    
    if (currency === 'BTC') {
      addressData = await generateBtcAddress(tatumApiKey);
    } else {
      addressData = await generateLtcAddress(tatumApiKey);
    }

    if (!addressData) {
      return new Response(JSON.stringify({ error: 'Failed to generate address' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Generated ${currency} address: ${addressData.address}`);

    // Encrypt private key
    const encryptedPrivateKey = await encryptPrivateKey(addressData.privateKey, encryptionKey);

    // Create deposit record
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    const { data: deposit, error: insertError } = await supabase
      .from('deposit_addresses')
      .insert({
        user_id: user.id,
        currency,
        address: addressData.address,
        private_key_encrypted: encryptedPrivateKey,
        requested_amount_crypto: amount,
        expires_at: expiresAt.toISOString(),
        required_confirmations: currency === 'BTC' ? 1 : 1
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting deposit:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create deposit record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Created deposit request: ${deposit.id}`);

    return new Response(JSON.stringify({
      success: true,
      deposit: {
        id: deposit.id,
        address: deposit.address,
        currency: deposit.currency,
        requested_amount_crypto: deposit.requested_amount_crypto,
        status: deposit.status,
        expires_at: deposit.expires_at
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
