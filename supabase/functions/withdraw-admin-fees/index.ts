import bs58check from 'npm:bs58check';
import * as secp from 'npm:noble-secp256k1';

// Supabase Functions (Edge) style handlerr
// Expects JSON body with at least: inputs, outputs
// Optional fields:
// - signatures: array of hex signatures (DER+01) to try sending directly
// - pubkeys: array of hex public keys corresponding to signatures
// - privateKey: WIF or 64-char hex private key to use for local signing fallback
// - token: BlockCypher token (or set BLOCKCYPHER_TOKEN env var)

const BLOCKCYPHER_BASE = 'https://api.blockcypher.com/v1/btc/main';

function isHexPrivateKey(key: string) {
  return /^[0-9a-fA-F]{64}$/.test(key);
}

function decodeWIF(wif: string): { privateKeyHex: string; compressed: boolean } {
  // bs58check.decode throws on invalid input
  const payload = bs58check.decode(wif);
  // payload layout: [version (1) | privkey (32) | (optional) compressed(1)]
  if (payload.length !== 33 && payload.length !== 34) {
    throw new Error('Invalid WIF length');
  }
  const version = payload[0];
  if (version !== 0x80) {
    // Not a BTC mainnet WIF
    throw new Error('Unexpected WIF version byte: ' + version);
  }
  const priv = payload.slice(1, 33); // 32 bytes
  const compressed = payload.length === 34 && payload[33] === 0x01;
  return { privateKeyHex: Buffer.from(priv).toString('hex'), compressed };
}

async function decodePrivateKey(wifOrHex: string) {
  if (!wifOrHex) throw new Error('No private key provided');
  if (isHexPrivateKey(wifOrHex)) {
    return { privateKeyHex: wifOrHex.toLowerCase(), compressed: true };
  }
  // Try WIF
  return decodeWIF(wifOrHex);
}

async function signAllTosigns(tosigns: string[], privateKeyHex: string, compressed: boolean) {
  const priv = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;
  // noble-secp256k1 expects hex string private key
  const pubkey = await secp.getPublicKey(priv, compressed);
  // pubkey is hex string (no 0x prefix)

  const signatures: string[] = [];
  for (const tosign of tosigns) {
    // BlockCypher provides tosign as hex of the digest to sign
    // We sign the raw hex digest and request DER encoding, then append sighash byte '01'
    // noble-secp256k1 supports { der: true } to produce DER signatures
    // The sign API takes message (hex) and privateKey (hex) in recent versions
    // Use signSync/await sign for compatibility
    const derSig = await secp.sign(tosign, priv, { der: true });
    // derSig is hex string. Append sighash byte 01 (SIGHASH_ALL)
    const derPlusHash = derSig + '01';
    signatures.push(derPlusHash);
  }

  return { signatures, pubkeys: [pubkey] };
}

async function blockcypherNew(inputs: any[], outputs: any[], token?: string) {
  const url = `${BLOCKCYPHER_BASE}/txs/new${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs, outputs }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error('BlockCypher /txs/new failed: ' + (data && data.error ? data.error : resp.statusText));
    // Attach body for possible fallback
    (err as any).body = data;
    throw err;
  }
  return data;
}

async function blockcypherSend(tx: any, signatures: string[], pubkeys: string[], token?: string) {
  const url = `${BLOCKCYPHER_BASE}/txs/send${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  const body: any = { tx, signatures, pubkeys };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error('BlockCypher /txs/send failed: ' + (data && data.error ? data.error : resp.statusText));
    (err as any).body = data;
    throw err;
  }
  return data;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed, use POST' });
      return;
    }

    const body = req.body || {};
    const inputs = body.inputs;
    const outputs = body.outputs;
    const providedSignatures: string[] | undefined = body.signatures;
    const providedPubkeys: string[] | undefined = body.pubkeys;
    const privateKeyRaw: string | undefined = body.privateKey || process.env.BLOCKCYPHER_PRIVATE_KEY;
    const token: string | undefined = body.token || process.env.BLOCKCYPHER_TOKEN;

    if (!inputs || !outputs) {
      res.status(400).json({ error: 'Missing inputs or outputs in request body' });
      return;
    }

    // 1) Create skeleton (txs/new)
    let newTxResp: any;
    try {
      newTxResp = await blockcypherNew(inputs, outputs, token);
    } catch (err: any) {
      // If BlockCypher /txs/new fails we cannot proceed
      console.error('BlockCypher /txs/new error:', err.message || err);
      res.status(502).json({ error: 'Failed to create transaction skeleton', details: (err as any).body || err.message });
      return;
    }

    // If caller already provided signatures/pubkeys attempt to send directly
    if (providedSignatures && providedPubkeys) {
      try {
        const sendResp = await blockcypherSend(newTxResp.tx, providedSignatures, providedPubkeys, token);
        res.status(200).json({ success: true, result: sendResp });
        return;
      } catch (err: any) {
        console.warn('Initial BlockCypher /txs/send failed with provided signatures:', err.message || err);
        // fallthrough to attempt local signing if possible
      }
    }

    // If there are tosign entries and we have a private key, attempt local signing
    if (newTxResp && Array.isArray(newTxResp.tosign) && newTxResp.tosign.length > 0) {
      if (!privateKeyRaw) {
        res.status(502).json({
          error: 'BlockCypher send failed and no private key available for fallback',
          skeleton: newTxResp,
        });
        return;
      }

      let decoded;
      try {
        decoded = await decodePrivateKey(privateKeyRaw);
      } catch (err: any) {
        console.error('Private key decoding error:', err.message || err);
        res.status(400).json({ error: 'Invalid private key provided for fallback', details: err.message });
        return;
      }

      try {
        const { signatures, pubkeys } = await signAllTosigns(newTxResp.tosign, decoded.privateKeyHex, decoded.compressed);
        // Attempt to send using our locally-created signatures
        try {
          const sendResp = await blockcypherSend(newTxResp.tx, signatures, pubkeys, token);
          res.status(200).json({ success: true, result: sendResp });
          return;
        } catch (err: any) {
          console.error('BlockCypher /txs/send failed even after local signing:', err.message || err, (err as any).body);
          res.status(502).json({
            error: 'Failed to broadcast transaction after local signing',
            sendError: (err as any).body || err.message,
            skeleton: newTxResp,
            signatures,
            pubkeys,
          });
          return;
        }
      } catch (err: any) {
        console.error('Local signing failed:', err.message || err);
        res.status(500).json({ error: 'Local signing failed', details: err.message });
        return;
      }
    }

    // If there's nothing to sign or no fallback available, return skeleton for manual handling
    res.status(200).json({ message: 'Transaction skeleton created; no signatures provided or available', skeleton: newTxResp });
  } catch (err: any) {
    console.error('Unexpected handler error:', err);
    res.status(500).json({ error: 'Unexpected server error', details: err.message });
  }
}
