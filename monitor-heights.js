const { rpc } = require('@cityofzion/neon-js');

const mainnetClient = new rpc.RPCClient('https://mainnet1.neo.coz.io:443');
const testnetClient = new rpc.RPCClient('https://testnet1.neo.coz.io:443');

async function checkHeights() {
  try {
    const [mainnetHeight, testnetHeight] = await Promise.all([
      mainnetClient.getBlockCount(),
      testnetClient.getBlockCount()
    ]);
    
    console.clear();
    console.log(`=================================`);
    console.log(`      Neo N3 Block Monitor       `);
    console.log(`=================================`);
    console.log(`Time:    ${new Date().toLocaleTimeString()}`);
    console.log(`Mainnet: ${mainnetHeight.toLocaleString()}`);
    console.log(`Testnet: ${testnetHeight.toLocaleString()}`);
    console.log(`=================================`);
    console.log(`Press Ctrl+C to exit...`);
  } catch (e) {
    console.error("Error fetching heights:", e.message);
  }
}

// Fetch immediately, then every 3 seconds
checkHeights();
setInterval(checkHeights, 3000);
