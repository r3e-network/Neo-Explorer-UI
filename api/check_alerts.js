const { createClient } = require('@supabase/supabase-js');
const { callWithRpcEndpointFallback, normalizeNetwork } = require('./lib/rpcEndpoints');
const { isCronAuthorized, unauthorizedCronResponse } = require('./lib/cronAuth');

module.exports.config = {
  runtime: 'edge',
};

// Lazy-init the Supabase client so a missing env var does not crash module load.
// (Edge functions import the module on every cold start; throwing here would
// break the route entirely instead of letting handler() return a 500.)
let supabaseClient = null;
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  // This cron performs privileged writes (network_alerts state updates), so it
  // MUST use a service-role key. Never silently fall back to the public anon
  // key — that key cannot bypass RLS and would make the writes fail or, worse,
  // expose a public key for privileged operations.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "Network alerts storage is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }
  supabaseClient = createClient(url, key);
  return supabaseClient;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY; // You need to add this in Vercel Dashboard

const getIndexedRpcCandidates = (network) => {
  const normalized = normalizeNetwork(network);
  if (normalized === 'testnet') {
    return [
      'https://api.n3index.dev/testnet',
      'https://api1.n3index.dev/testnet',
      'https://api2.n3index.dev/testnet',
      'https://api3.n3index.dev/testnet',
    ];
  }
  return [
    'https://api.n3index.dev/mainnet',
    'https://api1.n3index.dev/mainnet',
    'https://api2.n3index.dev/mainnet',
    'https://api3.n3index.dev/mainnet',
  ];
};

const postRpc = async (url, method, params = []) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
};

const rpcCall = (network, method, params = []) =>
  callWithRpcEndpointFallback(network, (url) => postRpc(url, method, params));

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// REST helper for the indexer's account-transactions endpoint. The
// legacy GetRawTransactionByAddress JSON-RPC was migrated to Postgres
// (frontend tasks #171 / #178 / #182) and now returns empty for most
// wallets, so the account_event alert path used to silently never
// fire. The indexer exposes the canonical list at
// /<network>/accounts/<addr>/transactions instead.
const fetchLatestAccountTx = async (network, address) => {
  const candidates = getIndexedRpcCandidates(network);
  let lastError = null;

  const safeAddr = encodeURIComponent(String(address || "").trim());
  if (!safeAddr) return null;

  for (const baseUrl of candidates) {
    try {
      const res = await fetch(`${baseUrl}/accounts/${safeAddr}/transactions?limit=1&offset=0`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const row = Array.isArray(json?.data) ? json.data[0] : null;
      return row || null;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return null;
};

const ALERT_FROM_ADDRESS = String(
  process.env.ALERT_EMAIL_FROM || ""
).trim();

// Helper to send email via Resend API
async function sendEmailAlert(emailAddress, subject, htmlContent) {
  if (!RESEND_API_KEY) {
    // Surface this loudly enough that an operator notices in the
    // Vercel function logs — previously a missing key was a silent
    // no-op, so a stuck network produced zero alerts AND zero log
    // signal that something was misconfigured.
    console.error("Alert email send skipped: RESEND_API_KEY env var is not configured.");
    return false;
  }
  if (!ALERT_FROM_ADDRESS) {
    console.error("Alert email send skipped: ALERT_EMAIL_FROM env var is not configured.");
    return false;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: ALERT_FROM_ADDRESS,
      to: emailAddress,
      subject: subject,
      html: htmlContent
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Email send failed:", errorText);
    return false;
  }
  return true;
}

async function checkNetworkAlerts(network) {
  let triggeredCount = 0;

  const supabase = getSupabaseClient();

  try {
    // 1. Fetch active alerts for this network
    const { data: alerts, error } = await supabase
      .from('network_alerts')
      .select('*')
      .eq('network', network)
      .eq('is_active', true);

    if (error) throw error;
    if (!alerts || alerts.length === 0) return 0;

    // Pre-fetch global state to avoid redundant calls inside the loop
    const blockCount = await rpcCall(network, 'getblockcount', []);
    if (!Number.isFinite(blockCount) || blockCount <= 0) {
      console.warn(`[check_alerts] invalid blockcount for ${network}:`, blockCount);
      return 0;
    }
    const latestBlock = await rpcCall(network, 'getblock', [blockCount - 1, 1]);
    // neo-go returns block.time in milliseconds (Neo N3 protocol), but historical neo-cli
    // returned seconds. Detect by magnitude (>1e12 ⇒ already ms) so the alert path is
    // robust across RPC providers instead of always assuming one unit.
    const blockTimeRaw = Number(latestBlock?.time);
    const currentBlockTime = !Number.isFinite(blockTimeRaw) || blockTimeRaw <= 0
      ? 0
      : blockTimeRaw > 1e12 ? blockTimeRaw : blockTimeRaw * 1000;
    const timeSinceLastBlock = currentBlockTime > 0 ? Date.now() - currentBlockTime : 0;

    let committee = null;

    // 3. Evaluate alerts
    for (const alert of alerts) {
      let triggered = false;
      let subject = '';
      let message = '';
      let updateData = {}; // Any state we need to save back to DB for this alert

      if (alert.alert_type === 'consensus_stuck') {
        const thresholdMs = alert.threshold * 1000;
        if (timeSinceLastBlock > thresholdMs) {
          triggered = true;
          subject = `Neo ${network.toUpperCase()} Alert: Consensus Delayed`;
          message = `
            <h2>Neo Network Alert</h2>
            <p>The Neo ${network} network has not generated a block for over <strong>${alert.threshold} seconds</strong>.</p>
            <p>Time since last block: ${Math.floor(timeSinceLastBlock / 1000)}s.</p>
            <p>Last Block Height: ${blockCount - 1}</p>
          `;
        }
      } 
      else if (alert.alert_type === 'consensus_missed') {
        // Target is the public key of the consensus node
        const targetPubKey = alert.target;

        // block.primary is an index into the *active validator* list
        // (7 entries from getnextblockvalidators), NOT the committee
        // (21 entries from getcommittee). Mixing them caused the alert
        // to never fire correctly: nodeIndex would land 0..20 while
        // block.primary lands 0..6, so they never aligned.
        if (!committee) {
          const validators = await rpcCall(network, 'getnextblockvalidators', []);
          committee = Array.isArray(validators)
            ? validators.map((v) => v?.publickey || v?.publicKey || v)
            : [];
        }

        // Find the index of our target node in the active validator set.
        const nodeIndex = committee.findIndex(c => c === targetPubKey);

        // Only evaluate if the node is currently in the active validator set.
        if (nodeIndex !== -1) {
          const expectedPrimaryIndex = blockCount % committee.length;
          const actualPrimaryIndex = latestBlock.primary;
          
          let currentMissCount = alert.miss_count || 0;
          let lastSeenBlock = parseInt(alert.last_seen_state) || 0;

          // Only process if we haven't checked this block height yet
          if (lastSeenBlock !== blockCount - 1) {
            // Did our target node miss its turn as primary?
            if (expectedPrimaryIndex === nodeIndex && actualPrimaryIndex !== nodeIndex) {
              currentMissCount++;
            } else if (actualPrimaryIndex === nodeIndex) {
              // If it successfully authored a block, reset the miss counter
              currentMissCount = 0;
            }

            // Save the state
            updateData.last_seen_state = (blockCount - 1).toString();
            updateData.miss_count = currentMissCount;

            // Trigger if miss count reaches threshold (e.g. 3)
            if (currentMissCount >= 3) {
              triggered = true;
              subject = `Neo ${network.toUpperCase()} Alert: Consensus Node Failing`;
              message = `
                <h2>Consensus Node Alert</h2>
                <p>The node with public key <strong>${escapeHtml(targetPubKey)}</strong> has missed <strong>${currentMissCount}</strong> consecutive rounds as the primary speaker.</p>
                <p>Last Block Height: ${blockCount - 1}</p>
              `;
            }
          }
        }
      }
      else if (alert.alert_type === 'account_event') {
        // Target is the address
        const targetAddress = alert.target;

        try {
          const latestTx = await fetchLatestAccountTx(network, targetAddress);

          if (latestTx?.txid) {
            const txHash = latestTx.txid;

            // Compare with the last known tx hash we saved in the DB
            const lastSeenHash = alert.last_seen_state || '';

            if (lastSeenHash && txHash !== lastSeenHash) {
              // We have a new transaction!
              triggered = true;
              subject = `Neo ${network.toUpperCase()} Alert: New Account Activity`;
              message = `
                <h2>Account Activity Detected</h2>
                <p>A new transaction has occurred involving your tracked address: <strong>${escapeHtml(targetAddress)}</strong></p>
                <p>Transaction Hash: <strong>${escapeHtml(txHash)}</strong></p>
                <p>View it on the explorer: <a href="https://www.neo3scan.com/transaction-info/${encodeURIComponent(txHash)}">https://www.neo3scan.com/transaction-info/${escapeHtml(txHash)}</a></p>
              `;
            }

            // Update the state so we don't alert on this hash again
            if (txHash !== lastSeenHash) {
               updateData.last_seen_state = txHash;
            }
          }
        } catch (indexerErr) {
          console.warn(`Indexer fetch failed for account ${targetAddress}:`, indexerErr.message);
        }
      }

      // If we have state to update (like new block heights or new hashes), even if not triggered, update DB
      if (Object.keys(updateData).length > 0 && !triggered) {
         await supabase
            .from('network_alerts')
            .update(updateData)
            .eq('id', alert.id);
      }

      // 4. Send email and deactivate alert
      if (triggered) {
        const emailSent = await sendEmailAlert(alert.contact, subject, message);
        if (emailSent) {
          updateData.is_active = false; // Mark inactive so it doesn't fire again immediately
          await supabase
            .from('network_alerts')
            .update(updateData)
            .eq('id', alert.id);
          triggeredCount++;
        }
      }
    }
    
    return triggeredCount;

  } catch (err) {
    console.error(`Failed checking alerts for ${network}:`, err);
    throw err;
  }
}

module.exports = async function handler(req) {
  if (!isCronAuthorized(req)) {
    return unauthorizedCronResponse();
  }

  try {
    const mainnetCount = await checkNetworkAlerts('mainnet');
    const testnetCount = await checkNetworkAlerts('testnet');
    
    return new Response(JSON.stringify({
      success: true,
      alerts_triggered: {
        mainnet: mainnetCount,
        testnet: testnetCount
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
