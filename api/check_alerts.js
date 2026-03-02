const { createClient } = require('@supabase/supabase-js');

module.exports.config = {
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

const NEOFURA_ENDPOINTS = {
  mainnet: 'https://neofura.ngd.network',
  testnet: 'https://testmagnet.ngd.network'
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

async function furaCall(url, method, params = {}) {
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
    // Fail silently in dev without throwing if no API key is provided
    return false;
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
  const furaUrl = NEOFURA_ENDPOINTS[network];
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

    // Pre-fetch global state to avoid redundant calls inside the loop
    const blockCount = await rpcCall(rpcUrl, 'getblockcount', []);
    const latestBlock = await rpcCall(rpcUrl, 'getblock', [blockCount - 1, 1]);
    const currentBlockTime = latestBlock.time * 1000; // ms
    const timeSinceLastBlock = Date.now() - currentBlockTime;

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
        // Target is the public key of the consensus node
        const targetPubKey = alert.target;
        
        // Fetch committee if not already fetched
        if (!committee) {
          committee = await rpcCall(rpcUrl, 'getcommittee', []);
        }

        // Find the index of our target node in the active committee
        const nodeIndex = committee.findIndex(c => c === targetPubKey);
        
        // Only evaluate if the node is actually in the active committee
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
              subject = `🚨 Neo ${network.toUpperCase()} Alert: Consensus Node Failing`;
              message = `
                <h2>Consensus Node Alert</h2>
                <p>The node with public key <strong>${targetPubKey}</strong> has missed <strong>${currentMissCount}</strong> consecutive rounds as the primary speaker.</p>
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
          const furaRes = await furaCall(furaUrl, 'GetRawTransactionByAddress', {
            Address: targetAddress,
            Limit: 1,
            Skip: 0
          });

          if (furaRes && furaRes.result && furaRes.result.length > 0) {
            const latestTx = furaRes.result[0];
            const txHash = latestTx.hash;
            
            // Compare with the last known tx hash we saved in the DB
            const lastSeenHash = alert.last_seen_state || '';

            if (lastSeenHash && txHash !== lastSeenHash) {
              // We have a new transaction!
              triggered = true;
              subject = `🔔 Neo ${network.toUpperCase()} Alert: New Account Activity`;
              message = `
                <h2>Account Activity Detected</h2>
                <p>A new transaction has occurred involving your tracked address: <strong>${targetAddress}</strong></p>
                <p>Transaction Hash: <strong>${txHash}</strong></p>
                <p>View it on the explorer: <a href="https://explorer.neo.org/transaction/${txHash}">https://explorer.neo.org/transaction/${txHash}</a></p>
              `;
            }

            // Update the state so we don't alert on this hash again
            if (txHash !== lastSeenHash) {
               updateData.last_seen_state = txHash;
            }
          }
        } catch (furaErr) {
          console.warn(`NeoFura fetch failed for account ${targetAddress}:`, furaErr.message);
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
