const fs = require('fs');

const pathTokens = 'src/views/Account/components/AddressTokensTab.vue';
let contentT = fs.readFileSync(pathTokens, 'utf8');

// remove the watch block and tokenService import
contentT = contentT.replace(
  'import { tokenService } from "@/services/tokenService";\nimport { KNOWN_CONTRACTS } from "@/constants/knownContracts";',
  'import { KNOWN_CONTRACTS } from "@/constants/knownContracts";'
);

contentT = contentT.replace(
  'import { ref, computed, watch } from "vue";',
  'import { computed } from "vue";'
);

const watchBlockT = `const tokenDetails = ref({});

watch(() => props.assets, async (newAssets) => {
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

contentT = contentT.replace(watchBlockT, '');

contentT = contentT.replace(
  `function assetStandard(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (NATIVE_CONTRACTS[hash] || KNOWN_CONTRACTS[hash]) return "NEP17";
  if (tokenDetails.value[hash]) return tokenDetails.value[hash].type || tokenDetails.value[hash].standard || "NEP17";
  return String(asset?.standard || asset?.type || "NEP17");
}`,
  `function assetStandard(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (NATIVE_CONTRACTS[hash] || KNOWN_CONTRACTS[hash]) return "NEP17";
  return String(asset?.standard || asset?.type || "NEP17");
}`
);

contentT = contentT.replace(
  `function assetDisplayName(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (NATIVE_CONTRACTS[hash]) return NATIVE_CONTRACTS[hash].symbol || NATIVE_CONTRACTS[hash].name;
  if (KNOWN_CONTRACTS[hash]) return KNOWN_CONTRACTS[hash].symbol || KNOWN_CONTRACTS[hash].name;
  if (tokenDetails.value[hash]) return tokenDetails.value[hash].tokenname || tokenDetails.value[hash].symbol || tokenDetails.value[hash].name;
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}`,
  `function assetDisplayName(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (NATIVE_CONTRACTS[hash]) return NATIVE_CONTRACTS[hash].symbol || NATIVE_CONTRACTS[hash].name;
  if (KNOWN_CONTRACTS[hash]) return KNOWN_CONTRACTS[hash].symbol || KNOWN_CONTRACTS[hash].name;
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}`
);

contentT = contentT.replace(
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
}`,
  `function assetDecimals(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  const native = NATIVE_CONTRACTS[hash];
  if (native && Number.isInteger(native.decimals) && native.decimals >= 0) return native.decimals;

  const explicit = Number(asset?.decimals);
  if (Number.isInteger(explicit) && explicit >= 0) return explicit;

  return null;
}`
);

fs.writeFileSync(pathTokens, contentT);

const pathNfts = 'src/views/Account/components/AddressNftsTab.vue';
let contentN = fs.readFileSync(pathNfts, 'utf8');

contentN = contentN.replace(
  'import { truncateHash } from "@/utils/explorerFormat";\nimport { tokenService } from "@/services/tokenService";',
  'import { truncateHash } from "@/utils/explorerFormat";'
);

contentN = contentN.replace(
  'import EmptyState from "@/components/common/EmptyState.vue";\nimport { ref, watch } from "vue";',
  'import EmptyState from "@/components/common/EmptyState.vue";'
);

contentN = contentN.replace('const props = defineProps({', 'defineProps({');

const watchBlockN = `const tokenDetails = ref({});

function normalizeAssetHash(hash) {
  const normalized = String(hash || "").trim().toLowerCase();
  if (!normalized) return "";
  return normalized.startsWith("0x") ? normalized : \`0x\${normalized}\`;
}

watch(() => props.assets, async (newAssets) => {
  if (!newAssets || !newAssets.length) return;
  
  const promises = newAssets.map(async (asset) => {
    const hash = normalizeAssetHash(assetHash(asset));
    if (!hash) return;
    
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

contentN = contentN.replace(watchBlockN, '');

contentN = contentN.replace(
  `function assetStandard(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (tokenDetails.value[hash]) return tokenDetails.value[hash].type || tokenDetails.value[hash].standard || "NEP11";
  return String(asset?.standard || asset?.type || "NEP11");
}`,
  `function assetStandard(asset) {
  return String(asset?.standard || asset?.type || "Unknown");
}`
);

contentN = contentN.replace(
  `function assetDisplayName(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (tokenDetails.value[hash]) return tokenDetails.value[hash].tokenname || tokenDetails.value[hash].symbol || tokenDetails.value[hash].name;
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}`,
  `function assetDisplayName(asset) {
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}`
);

fs.writeFileSync(pathNfts, contentN);

console.log('Reverted tabs');
