const fs = require('fs');

let file = fs.readFileSync('src/views/Account/components/AddressTokensTab.vue', 'utf8');

const importReplacement = `import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import { supabaseService } from "@/services/supabaseService";`;

file = file.replace('import { KNOWN_CONTRACTS } from "@/constants/knownContracts";', importReplacement);

const watchCode = `import EmptyState from "@/components/common/EmptyState.vue";

const props = defineProps({
  assets: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
});

const supabaseMeta = ref({});

watch(() => props.assets, async (newAssets) => {
  if (newAssets && newAssets.length) {
    const hashes = newAssets.map(a => assetHash(a)).filter(Boolean);
    const meta = await supabaseService.getContractMetadataBatch(hashes);
    supabaseMeta.value = meta;
  } else {
    supabaseMeta.value = {};
  }
}, { immediate: true });

defineEmits(["retry"]);`;

file = file.replace(/import EmptyState from "@\/components\/common\/EmptyState\.vue";\n\nconst props = defineProps\(\{\n  assets: \{ type: Array, default: \(\) => \[\] \},\n  loading: \{ type: Boolean, default: false \},\n  error: \{ type: String, default: "" \},\n\}\);\n\ndefineEmits\(\["retry"\]\);/, watchCode);

// The import needs `ref, watch` if not already there, it's currently: `import { computed } from "vue";`
file = file.replace('import { computed } from "vue";', 'import { computed, ref, watch } from "vue";');

// Update assetDisplayName
const assetDisplayNameOld = `function assetDisplayName(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (NATIVE_CONTRACTS[hash]) return NATIVE_CONTRACTS[hash].symbol || NATIVE_CONTRACTS[hash].name;
  if (KNOWN_CONTRACTS[hash]) return KNOWN_CONTRACTS[hash].symbol || KNOWN_CONTRACTS[hash].name;
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}`;

const assetDisplayNameNew = `function assetDisplayName(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (supabaseMeta.value[hash]?.symbol) return supabaseMeta.value[hash].symbol;
  if (NATIVE_CONTRACTS[hash]) return NATIVE_CONTRACTS[hash].symbol || NATIVE_CONTRACTS[hash].name;
  if (KNOWN_CONTRACTS[hash]) return KNOWN_CONTRACTS[hash].symbol || KNOWN_CONTRACTS[hash].name;
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}`;
file = file.replace(assetDisplayNameOld, assetDisplayNameNew);

// Update template
const imgOld = `<img v-if="hasTokenIcon(assetHash(asset))" :src="getTokenIcon(assetHash(asset), assetStandard(asset))" class="h-6 w-6 rounded-full object-cover" alt="" />
                <span v-else`;
const imgNew = `<img v-if="supabaseMeta[assetHash(asset)]?.logo_url" :src="supabaseMeta[assetHash(asset)].logo_url" class="h-6 w-6 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="" />
                <img v-else-if="hasTokenIcon(assetHash(asset))" :src="getTokenIcon(assetHash(asset), assetStandard(asset))" class="h-6 w-6 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="" />
                <span v-else`;
file = file.replace(imgOld, imgNew);

const nameOld = `<span class="text-high text-sm font-medium">
                  {{ assetDisplayName(asset) }}
                </span>`;
const nameNew = `<span class="text-high text-sm font-medium flex items-center gap-1">
                  {{ assetDisplayName(asset) }}
                  <svg v-if="supabaseMeta[assetHash(asset)]?.is_verified" class="h-3.5 w-3.5 text-success" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </span>`;
file = file.replace(nameOld, nameNew);

fs.writeFileSync('src/views/Account/components/AddressTokensTab.vue', file);
