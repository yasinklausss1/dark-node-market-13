import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { hmac } from "https://esm.sh/@noble/hashes@1.3.3/hmac";
import { sha256 } from "https://esm.sh/@noble/hashes@1.3.3/sha256";
import * as secp from "https://esm.sh/@noble/secp256k1@1.7.1";

// Set up the hmac function for secp256k1
secp.utils.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]) => {
  return hmac(sha256, key, secp.utils.concatBytes(...messages));
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decrypt private key using AES-GCM
async function decryptPrivateKey(encryptedKey: string): Promise<string> {
  try {
    const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const keyData = new TextEncoder().encode(encryptionKey.slice(0, 32).padEnd(32, '0'));
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const encryptedData = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
    const iv = encryptedData.slice(0, 12);
    const ciphertext = encryptedData.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt private key');
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Send Litecoin transaction via BlockCypher
async function sendLitecoinTransaction(
  privateKey: string, 
  fromAddress: string, 
  toAddress: string, 
  amountLitoshi: number
): Promise<string> {
  const BLOCKCYPHER_TOKEN = Deno.env.get('BLOCKCYPHER_TOKEN');
  
  if (!BLOCKCYPHER_TOKEN) {
    throw new Error('BlockCypher token not configured');
  }

  console.log(`Sending LTC transaction: ${amountLitoshi} litoshi from ${fromAddress} to ${toAddress}`);

  // Step 1: Create unsigned transaction
  const newTxData = {
    inputs: [{ addresses: [fromAddress] }],
    outputs: [{ addresses: [toAddress], value: amountLitoshi }]
  };

  console.log('Creating unsigned transaction...');
  const newTxResponse = await fetch(
    `https://api.blockcypher.com/v1/ltc/main/txs/new?token=${BLOCKCYPHER_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTxData)
    }
  );

  if (!newTxResponse.ok) {
    const errorText = await newTxResponse.text();
    console.error('Failed to create transaction:', errorText);
    throw new Error(`Failed to create transaction: ${errorText}`);
  }

  const txSkeleton = await newTxResponse.json();
  console.log('Transaction skeleton created, fee:', txSkeleton.tx?.fees);

  if (txSkeleton.errors && txSkeleton.errors.length > 0) {
    throw new Error(`Transaction errors: ${txSkeleton.errors.join(', ')}`);
  }

  // Step 2: Sign the transaction
  const tosign = txSkeleton.tosign;
  if (!tosign || tosign.length === 0) {
    throw new Error('No data to sign');
  }

  const privKeyBytes = hexToBytes(privateKey);
  const pubKeyBytes = secp.getPublicKey(privKeyBytes, true);

  const signatures: string[] = [];
  const pubkeys: string[] = [];

  for (const toSign of tosign) {
    const msgHash = hexToBytes(toSign);
    const sig = secp.signSync(msgHash, privKeyBytes, { canonical: true, der: true });
    
    signatures.push(bytesToHex(sig));
    pubkeys.push(bytesToHex(pubKeyBytes));
  }

  txSkeleton.signatures = signatures;
  txSkeleton.pubkeys = pubkeys;

  console.log('Transaction signed, sending to blockchain...');

  // Step 3: Send signed transaction
  const sendResponse = await fetch(
    `https://api.blockcypher.com/v1/ltc/main/txs/send?token=${BLOCKCYPHER_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txSkeleton)
    }
  );

  if (!sendResponse.ok) {
    const errorText = await sendResponse.text();
    console.error('Failed to send transaction:', errorText);
    throw new Error(`Failed to send transaction: ${errorText}`);
  }

  const result = await sendResponse.json();
  console.log('Transaction sent! Hash:', result.tx?.hash);

  if (!result.tx?.hash) {
    throw new Error('No transaction hash returned');
  }

  return result.tx.hash;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fromAddress, toAddress, encryptedPrivateKey, amountLitoshi } = await req.json();

    console.log('=== Manual LTC Transfer ===');
    console.log('From:', fromAddress);
    console.log('To:', toAddress);
    console.log('Amount (litoshi):', amountLitoshi);

    if (!fromAddress || !toAddress || !encryptedPrivateKey || !amountLitoshi) {
      throw new Error('Missing required parameters');
    }

    // Decrypt the private key
    console.log('Decrypting private key...');
    const privateKey = await decryptPrivateKey(encryptedPrivateKey);
    console.log('Private key decrypted successfully');

    // Send the transaction
    const txHash = await sendLitecoinTransaction(privateKey, fromAddress, toAddress, amountLitoshi);

    console.log('=== Transfer Complete ===');
    console.log('TX Hash:', txHash);

    return new Response(
      JSON.stringify({ 
        success: true, 
        txHash,
        message: `Successfully transferred ${amountLitoshi} litoshi from ${fromAddress} to ${toAddress}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transfer error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
