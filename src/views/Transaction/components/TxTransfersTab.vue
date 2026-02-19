<template>
  <div>
    <!-- Loading -->
    <div v-if="transfersLoading" class="py-8 text-center">
      <div class="space-y-3">
        <Skeleton class="mx-auto" width="75%" height="16px" />
        <Skeleton class="mx-auto" width="50%" height="16px" />
      </div>
    </div>
    <!-- Empty -->
    <EmptyState v-else-if="allTransfers.length === 0" message="No token transfers found for this transaction." icon="tx" />
    <!-- Content -->
    <div v-else class="surface-panel overflow-x-auto">
      <table class="w-full min-w-[780px] text-sm" aria-label="Transaction token transfers">
        <caption class="sr-only">
          NEP transfer list for this transaction
        </caption>
        <thead class="table-head">
          <tr class="soft-divider border-b">
            <th class="table-header-cell">#</th>
            <th class="table-header-cell">Type</th>
            <th class="table-header-cell">From</th>
            <th class="table-header-cell">To</th>
            <th class="table-header-cell-right">Amount</th>
            <th class="table-header-cell">Token</th>
            <th class="table-header-cell">Contract</th>
          </tr>
        </thead>
        <tbody class="soft-divider divide-y">
          <tr v-for="(t, tIdx) in allTransfers" :key="'xfer-' + tIdx" class="list-row">
            <td class="table-cell-secondary text-xs">{{ tIdx + 1 }}</td>
            <td class="table-cell">
              <span
                class="badge-soft rounded px-2 py-0.5 text-xs font-medium"
                :class="
                  t._standard === 'NEP-11'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                "
              >
                {{ t._standard }}
              </span>
            </td>
            <td class="table-cell">
              <HashLink v-if="t.from" :hash="t.from" type="address" />
              <span v-else class="text-mid text-xs italic">Mint</span>
            </td>
            <td class="table-cell">
              <HashLink v-if="t.to" :hash="t.to" type="address" />
              <span v-else class="text-mid text-xs italic">Burn</span>
            </td>
            <td class="table-cell text-right font-mono text-xs">
              {{ formatTransferAmount(t) }}
            </td>
            <td class="table-cell">
              <span
                class="badge-soft rounded px-2 py-0.5 text-xs font-medium text-high"
              >
                {{ t.tokenname || t.symbol || "Unknown" }}
              </span>
            </td>
            <td class="table-cell">
              <HashLink v-if="t.contract || t.contractHash" :hash="t.contract || t.contractHash" type="contract" />
              <span v-else class="text-mid text-xs">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import HashLink from "@/components/common/HashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import { GAS_DECIMALS } from "@/constants";

defineProps({
  allTransfers: { type: Array, default: () => [] },
  transfersLoading: { type: Boolean, default: false },
});

function formatTransferAmount(t) {
  const raw = Number(t.value || t.amount || 0);
  const decimals = Number(t.decimals ?? GAS_DECIMALS);
  if (decimals === 0) return String(raw);
  return (raw / Math.pow(10, decimals)).toFixed(Math.min(decimals, 8));
}
</script>
