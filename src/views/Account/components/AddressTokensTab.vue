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
            <th class="table-header-cell-right">Value (USD)</th>
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
                <span
                  class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  :class="tokenColor(assetDisplayName(asset))"
                >
                  {{ tokenInitial(assetDisplayName(asset)) }}
                </span>
                <span class="text-high text-sm font-medium">
                  {{ assetDisplayName(asset) }}
                </span>
              </div>
            </td>
            <td class="table-cell-secondary">
              {{ assetStandard(asset) }}
            </td>
            <td class="table-cell-right">
              {{ assetBalance(asset) }}
            </td>
            <td class="table-cell-secondary-right italic">-</td>
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
import { computed } from "vue";
import { truncateHash, formatTokenAmount } from "@/utils/explorerFormat";
import { NATIVE_CONTRACTS } from "@/constants";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";

const props = defineProps({
  assets: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
});

defineEmits(["retry"]);

const sortedAssets = computed(() =>
  [...props.assets].sort((a, b) => {
    const balA = Number(a?.balance ?? a?.amount ?? 0);
    const balB = Number(b?.balance ?? b?.amount ?? 0);
    return balB - balA;
  })
);

function assetHash(asset) {
  return asset?.hash || asset?.asset || asset?.contracthash || asset?.contractHash || asset?.assethash || "";
}

function assetStandard(asset) {
  return String(asset?.standard || asset?.type || "Unknown");
}

function assetDisplayName(asset) {
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}

function normalizeAssetHash(hash) {
  const normalized = String(hash || "").trim().toLowerCase();
  if (!normalized) return "";
  return normalized.startsWith("0x") ? normalized : `0x${normalized}`;
}

function assetDecimals(asset) {
  const explicit = Number(asset?.decimals);
  if (Number.isInteger(explicit) && explicit >= 0) return explicit;

  const native = NATIVE_CONTRACTS[normalizeAssetHash(assetHash(asset))];
  if (native && Number.isInteger(native.decimals) && native.decimals >= 0) return native.decimals;

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
