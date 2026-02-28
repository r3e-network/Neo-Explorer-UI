import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

// Initialization
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const RESEND_API_KEY = process.env.RESEND_API_KEY; // You need to add this in Vercel Dashboard

const RPC_ENDPOINTS = {
  mainnet: 'https://mainnet1.neo.coz.io:443',
  testnet: 'https://testnet1.neo.coz.io:443'
};

async function rpcCall(url, method, params = []) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// Helper to send email via Resend API
async function sendEmailAlert(emailAddress, subject, htmlContent) {
  if (!RESEND_API_KEY) {
    console.warn(`[Mock Email] To: ${emailAddress} | Subject: ${subject}`);
    return true; // Pretend it succeeded if no API key is provided
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Neo Explorer Alerts <alerts@yourdomain.com>',
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
  const rpcUrl = RPC_ENDPOINTS[network];
  let triggeredCount = 0;

  try {
    // 1. Fetch active alerts for this network
    const { data: alerts, error } = await supabase
      .from('network_alerts')
      .select('*')
      .eq('network', network)
      .eq('is_active', true);

    if (error) throw error;
    if (!alerts || alerts.length === 0) return 0;

    // 2. Fetch current blockchain state
    const blockCount = await rpcCall(rpcUrl, 'getblockcount', []);
    const latestBlock = await rpcCall(rpcUrl, 'getblock', [blockCount - 1, 1]);
    const currentBlockTime = latestBlock.time * 1000; // ms
    const timeSinceLastBlock = Date.now() - currentBlockTime;

    // 3. Evaluate alerts
    for (const alert of alerts) {
      let triggered = false;
      let subject = '';
      let message = '';

      if (alert.alert_type === 'consensus_stuck') {
        const thresholdMs = alert.threshold * 1000;
        if (timeSinceLastBlock > thresholdMs) {
          triggered = true;
          subject = `⚠️ Neo ${network.toUpperCase()} Alert: Consensus Delayed`;
          message = `
            <h2>Neo Network Alert</h2>
            <p>The Neo ${network} network has not generated a block for over <strong>${alert.threshold} seconds</strong>.</p>
            <p>Time since last block: ${Math.floor(timeSinceLastBlock / 1000)}s.</p>
            <p>Last Block Height: ${blockCount - 1}</p>
          `;
        }
      } 
      else if (alert.alert_type === 'consensus_missed') {
        // Here you would implement logic scanning the last N blocks' NextConsensus or validators
        // For demonstration, we bypass complex verification.
      }
      else if (alert.alert_type === 'account_event') {
        // You would query NeoFura or similar indexer for the latest txs involving alert.target
      }

      // 4. Send email and deactivate alert (to prevent spamming every minute)
      if (triggered) {
        const emailSent = await sendEmailAlert(alert.contact, subject, message);
        if (emailSent) {
          await supabase
            .from('network_alerts')
            .update({ is_active: false }) // Mark inactive so it doesn't fire again immediately
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

export default async function handler(req) {
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
