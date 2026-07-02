const { createClient } = require('@supabase/supabase-js');
const { callWithRpcEndpointFallback } = require('./lib/rpcEndpoints');
const { isCronAuthorized } = require('./lib/cronAuth');
const { sendJson } = require('./lib/http');

module.exports.config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

// Lazy-init the Supabase client so a missing env var does not crash the
// edge module on cold start (which would 500 every cron fire).
let supabaseClient = null;
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  // This cron performs privileged writes (upsert/delete on mempool_transactions),
  // so it MUST use a service-role key. Never silently fall back to the public
  // anon key — that key cannot bypass RLS and would make the writes fail or
  // expose a public key for privileged operations.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "Mempool sync storage is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }
  supabaseClient = createClient(url, key);
  return supabaseClient;
}

async function postRpc(url, method, params = []) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(Number(process.env.RPC_FETCH_TIMEOUT_MS) || 4000),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

const rpcCall = (network, method, params = []) =>
  callWithRpcEndpointFallback(network, (url) => postRpc(url, method, params));

// Bound the per-run enrichment work. Previously every new mempool hash (up to
// ~1000/run, every minute) triggered a sequential getrawtransaction, which
// could pile up unbounded upstream load and risk the function timing out.
const MAX_TX_FETCH_PER_RUN = 150;
const TX_FETCH_CONCURRENCY = 8;
const TX_FETCH_DEADLINE_MS = 25_000;

async function runWithConcurrency(items, worker, concurrency) {
  const results = new Array(items.length);
  let cursor = 0;
  const pool = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      try {
        results[idx] = await worker(items[idx], idx);
      } catch (e) {
        results[idx] = { __error: e?.message || String(e) };
      }
    }
  });
  await Promise.all(pool);
  return results;
}

async function syncNetwork(network) {
  try {
    const supabase = getSupabaseClient();
    const mempoolData = await rpcCall(network, 'getrawmempool', [true]);
    const hashes = [...mempoolData.verified, ...mempoolData.unverified].slice(0, 1000);

    // Fetch currently stored hashes to find what's missing
    const { data: storedTxs } = await supabase
      .from('mempool_transactions')
      .select('hash')
      .eq('network', network);
      
    const storedHashes = storedTxs ? storedTxs.map(t => t.hash) : [];
    
    const storedHashSet = new Set(storedHashes);
    // Cap the number of new hashes we enrich per run and stop fetching once an
    // overall deadline is hit, so a large mempool can't stall the cron.
    const hashesToFetch = hashes.filter(h => !storedHashSet.has(h)).slice(0, MAX_TX_FETCH_PER_RUN);

    const deadlineAt = Date.now() + TX_FETCH_DEADLINE_MS;
    const fetched = await runWithConcurrency(
      hashesToFetch,
      async (hash) => {
        if (Date.now() >= deadlineAt) return { __error: 'deadline exceeded' };
        const txData = await rpcCall(network, 'getrawtransaction', [hash, true]);
        return { hash, txData };
      },
      TX_FETCH_CONCURRENCY,
    );

    const newRecords = [];
    for (const result of fetched) {
      if (!result || result.__error) {
        if (result?.__error && result.__error !== 'deadline exceeded') {
          console.warn(`Could not fetch tx:`, result.__error);
        }
        continue;
      }
      const { hash, txData } = result;
      newRecords.push({
        hash,
        network,
        sender: txData.signers?.[0]?.account || '',
        size: txData.size || 0,
        netfee: parseInt(txData.netfee || 0),
        sysfee: parseInt(txData.sysfee || 0),
        valid_until_block: txData.validuntilblock || 0,
        timestamp: Date.now(), // Node doesn't give mempool insertion time, so we track when we first saw it
        status: 'pending'
      });
    }

    if (newRecords.length > 0) {
      await supabase.from('mempool_transactions').upsert(newRecords, { onConflict: 'hash' });
    }
    
    // Delete any hashes that are no longer in the node's mempool.
    // Set membership instead of Array.includes: with up to 1000 mempool
    // hashes and an unbounded stored set this was an O(n*m) scan per run.
    const mempoolHashSet = new Set(hashes);
    const toDelete = storedHashes.filter(h => !mempoolHashSet.has(h));
    
    if (toDelete.length > 0) {
      await supabase
        .from('mempool_transactions')
        .delete()
        .eq('network', network)
        .in('hash', toDelete);
    }
    
    // Also, theoretically clean up if validuntilblock < current block height (done automatically via above sync as node drops them)
    // But we can double check
    const blockCount = await rpcCall(network, 'getblockcount', []);
    await supabase
      .from('mempool_transactions')
      .delete()
      .eq('network', network)
      .lt('valid_until_block', blockCount);

    return { 
      synced: newRecords.length, 
      deleted: toDelete.length, 
      total: hashes.length 
    };

  } catch (err) {
    console.error(`Failed to sync mempool for ${network}:`, err);
    throw err;
  }
}

async function handler(req, res) {
  if (!isCronAuthorized(req)) {
    return sendJson(res, 401, { success: false, error: 'Unauthorized cron request' });
  }

  // Sync both networks independently: a mainnet RPC/Supabase failure must not
  // prevent the testnet mempool from being synced (previously they ran
  // sequentially in one try block, so a mainnet throw starved testnet entirely
  // — the same starvation bug already fixed in check_alerts). The rows each
  // pass touches are disjoint (every read/delete is scoped by network), and
  // running them concurrently also stops the two 25s per-network fetch
  // deadlines from stacking sequentially against the 60s function budget.
  const [mainnetResult, testnetResult] = await Promise.allSettled([
    syncNetwork('mainnet'),
    syncNetwork('testnet'),
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
    mainnet: valueOf(mainnetResult),
    testnet: valueOf(testnetResult),
    ...(errors.mainnet || errors.testnet ? { errors } : {}),
  });
}

handler._internal = {
  syncNetwork,
  setSupabaseClientForTests(client) {
    supabaseClient = client;
  },
};

module.exports = handler;
