<template>
  <section>
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="index in 5" :key="index" height="46px" />
    </div>

    <ErrorState v-else-if="error" title="Unable to load token holdings" :message="error" @retry="$emit('retry')" />

    <EmptyState
      v-else-if="!assets.length"
      message="No token holdings"
      description="No NEP-17 balances were found for this address."
    />

    <div v-else class="surface-panel overflow-x-auto">
      <table class="w-full min-w-[700px]" aria-label="Address token holdings">
        <caption class="sr-only">
          NEP-17 token balances for this address
        </caption>
        <thead class="table-head">
          <tr>
            <th class="table-header-cell">Token</th>
            <th class="table-header-cell">Standard</th>
            <th class="table-header-cell-right">Balance</th>
                        <th class="table-header-cell">Contract</th>
          </tr>
        </thead>
        <tbody class="soft-divider divide-y">
          <tr
            v-for="asset in sortedAssets"
            :key="assetKey(asset)"
            class="list-row group"
          >
            <td class="table-cell">
              <div class="flex items-center gap-2">
                <img v-if="supabaseMeta[assetHash(asset)]?.logo_url" :src="supabaseMeta[assetHash(asset)].logo_url" class="h-6 w-6 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="" />
                <img v-else-if="hasTokenIcon(assetHash(asset))" :src="getTokenIcon(assetHash(asset), assetStandard(asset))" class="h-6 w-6 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="" />
                <span v-else
                  class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  :class="tokenColor(assetDisplayName(asset))"
                >
                  {{ tokenInitial(assetDisplayName(asset)) }}
                </span>
                <span class="text-high text-sm font-medium flex items-center gap-1">
                  {{ assetDisplayName(asset) }}
                  <svg v-if="supabaseMeta[assetHash(asset)]?.is_verified" class="h-3.5 w-3.5 text-success" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </span>
              </div>
            </td>
            <td class="table-cell-secondary">
              {{ assetStandard(asset) }}
            </td>
            <td class="table-cell-right">
              {{ assetBalance(asset) }}
            </td>
                        <td class="table-cell">
              <router-link
                v-if="assetHash(asset)"
                :to="assetTokenRoute(asset)"
                class="font-hash text-sm etherscan-link"
              >
                {{ truncateHash(assetHash(asset), 12, 8) }}
              </router-link>
              <span v-else class="text-low text-sm">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { truncateHash, formatTokenAmount } from "@/utils/explorerFormat";
import { getTokenIcon, hasTokenIcon } from "@/utils/getTokenIcon";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import { supabaseService } from "@/services/supabaseService";
import { NATIVE_CONTRACTS } from "@/constants";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";

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

defineEmits(["retry"]);






function assetHash(asset) {
  return asset?.hash || asset?.asset || asset?.contracthash || asset?.contractHash || asset?.assethash || "";
}

function assetStandard(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (NATIVE_CONTRACTS[hash] || KNOWN_CONTRACTS[hash]) return "NEP17";
  return String(asset?.standard || asset?.type || "NEP17");
}

function assetDisplayName(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  if (supabaseMeta.value[hash]?.symbol) return supabaseMeta.value[hash].symbol;
  if (NATIVE_CONTRACTS[hash]) return NATIVE_CONTRACTS[hash].symbol || NATIVE_CONTRACTS[hash].name;
  if (KNOWN_CONTRACTS[hash]) return KNOWN_CONTRACTS[hash].symbol || KNOWN_CONTRACTS[hash].name;
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}

function normalizeAssetHash(hash) {
  const normalized = String(hash || "").trim().toLowerCase();
  if (!normalized) return "";
  return normalized.startsWith("0x") ? normalized : `0x${normalized}`;
}

function assetDecimals(asset) {
  const hash = normalizeAssetHash(assetHash(asset));
  const native = NATIVE_CONTRACTS[hash];
  if (native && Number.isInteger(native.decimals) && native.decimals >= 0) return native.decimals;

  const explicit = Number(asset?.decimals);
  if (Number.isInteger(explicit) && explicit >= 0) return explicit;

  return null;
}

function assetBalance(asset) {
  const raw = asset?.balance ?? asset?.amount ?? asset?.quantity ?? asset?.totalbalance;
  if (raw === undefined || raw === null || raw === "") return "-";

  const rawText = String(raw).trim();
  const decimals = assetDecimals(asset);

  if (decimals !== null && /^-?\d+$/.test(rawText)) {
    return formatTokenAmount(rawText, decimals, Math.min(decimals, 8));
  }

  const num = Number(raw);
  if (Number.isFinite(num)) return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
  return rawText;
}

function assetTokenRoute(asset) {
  const hash = assetHash(asset);
  const standard = assetStandard(asset).toUpperCase();
  if (standard.includes("NEP11")) return `/nft-token-info/${hash}`;
  return `/nep17-token-info/${hash}`;
}

const sortedAssets = computed(() =>
  [...props.assets].sort((a, b) => {
    const decA = assetDecimals(a) ?? 0;
    const decB = assetDecimals(b) ?? 0;
    const valA = Number(a?.balance ?? a?.amount ?? 0) / Math.pow(10, decA);
    const valB = Number(b?.balance ?? b?.amount ?? 0) / Math.pow(10, decB);
    return valB - valA;
  })
);

function assetKey(asset) {
  return `${assetHash(asset)}-${assetDisplayName(asset)}-${assetBalance(asset)}`;
}

function tokenInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}

function tokenColor(name) {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-red-500",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
</script>
