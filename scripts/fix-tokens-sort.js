const fs = require('fs');

const path = 'src/views/Account/components/AddressTokensTab.vue';
let content = fs.readFileSync(path, 'utf8');

const oldSort = `const sortedAssets = computed(() =>
  [...props.assets].sort((a, b) => {
    const balA = Number(a?.balance ?? a?.amount ?? 0);
    const balB = Number(b?.balance ?? b?.amount ?? 0);
    return balB - balA;
  })
);`;

const newSort = `const sortedAssets = computed(() =>
  [...props.assets].sort((a, b) => {
    const decA = assetDecimals(a) ?? 0;
    const decB = assetDecimals(b) ?? 0;
    const valA = Number(a?.balance ?? a?.amount ?? 0) / Math.pow(10, decA);
    const valB = Number(b?.balance ?? b?.amount ?? 0) / Math.pow(10, decB);
    return valB - valA;
  })
);`;

content = content.replace(oldSort, newSort);

// Because assetDecimals is defined after sortedAssets, we need to move sortedAssets below the helper functions.
content = content.replace(newSort, '');
// find 'function assetKey(asset)' and place newSort before it.
content = content.replace('function assetKey(asset)', newSort + '\n\nfunction assetKey(asset)');

fs.writeFileSync(path, content);
console.log('Fixed sortedAssets');
