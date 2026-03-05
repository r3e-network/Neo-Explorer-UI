const { createClient } = require('@supabase/supabase-js');
const { callWithRpcEndpointFallback } = require('./lib/rpcEndpoints');

module.exports.config = {
  runtime: 'edge',
};

// Supabase client initialization
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function postRpc(url, method, params = []) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

const rpcCall = (network, method, params = []) =>
  callWithRpcEndpointFallback(network, (url) => postRpc(url, method, params));

async function syncNetwork(network) {
  try {
    const mempoolData = await rpcCall(network, 'getrawmempool', [true]);
    const hashes = [...mempoolData.verified, ...mempoolData.unverified].slice(0, 1000);
    
    // Fetch currently stored hashes to find what's missing
    const { data: storedTxs } = await supabase
      .from('mempool_transactions')
      .select('hash')
      .eq('network', network);
      
    const storedHashes = storedTxs ? storedTxs.map(t => t.hash) : [];
    
    const hashesToFetch = hashes.filter(h => !storedHashes.includes(h));
    
    const newRecords = [];
    for (const hash of hashesToFetch) {
      try {
        const txData = await rpcCall(network, 'getrawtransaction', [hash, true]);
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
      } catch (err) {
        console.warn(`Could not fetch tx ${hash}:`, err.message);
      }
    }
    
    if (newRecords.length > 0) {
      await supabase.from('mempool_transactions').upsert(newRecords, { onConflict: 'hash' });
    }
    
    // Delete any hashes that are no longer in the node's mempool
    const toDelete = storedHashes.filter(h => !hashes.includes(h));
    
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

module.exports = async function handler(req) {
  try {
    const mainnetResult = await syncNetwork('mainnet');
    const testnetResult = await syncNetwork('testnet');
    
    return new Response(JSON.stringify({
      success: true,
      mainnet: mainnetResult,
      testnet: testnetResult
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
