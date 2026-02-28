import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fetch = require('node-fetch');

const HOST = 'http://198.244.215.132:1927';

async function testRpc() {
  try {
    console.log("Fetching GetBlockCount...");
    const res = await fetch(HOST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetBlockCount', params: {} })
    });
    const data = await res.json();
    console.log("GetBlockCount:", JSON.stringify(data));
    
    console.log("Fetching GetContractCount...");
    const res2 = await fetch(HOST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetContractCount', params: {} })
    });
    const data2 = await res2.json();
    console.log("GetContractCount:", JSON.stringify(data2));
  } catch (e) {
    console.log("Error:", e);
  }
}

testRpc();
