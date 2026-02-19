<template>
  <section>
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="index in 5" :key="index" height="46px" />
    </div>

    <ErrorState v-else-if="error" title="Unable to load NFT holdings" :message="error" @retry="$emit('retry')" />

    <EmptyState
      v-else-if="!assets.length"
      message="No NFT holdings"
      description="No NEP-11 balances were found for this address."
    />

    <div v-else class="surface-panel overflow-x-auto">
      <table class="w-full min-w-[700px]" aria-label="Address NFT holdings">
        <caption class="sr-only">
          NEP-11 token holdings for this address
        </caption>
        <thead class="table-head text-xs uppercase tracking-wide">
          <tr>
            <th class="table-header-cell">Collection</th>
            <th class="table-header-cell">Standard</th>
            <th class="table-header-cell-right">Balance</th>
            <th class="table-header-cell">Contract</th>
          </tr>
        </thead>
        <tbody class="soft-divider divide-y">
          <tr
            v-for="asset in assets"
            :key="assetKey(asset)"
            class="list-row transition-colors"
          >
            <td class="table-cell font-medium">
              {{ assetDisplayName(asset) }}
            </td>
            <td class="table-cell-secondary">
              {{ assetStandard(asset) }}
            </td>
            <td class="table-cell text-right">
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
import { truncateHash } from "@/utils/explorerFormat";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";

defineProps({
  assets: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
});

defineEmits(["retry"]);

function assetHash(asset) {
  return asset?.hash || asset?.contracthash || asset?.contractHash || asset?.assethash || "";
}

function assetStandard(asset) {
  return String(asset?.standard || asset?.type || "Unknown");
}

function assetDisplayName(asset) {
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}

function assetBalance(asset) {
  const raw = asset?.balance ?? asset?.amount ?? asset?.quantity ?? asset?.totalbalance;
  if (raw === undefined || raw === null || raw === "") return "-";
  const num = Number(raw);
  if (Number.isFinite(num)) return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
  return String(raw);
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
</script>
