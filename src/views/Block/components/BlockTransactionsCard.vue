<script setup>
import { formatGas, formatBytes } from "@/utils/explorerFormat";
import HashLink from "@/components/common/HashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";

defineProps({
  transactions: { type: Array, default: () => [] },
  txLoading: { type: Boolean, default: false },
  blockTransactionCount: { type: Number, default: 0 },
  emptyTransactionsMessage: {
    type: String,
    default: "No transactions in this block",
  },
});
</script>

<template>
  <div class="etherscan-card overflow-hidden">
    <div class="card-header">
      <h2 class="text-base font-semibold text-high">
        Transactions
        <span class="ml-1.5 text-sm font-normal text-mid"> ({{ blockTransactionCount }}) </span>
      </h2>
    </div>

    <!-- Tx Loading -->
    <div v-if="txLoading" class="soft-divider divide-y">
      <div v-for="i in 3" :key="i" class="flex items-center gap-4 px-4 py-3">
        <Skeleton width="50%" height="18px" />
        <Skeleton width="20%" height="18px" />
        <Skeleton width="15%" height="18px" />
      </div>
    </div>

    <!-- Tx Empty -->
    <EmptyState v-else-if="transactions.length === 0" :message="emptyTransactionsMessage" icon="tx" />

    <!-- Tx Table -->
    <div v-else class="surface-panel overflow-x-auto">
      <table class="w-full min-w-[700px]" aria-label="Block transactions">
        <caption class="sr-only">
          Transactions included in this block
        </caption>
        <thead class="table-head">
          <tr>
            <th class="table-header-cell">Txn Hash</th>
            <th class="table-header-cell">Sender</th>
            <th class="table-header-cell-right">System Fee</th>
            <th class="table-header-cell-right">Net Fee</th>
            <th class="table-header-cell-right">Size</th>
          </tr>
        </thead>
        <tbody class="soft-divider divide-y">
          <tr
            v-for="tx in transactions"
            :key="tx.hash"
            class="list-row transition-colors"
          >
            <td class="table-cell">
              <HashLink :hash="tx.hash" type="tx" />
            </td>
            <td class="table-cell">
              <HashLink v-if="tx.sender" :hash="tx.sender" type="address" />
              <span v-else class="text-sm text-mid">--</span>
            </td>
            <td class="table-cell text-right font-mono">
              {{ formatGas(tx.sysfee || 0) }}
            </td>
            <td class="table-cell text-right font-mono">
              {{ formatGas(tx.netfee || 0) }}
            </td>
            <td class="table-cell-secondary text-right">
              {{ formatBytes(tx.size) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
