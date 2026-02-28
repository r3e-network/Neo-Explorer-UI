const fs = require('fs');

const path = 'src/views/Account/components/AddressNftsTab.vue';
let content = fs.readFileSync(path, 'utf8');

// Imports
content = content.replace(
  'import { truncateHash } from "@/utils/explorerFormat";',
  'import { truncateHash } from "@/utils/explorerFormat";\nimport { tokenService } from "@/services/tokenService";'
);

content = content.replace(
  'import EmptyState from "@/components/common/EmptyState.vue";',
  'import EmptyState from "@/components/common/EmptyState.vue";\nimport { ref, watch } from "vue";'
);

// Token Details reactivity
const tokenDetailsBlock = `
const tokenDetails = ref({});

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
}, { immediate: true });
`;

content = content.replace('defineProps({', 'const props = defineProps({');
content = content.replace('defineEmits(["retry"]);\n', 'defineEmits(["retry"]);\n\n' + tokenDetailsBlock);

// Helper replacements
content = content.replace(
  `function assetStandard(asset) {
  return String(asset?.standard || asset?.type || "Unknown");
}`,
  `function assetStandard(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (tokenDetails.value[hash]) return tokenDetails.value[hash].type || tokenDetails.value[hash].standard || "NEP11";
  return String(asset?.standard || asset?.type || "NEP11");
}`
);

content = content.replace(
  `function assetDisplayName(asset) {
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}`,
  `function assetDisplayName(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (tokenDetails.value[hash]) return tokenDetails.value[hash].tokenname || tokenDetails.value[hash].symbol || tokenDetails.value[hash].name;
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}`
);

fs.writeFileSync(path, content);
console.log('Updated AddressNftsTab.vue');
