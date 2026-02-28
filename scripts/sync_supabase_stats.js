// This script is designed to be run as a cron job (e.g. via Vercel Cron or Supabase Edge Functions)
// It fetches stats from Neo3Fura and updates the Supabase tables.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xistvcqaiusnhrujnpaz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Needed for inserting

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MAINNET_RPC = 'https://neofura.ngd.network';

async function fetchNeo3Fura(method, params = {}) {
  const req = await fetch(MAINNET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  const res = await req.json();
  return res.result;
}

async function syncDailyStats() {
  console.log("Syncing Daily Stats...");
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const txCountReq = await fetchNeo3Fura('GetTransactionCount');
    
    const { error } = await supabase.from('daily_stats').upsert({
      date: today,
      network: 'mainnet',
      tx_count: txCountReq ? txCountReq.count || 0 : 0,
      active_addresses: 0, 
      new_addresses: 0
    }, { onConflict: 'date, network' });
    
    if (error) console.error("Error inserting daily stats", error);
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY env variable.");
    process.exit(1);
  }
  await syncDailyStats();
  console.log("Done.");
}

if (require.main === module) {
  run();
}

module.exports = { syncDailyStats };
