const fs = require('fs');

const path = 'src/views/Account/components/AddressTokensTab.vue';
let content = fs.readFileSync(path, 'utf8');

// Remove Value (USD) column
content = content.replace('<th class="table-header-cell-right">Value (USD)</th>\n', '');
content = content.replace('<td class="table-cell-secondary-right italic">-</td>\n', '');

// Imports
content = content.replace(
  'import { truncateHash, formatTokenAmount } from "@/utils/explorerFormat";',
  'import { truncateHash, formatTokenAmount } from "@/utils/explorerFormat";\nimport { tokenService } from "@/services/tokenService";\nimport { KNOWN_CONTRACTS } from "@/constants/knownContracts";'
);

content = content.replace(
  'import { computed } from "vue";',
  'import { ref, computed, watch } from "vue";'
);

// Token Details reactivity
const tokenDetailsBlock = `
const tokenDetails = ref({});

watch(() => props.assets, async (newAssets) => {
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
}, { immediate: true });
`;

content = content.replace('defineEmits(["retry"]);\n', 'defineEmits(["retry"]);\n\n' + tokenDetailsBlock);

// Helper replacements
content = content.replace(
  `function assetStandard(asset) {
  return String(asset?.standard || asset?.type || "Unknown");
}`,
  `function assetStandard(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (NATIVE_CONTRACTS[hash] || KNOWN_CONTRACTS[hash]) return "NEP17";
  if (tokenDetails.value[hash]) return tokenDetails.value[hash].type || tokenDetails.value[hash].standard || "NEP17";
  return String(asset?.standard || asset?.type || "NEP17");
}`
);

content = content.replace(
  `function assetDisplayName(asset) {
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}`,
  `function assetDisplayName(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (NATIVE_CONTRACTS[hash]) return NATIVE_CONTRACTS[hash].symbol || NATIVE_CONTRACTS[hash].name;
  if (KNOWN_CONTRACTS[hash]) return KNOWN_CONTRACTS[hash].symbol || KNOWN_CONTRACTS[hash].name;
  if (tokenDetails.value[hash]) return tokenDetails.value[hash].tokenname || tokenDetails.value[hash].symbol || tokenDetails.value[hash].name;
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}`
);

content = content.replace(
  `function assetDecimals(asset) {
  const explicit = Number(asset?.decimals);
  if (Number.isInteger(explicit) && explicit >= 0) return explicit;

  const native = NATIVE_CONTRACTS[normalizeAssetHash(assetHash(asset))];
  if (native && Number.isInteger(native.decimals) && native.decimals >= 0) return native.decimals;

  return null;
}`,
  `function assetDecimals(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  const native = NATIVE_CONTRACTS[hash];
  if (native && Number.isInteger(native.decimals) && native.decimals >= 0) return native.decimals;

  if (tokenDetails.value[hash] && tokenDetails.value[hash].decimals !== undefined) {
    return Number(tokenDetails.value[hash].decimals);
  }

  const explicit = Number(asset?.decimals);
  if (Number.isInteger(explicit) && explicit >= 0) return explicit;

  return null;
}`
);

fs.writeFileSync(path, content);
console.log('Updated AddressTokensTab.vue');
