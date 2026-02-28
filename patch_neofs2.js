const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/NeoFSTool.vue', 'utf8');

const newRefresh = `
async function refreshAssets() {
  if (!connectedAccount.value) {
    assets.value = [];
    return;
  }
  
  isRefreshing.value = true;
  // Simulated NeoFS asset fetch
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Use the wallet address to deterministically generate pseudo-random mock data
  // so different wallets see different containers.
  const addrStr = connectedAccount.value.toString();
  const seed = addrStr.charCodeAt(0) + addrStr.charCodeAt(addrStr.length - 1);
  
  if (seed % 3 === 0) {
    // 1/3 chance: No containers
    assets.value = [];
  } else if (seed % 3 === 1) {
    // 1/3 chance: One container
    assets.value = [
      { 
        id: '3X6UaypT5f9S7H1q7WiQd3rNnQJYX4Wwwc8GqLp3xYtA', 
        name: 'Official Project Logos', 
        isPublic: true, 
        objectCount: 12, 
        size: '4.2 MB' 
      }
    ];
  } else {
    // 1/3 chance: Two containers
    assets.value = [
      { 
        id: '3X6UaypT5f9S7H1q7WiQd3rNnQJYX4Wwwc8GqLp3xYtA', 
        name: 'Official Project Logos', 
        isPublic: true, 
        objectCount: 12, 
        size: '4.2 MB' 
      },
      { 
        id: '7vB2m9NqP5xR3Z1k8L0M4S2D9F6H7J1K3L5M7N9P', 
        name: 'Backup Data', 
        isPublic: false, 
        objectCount: 3, 
        size: '128.5 MB' 
      }
    ];
  }
  
  isRefreshing.value = false;
}
`;

code = code.replace(/async function refreshAssets\(\) \{[\s\S]*?isRefreshing\.value = false;\n\}/, newRefresh);
fs.writeFileSync('src/views/Tools/NeoFSTool.vue', code);
