import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fetch = require('node-fetch');

const HOST = 'http://198.244.215.132:1927';

async function testRpc() {
  try {
    console.log("Fetching GetDailyTransactions...");
    const res = await fetch(HOST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetDailyTransactions', params: { Days: 7 } })
    });
    const data = await res.json();
    console.log("GetDailyTransactions:", JSON.stringify(data));
  } catch (e) {
    console.log("Error:", e);
  }
}

testRpc();
