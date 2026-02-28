async function fetchHeight(url) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "GetBlockCount",
        params: {},
        id: 1
      })
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    // NeoFura backend returns the height inside a nested object: { result: { index: X } }
    return data?.result?.index ?? data?.result ?? "Error parsing";
  } catch (e) {
    return `Offline (${e.message})`;
  }
}

async function checkHeights() {
  // These are the default proxies configured in your vite.config.js
  const mainnetUrl = 'https://neofura.ngd.network';
  const testnetUrl = 'https://testmagnet.ngd.network';

  const [mainnetHeight, testnetHeight] = await Promise.all([
    fetchHeight(mainnetUrl),
    fetchHeight(testnetUrl)
  ]);
  
  console.clear();
  console.log(`=================================`);
  console.log(`   Neo-Explorer Backend Monitor  `);
  console.log(`=================================`);
  console.log(`Time:    ${new Date().toLocaleTimeString()}`);
  console.log(`Mainnet: ${typeof mainnetHeight === 'number' ? mainnetHeight.toLocaleString() : mainnetHeight}`);
  console.log(`Testnet: ${typeof testnetHeight === 'number' ? testnetHeight.toLocaleString() : testnetHeight}`);
  console.log(`=================================`);
  console.log(`Press Ctrl+C to exit...`);
}

// Run immediately, then every 3 seconds
checkHeights();
setInterval(checkHeights, 3000);
