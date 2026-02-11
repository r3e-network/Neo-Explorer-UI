<template>
  <div class="token-transfer-flow">
    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 3" :key="i" width="100%" height="60px" variant="rounded" />
    </div>

    <!-- Empty -->
    <EmptyState v-else-if="!transfers || transfers.length === 0" icon="token" message="No token transfers detected" />

    <!-- Transfer cards -->
    <div v-else class="space-y-3">
      <div
        v-for="(t, idx) in transfers"
        :key="idx"
        class="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
      >
        <!-- Step number -->
        <span
          class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-gray-400"
        >
          {{ idx + 1 }}
        </span>

        <!-- Token standard badge -->
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium" :class="tokenStandardClass(t)">
          {{ getTokenStandard(t) }}
        </span>

        <!-- Token badge -->
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold" :class="tokenBadgeClass(t)">
          {{ t.tokenSymbol || "Token" }}
        </span>

        <!-- From -->
        <div class="flex items-center gap-1">
          <span class="text-xs text-gray-500 dark:text-gray-400">From</span>
          <HashLink v-if="t.from && t.from !== 'null'" :hash="t.from" type="address" />
          <span
            v-else
            class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          >
            Mint
          </span>
        </div>

        <!-- Arrow with amount -->
        <div class="flex items-center gap-1.5">
          <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span class="font-semibold text-sm text-gray-800 dark:text-gray-200">
            {{ formatAmount(t) }}
          </span>
        </div>

        <!-- To -->
        <div class="flex items-center gap-1">
          <span class="text-xs text-gray-500 dark:text-gray-400">To</span>
          <HashLink v-if="t.to && t.to !== 'null'" :hash="t.to" type="address" />
          <span
            v-else
            class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          >
            Burn
          </span>
        </div>

        <!-- Contract name -->
        <span
          v-if="t.tokenId"
          class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
          :title="t.tokenId"
        >
          ID: {{ t.tokenId.length > 16 ? t.tokenId.slice(0, 16) + "…" : t.tokenId }}
        </span>
        <span v-if="t.contractName" class="ml-auto text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
          via {{ t.contractName }}
        </span>
      </div>

      <!-- Total summary -->
      <div
        class="flex items-center justify-end px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 mt-1"
      >
        Total: {{ transfers.length }} {{ transfers.length === 1 ? "transfer" : "transfers" }}
      </div>
    </div>
  </div>
</template>

<script setup>
import HashLink from "@/components/common/HashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import { formatTokenAmount } from "@/utils/explorerFormat";

defineProps({
  transfers: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});

function getTokenStandard(transfer) {
  if (transfer.tokenStandard) return transfer.tokenStandard;
  // Heuristic: NEP-11 NFTs typically have tokenId field or decimals=0 with non-fungible traits
  if (transfer.tokenId) return "NEP-11";
  return "NEP-17";
}

function tokenStandardClass(transfer) {
  const std = getTokenStandard(transfer);
  if (std === "NEP-11") return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
}

function tokenBadgeClass(transfer) {
  if (transfer.tokenDecimals === undefined || transfer.tokenDecimals === null) {
    return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
  }
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
}

function formatAmount(transfer) {
  return formatTokenAmount(transfer.amount, transfer.tokenDecimals ?? 0, 8);
}
</script>
