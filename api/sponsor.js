const { callWithRpcEndpointFallback, normalizeNetwork } = require('./lib/rpcEndpoints');
const { captureApiException, withApiTelemetry } = require('./lib/telemetry');

const loadSdk = () => import("@r3e/neo-js-sdk/browser");
const NEO_CONTRACT_HASH = "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
const DEFAULT_MAX_NETWORK_FEE = 50000000n; // 0.5 GAS
const SPONSOR_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const SPONSOR_RATE_LIMIT_MAX = 10;
const SPONSOR_RATE_LIMIT_CLEANUP_EVERY = 128;
const sponsorRateLimits = new Map();
let sponsorRateLimitCalls = 0;

const normalizeHex = (value = "") => String(value || "").trim().replace(/^0x/i, "").toLowerCase();

const isSponsorEnabled = () => {
  const value = String(process.env.SPONSOR_ENABLED || process.env.SPONSORED_ENABLED || "").trim().toLowerCase();
  return value === "true" || value === "1";
};

const getClientKey = (req) =>
  String(
    req.headers["x-forwarded-for"] ||
      req.headers["x-real-ip"] ||
      req.socket?.remoteAddress ||
      "unknown",
  )
    .split(",")[0]
    .trim();

const checkRateLimit = (key) => {
  const now = Date.now();
  sponsorRateLimitCalls += 1;
  if (sponsorRateLimitCalls % SPONSOR_RATE_LIMIT_CLEANUP_EVERY === 0) {
    for (const [k, v] of sponsorRateLimits) {
      if (!v || now - v.startedAt > SPONSOR_RATE_LIMIT_WINDOW_MS) {
        sponsorRateLimits.delete(k);
      }
    }
  }
  const current = sponsorRateLimits.get(key);
  if (!current || now - current.startedAt > SPONSOR_RATE_LIMIT_WINDOW_MS) {
    sponsorRateLimits.set(key, { startedAt: now, count: 1 });
    return true;
  }

  current.count += 1;
  return current.count <= SPONSOR_RATE_LIMIT_MAX;
};

const getSignerScope = (signer) => Number(signer?.scopes ?? signer?.scope ?? 0);

const getMaxNetworkFee = () => {
  try {
    const configured = BigInt(String(process.env.SPONSOR_MAX_NETWORK_FEE || DEFAULT_MAX_NETWORK_FEE));
    return configured > 0n ? configured : DEFAULT_MAX_NETWORK_FEE;
  } catch {
    return DEFAULT_MAX_NETWORK_FEE;
  }
};

function expectedSponsoredScript(sdk, { operation, userAddress, candidatePubKey }) {
  const userScriptHash = normalizeHex(new sdk.wallet.Account(userAddress).scriptHash);
  const normalizedOperation = String(operation || "").trim().toLowerCase();

  if (normalizedOperation === "claim") {
    return sdk.sc.createScript({
      scriptHash: NEO_CONTRACT_HASH,
      operation: "transfer",
      args: [
        sdk.sc.ContractParam.hash160(userScriptHash),
        sdk.sc.ContractParam.hash160(userScriptHash),
        sdk.sc.ContractParam.integer(0),
        sdk.sc.ContractParam.any(null),
      ],
    });
  }

  if (normalizedOperation === "vote") {
    const pubKey = normalizeHex(candidatePubKey);
    if (!/^(02|03)[0-9a-f]{64}$/.test(pubKey)) {
      throw new Error("A valid candidate public key is required for sponsored votes.");
    }
    return sdk.sc.createScript({
      scriptHash: NEO_CONTRACT_HASH,
      operation: "vote",
      args: [
        sdk.sc.ContractParam.hash160(userScriptHash),
        sdk.sc.ContractParam.publicKey(pubKey),
      ],
    });
  }

  throw new Error("Unsupported sponsored operation.");
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sdk = await loadSdk();
    const { tx, wallet, rpc } = sdk;
    const { action, transactionHex, network, operation, userAddress, candidatePubKey } = req.body;

    if (!isSponsorEnabled()) {
      return res.status(503).json({ error: "Sponsored transactions are disabled." });
    }

    if (!checkRateLimit(getClientKey(req))) {
      return res.status(429).json({ error: "Too many sponsored transaction requests." });
    }
    
    const sponsorWif = process.env.SPONSORED_WIF;
    if (!sponsorWif) {
      return res.status(500).json({ error: 'Sponsor WIF not configured on the server' });
    }
    
    const sponsorAccount = new wallet.Account(sponsorWif);
    
    if (action === 'info') {
       return res.status(200).json({ sponsorAddress: sponsorAccount.address });
    }

    if (!transactionHex) return res.status(400).json({ error: 'Missing transaction hex' });

    const normalizedNetwork = normalizeNetwork(network);
    const magic = normalizedNetwork === 'testnet' ? 894710606 : 860833102;

    // Deserialize transaction
    const transaction = tx.Transaction.deserialize(transactionHex);

    if (transaction.signers.length !== 2) {
      return res.status(400).json({ error: 'Expected exactly 2 signers' });
    }

    if (transaction.signers[0].account.toLowerCase() !== sponsorAccount.scriptHash.toLowerCase()) {
      return res.status(400).json({ error: 'First signer must be the sponsor account' });
    }

    const expectedScript = normalizeHex(expectedSponsoredScript(sdk, { operation, userAddress, candidatePubKey }));
    const actualScript = normalizeHex(transaction.script?.toString?.() || transaction.script);
    if (!expectedScript || actualScript !== expectedScript) {
      return res.status(400).json({ error: "Transaction script is not an allowed sponsored operation." });
    }

    const userScriptHash = normalizeHex(new wallet.Account(userAddress).scriptHash);
    if (normalizeHex(transaction.signers[1].account) !== userScriptHash) {
      return res.status(400).json({ error: "Second signer must be the requesting account." });
    }
    if (getSignerScope(transaction.signers[0]) !== 0 || getSignerScope(transaction.signers[1]) !== 1) {
      return res.status(400).json({ error: "Unexpected signer scopes for sponsored transaction." });
    }
    
    // Check fee limit (e.g. max network fee 0.5 GAS)
    if (BigInt(String(transaction.networkFee || 0)) > getMaxNetworkFee()) {
       return res.status(400).json({ error: 'Network fee too high' });
    }

    // Sign the transaction with Sponsor — neon-js appends the sponsor's witness.
    transaction.sign(sponsorAccount, magic);

    // Rebuild witnesses in the order the signers array expects: [sponsor, user].
    // The user's witness comes from the original (frontend-signed) transaction;
    // the sponsor's witness is whichever entry is present after sign() but absent before.
    const originalTx = tx.Transaction.deserialize(transactionHex);
    const sponsorWitnessObj = transaction.witnesses.find((w) =>
      !originalTx.witnesses.some(
        (originalWitness) =>
          originalWitness.invocation === w.invocation && originalWitness.verification === w.verification,
      ),
    );
    const userWitness = originalTx.witnesses.find((w) => w.invocation && w.invocation.length > 0);

    if (!userWitness) {
      return res.status(400).json({ error: "User witness is required." });
    }
    if (!sponsorWitnessObj) {
      return res.status(500).json({ error: "Sponsor witness was not produced." });
    }

    transaction.witnesses = [sponsorWitnessObj, userWitness];

    // Broadcast
    const fullySignedHex = transaction.serialize(true);
    
    try {
       const txid = await callWithRpcEndpointFallback(normalizedNetwork, async (endpoint) => {
         const rpcClient = new rpc.RPCClient(endpoint);
         return rpcClient.sendRawTransaction({ tx: fullySignedHex });
       });
       return res.status(200).json({ txid, fullySignedHex });
    } catch (err) {
       return res.status(400).json({ error: 'Broadcast failed: ' + err.message });
    }

  } catch (e) {
    await captureApiException(e, { route: "sponsor", req });
    console.error(e);
    return res.status(500).json({ error: "Internal sponsor error." });
  }
}

module.exports = withApiTelemetry("sponsor", handler);
module.exports.config = {
  runtime: 'nodejs',
};
