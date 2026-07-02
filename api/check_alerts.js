const { createClient } = require('@supabase/supabase-js');
const { callWithRpcEndpointFallback, normalizeNetwork } = require('./lib/rpcEndpoints');
const { isCronAuthorized } = require('./lib/cronAuth');
const { sendJson } = require('./lib/http');
const { runWithConcurrency } = require('./lib/concurrency');

module.exports.config = {
  runtime: 'nodejs',
  maxDuration: 60,
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

// Bound each RPC fetch so a hung/slow upstream cannot stall the whole cron and
// actually advances callWithRpcEndpointFallback to the next endpoint.
const ALERT_RPC_TIMEOUT_MS = Number(process.env.ALERT_RPC_TIMEOUT_MS) || 4000;

// Width of the account_event evaluation pool. Each account fetch costs up to
// ~16s worst case against a degraded indexer (4 candidates x 4s timeout), so
// the old strictly-serial loop let a handful of account alerts silently starve
// every later alert — including consensus alerts — inside the 60s maxDuration.
// 4 concurrent fetches keeps upstream load modest while bounding a fully
// degraded run to ceil(n/4) waves.
const ACCOUNT_ALERT_CONCURRENCY = 4;

const postRpc = async (url, method, params = []) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(ALERT_RPC_TIMEOUT_MS),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
};

const rpcCall = (network, method, params = []) =>
  callWithRpcEndpointFallback(network, (url) => postRpc(url, method, params));

function resolveLatestBlockHeight(blockCount, latestBlock) {
  const explicitHeight = Number(latestBlock?.index ?? latestBlock?.height);
  if (Number.isInteger(explicitHeight) && explicitHeight >= 0) return explicitHeight;
  return blockCount - 1;
}

function expectedPrimaryIndexForBlock(blockHeight, validatorCount) {
  const height = Number(blockHeight);
  const count = Number(validatorCount);
  if (!Number.isInteger(height) || height < 0 || !Number.isInteger(count) || count <= 0) {
    return null;
  }
  return height % count;
}

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
        signal: AbortSignal.timeout(ALERT_RPC_TIMEOUT_MS),
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
    const latestBlockHeight = resolveLatestBlockHeight(blockCount, latestBlock);
    // neo-go returns block.time in milliseconds (Neo N3 protocol), but historical neo-cli
    // returned seconds. Detect by magnitude (>1e12 ⇒ already ms) so the alert path is
    // robust across RPC providers instead of always assuming one unit.
    const blockTimeRaw = Number(latestBlock?.time);
    const currentBlockTime = !Number.isFinite(blockTimeRaw) || blockTimeRaw <= 0
      ? 0
      : blockTimeRaw > 1e12 ? blockTimeRaw : blockTimeRaw * 1000;
    const timeSinceLastBlock = currentBlockTime > 0 ? Date.now() - currentBlockTime : 0;

    let committee = null;

    // Per-run fetch memo: multiple account_event alerts tracking the same
    // address share ONE indexer fetch per cron run. The in-flight promise
    // (not the resolved value) is memoized so concurrent pool workers
    // coalesce on the same request; a rejected fetch rejects every sharing
    // alert identically, matching the old per-alert failure handling (each
    // alert would have fetched and failed independently anyway). The map
    // lives inside checkNetworkAlerts, so nothing leaks across cron runs or
    // warm lambda invocations.
    const accountTxFetches = new Map();
    const fetchLatestAccountTxDeduped = (targetNetwork, address) => {
      const key = `${targetNetwork}:${String(address || '').trim()}`;
      let pending = accountTxFetches.get(key);
      if (!pending) {
        pending = fetchLatestAccountTx(targetNetwork, address);
        accountTxFetches.set(key, pending);
      }
      return pending;
    };

    // Shared per-alert tail. Send the email first (when triggered), then
    // persist state ONCE. Deactivation (is_active=false) is the only mutation
    // gated on a successful send; the detection state (last_seen_state /
    // miss_count) is persisted regardless of delivery. Previously, when an
    // alert triggered but the email failed, updateData was dropped entirely,
    // so the next cron run re-detected the same event and re-alerted on every
    // single run — a re-alert storm that also burned the email quota.
    // Per-row UPDATEs are intentional: batching them into a single upsert has
    // a lost-update/NOT-NULL hazard, and the writes are not the bottleneck.
    const finalizeAlert = async (alert, { triggered, subject, message, updateData }) => {
      if (triggered) {
        const emailSent = await sendEmailAlert(alert.contact, subject, message);
        if (emailSent) {
          updateData.is_active = false; // Mark inactive so it doesn't fire again immediately
          triggeredCount++;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('network_alerts')
          .update(updateData)
          .eq('id', alert.id);
      }
    };

    const evaluateAccountEventAlert = async (alert) => {
      // Target is the address
      const targetAddress = alert.target;
      const evaluation = { triggered: false, subject: '', message: '', updateData: {} };

      try {
        const latestTx = await fetchLatestAccountTxDeduped(network, targetAddress);

        if (latestTx?.txid) {
          const txHash = latestTx.txid;

          // Compare with the last known tx hash we saved in the DB
          const lastSeenHash = alert.last_seen_state || '';

          if (lastSeenHash && txHash !== lastSeenHash) {
            // We have a new transaction!
            evaluation.triggered = true;
            evaluation.subject = `Neo ${network.toUpperCase()} Alert: New Account Activity`;
            evaluation.message = `
              <h2>Account Activity Detected</h2>
              <p>A new transaction has occurred involving your tracked address: <strong>${escapeHtml(targetAddress)}</strong></p>
              <p>Transaction Hash: <strong>${escapeHtml(txHash)}</strong></p>
              <p>View it on the explorer: <a href="https://www.neo3scan.com/transaction-info/${encodeURIComponent(txHash)}">https://www.neo3scan.com/transaction-info/${escapeHtml(txHash)}</a></p>
            `;
          }

          // Update the state so we don't alert on this hash again
          if (txHash !== lastSeenHash) {
            evaluation.updateData.last_seen_state = txHash;
          }
        }
      } catch (indexerErr) {
        console.warn(`Indexer fetch failed for account ${targetAddress}:`, indexerErr.message);
      }

      return evaluation;
    };

    // 3. Evaluate alerts.
    //
    // account_event alerts run through a bounded width-4 pool: each one costs
    // up to ~16s against a degraded indexer, and the old strictly-serial loop
    // starved every later alert inside the 60s budget. The pool is kicked off
    // first and awaited after the serial loop, so consensus alerts and
    // account alerts cannot starve each other. consensus_stuck /
    // consensus_missed alerts KEEP the serial loop: consensus_missed performs
    // a per-network read-modify-write against the lazily fetched shared
    // validator set, and its per-alert cost is negligible once the block data
    // is prefetched, so serial is both required and cheap there.
    const accountEventAlerts = alerts.filter((a) => a.alert_type === 'account_event');
    const serialAlerts = alerts.filter((a) => a.alert_type !== 'account_event');

    const accountEventsDone = runWithConcurrency(
      accountEventAlerts,
      async (alert) => {
        const evaluation = await evaluateAccountEventAlert(alert);
        await finalizeAlert(alert, evaluation);
      },
      ACCOUNT_ALERT_CONCURRENCY,
    );

    try {
      for (const alert of serialAlerts) {
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
              <p>Last Block Height: ${latestBlockHeight}</p>
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
            const actualPrimaryIndex = latestBlock.primary;

            let currentMissCount = alert.miss_count || 0;
            const previousMissCount = currentMissCount;
            const missThreshold = Math.max(1, Number(alert.threshold) || 3);
            let lastSeenBlock = parseInt(alert.last_seen_state) || 0;
            const expectedPrimaryIndex = expectedPrimaryIndexForBlock(latestBlockHeight, committee.length);

            // Only process if we haven't checked this block height yet
            if (expectedPrimaryIndex !== null && lastSeenBlock !== latestBlockHeight) {
              // Did our target node miss its turn as primary?
              if (expectedPrimaryIndex === nodeIndex && actualPrimaryIndex !== nodeIndex) {
                currentMissCount++;
              } else if (actualPrimaryIndex === nodeIndex) {
                // If it successfully authored a block, reset the miss counter
                currentMissCount = 0;
              }

              // Save the state
              updateData.last_seen_state = latestBlockHeight.toString();
              updateData.miss_count = currentMissCount;

              // Trigger only when crossing the threshold for this incident.
              // If email delivery fails or the alert remains active, do not
              // resend on every later block in the same missed-primary streak.
              if (currentMissCount >= missThreshold && previousMissCount < missThreshold) {
                triggered = true;
                subject = `Neo ${network.toUpperCase()} Alert: Consensus Node Failing`;
                message = `
                  <h2>Consensus Node Alert</h2>
                  <p>The node with public key <strong>${escapeHtml(targetPubKey)}</strong> has missed <strong>${currentMissCount}</strong> consecutive rounds as the primary speaker.</p>
                  <p>Last Block Height: ${latestBlockHeight}</p>
                `;
              }
            }
          }
        }

        await finalizeAlert(alert, { triggered, subject, message, updateData });
      }
    } finally {
      // Always drain the account pool — even when the serial loop throws —
      // so no email send / row update is left detached when the lambda
      // freezes after the response. runWithConcurrency never rejects (it
      // traps per-alert failures in-slot), so this cannot mask a serial
      // error; it only defers it until the pool has finished.
      const accountResults = await accountEventsDone;
      accountResults.forEach((result, i) => {
        if (result && result.__error) {
          // Surface pooled failures (e.g. a thrown Resend fetch) in the logs.
          // Under the old serial loop these throws aborted every remaining
          // alert; now they are contained per-alert but must stay visible.
          console.error(
            `[check_alerts] account_event alert ${accountEventAlerts[i]?.id} failed:`,
            result.__error,
          );
        }
      });
    }

    return triggeredCount;

  } catch (err) {
    console.error(`Failed checking alerts for ${network}:`, err);
    throw err;
  }
}

async function handler(req, res) {
  if (!isCronAuthorized(req)) {
    return sendJson(res, 401, { success: false, error: 'Unauthorized cron request' });
  }

  // Evaluate both networks independently: a mainnet RPC/Supabase failure must
  // not prevent testnet alerts from being processed (previously they ran
  // sequentially in one try block, so a mainnet throw starved testnet entirely).
  const [mainnetResult, testnetResult] = await Promise.allSettled([
    checkNetworkAlerts('mainnet'),
    checkNetworkAlerts('testnet'),
  ]);

  const valueOf = (r) => (r.status === 'fulfilled' ? r.value : null);
  const errorOf = (r) =>
    r.status === 'rejected' ? String(r.reason?.message || r.reason) : undefined;

  const errors = {
    mainnet: errorOf(mainnetResult),
    testnet: errorOf(testnetResult),
  };
  const bothFailed =
    mainnetResult.status === 'rejected' && testnetResult.status === 'rejected';

  return sendJson(res, bothFailed ? 500 : 200, {
    success: !bothFailed,
    alerts_triggered: {
      mainnet: valueOf(mainnetResult),
      testnet: valueOf(testnetResult),
    },
    ...(errors.mainnet || errors.testnet ? { errors } : {}),
  });
}

handler._internal = {
  checkNetworkAlerts,
  expectedPrimaryIndexForBlock,
  resolveLatestBlockHeight,
  setSupabaseClientForTests(client) {
    supabaseClient = client;
  },
};

module.exports = handler;
