<template>
  <div>
    <!-- Loading -->
    <div v-if="transfersLoading" class="py-8 text-center">
      <div class="animate-pulse space-y-3">
        <div class="mx-auto h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div class="mx-auto h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
    <!-- Empty -->
    <div v-else-if="allTransfers.length === 0" class="py-8 text-center text-text-secondary dark:text-gray-400">
      No token transfers found for this transaction.
    </div>
    <!-- Content -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-card-border dark:border-card-border-dark">
            <th class="table-header-cell">#</th>
            <th class="table-header-cell">Type</th>
            <th class="table-header-cell">From</th>
            <th class="table-header-cell">To</th>
            <th class="table-header-cell-right">Amount</th>
            <th class="table-header-cell">Token</th>
            <th class="table-header-cell">Contract</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
          <tr v-for="(t, tIdx) in allTransfers" :key="'xfer-' + tIdx">
            <td class="table-cell-secondary text-xs">{{ tIdx + 1 }}</td>
            <td class="table-cell">
              <span
                class="rounded px-2 py-0.5 text-xs font-medium"
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
              <span v-else class="text-xs italic text-text-secondary">Mint</span>
            </td>
            <td class="table-cell">
              <HashLink v-if="t.to" :hash="t.to" type="address" />
              <span v-else class="text-xs italic text-text-secondary">Burn</span>
            </td>
            <td class="table-cell text-right font-mono text-xs">
              {{ formatTransferAmount(t) }}
            </td>
            <td class="table-cell">
              <span
                class="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-text-primary dark:bg-gray-700 dark:text-gray-200"
              >
                {{ t.tokenname || t.symbol || "Unknown" }}
              </span>
            </td>
            <td class="table-cell">
              <HashLink :hash="t.contract || t.contractHash" type="contract" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import HashLink from "@/components/common/HashLink.vue";
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
