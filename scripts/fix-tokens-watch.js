const fs = require('fs');

const path = 'src/views/Account/components/AddressTokensTab.vue';
let content = fs.readFileSync(path, 'utf8');

const oldWatch = `watch(() => props.assets, async (newAssets) => {
  if (!newAssets || !newAssets.length) return;
  for (const asset of newAssets) {
    const hash = normalizeAssetHash(assetHash(asset));
    if (!hash || NATIVE_CONTRACTS[hash]) continue;
    
    if (!tokenDetails.value[hash]) {
      try {
        const info = await tokenService.getByHash(hash);
        if (info) {
          tokenDetails.value[hash] = info;
        }
      } catch (e) {
        // Ignore
      }
    }
  }
}, { immediate: true });`;

const newWatch = `watch(() => props.assets, async (newAssets) => {
  if (!newAssets || !newAssets.length) return;
  
  const promises = newAssets.map(async (asset) => {
    const hash = normalizeAssetHash(assetHash(asset));
    if (!hash || NATIVE_CONTRACTS[hash] || KNOWN_CONTRACTS[hash]) return;
    
    if (!tokenDetails.value[hash]) {
      try {
        const info = await tokenService.getByHash(hash);
        if (info) {
          tokenDetails.value[hash] = info;
        }
      } catch (e) {
        // Ignore
      }
    }
  });

  await Promise.all(promises);
}, { immediate: true });`;

content = content.replace(oldWatch, newWatch);
fs.writeFileSync(path, content);
console.log('Fixed watch');
