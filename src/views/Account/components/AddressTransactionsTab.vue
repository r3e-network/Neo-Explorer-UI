<template>
  <section>
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="index in 6" :key="index" height="46px" />
    </div>

    <ErrorState v-else-if="error" title="Unable to load transactions" :message="error" @retry="$emit('goToPage', 1)" />

    <EmptyState
      v-else-if="!transactions.length"
      message="No transactions found"
      description="This address has no indexed transaction history yet."
    />

    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-mid text-sm">
          Latest {{ transactions.length }} from a total of
          <span class="text-high font-semibold">{{ formatNumber(totalCount) }}</span>
          transactions
        </p>
        <button
          type="button"
          class="btn-outline flex items-center gap-1 px-2.5 py-1.5 text-xs"
          aria-label="Export transactions to CSV"
          @click="$emit('exportCsv')"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          CSV Export
        </button>
      </div>
      <div class="surface-panel overflow-x-auto">
        <table class="w-full min-w-[900px]" aria-label="Address transactions">
          <caption class="sr-only">
            Address transaction history
          </caption>
          <thead class="table-head text-xs uppercase tracking-wide backdrop-blur-sm">
            <tr>
              <th class="table-header-cell">Txn Hash</th>
              <th class="table-header-cell">Method</th>
              <th class="table-header-cell">Block</th>
              <th class="table-header-cell">Age</th>
              <th class="table-header-cell">From</th>
              <th class="text-low w-12 px-2 py-3 text-center font-medium"></th>
              <th class="table-header-cell">To</th>
              <th class="table-header-cell-right">Value</th>
              <th class="table-header-cell-right">Txn Fee</th>
            </tr>
          </thead>
          <tbody class="divide-y soft-divider">
            <tr
              v-for="tx in transactions"
              :key="tx.hash"
              class="list-row transition-colors"
            >
              <td class="table-cell">
                <router-link
                  :to="`/transaction-info/${tx.hash}`"
                  :title="tx.hash"
                  class="font-hash text-sm etherscan-link"
                >
                  {{ truncateHash(tx.hash, 10, 6) }}
                </router-link>
              </td>
              <td class="table-cell">
                <span class="badge-soft">
                  {{ getTxMethod(tx) }}
                </span>
              </td>
              <td class="table-cell">
                <router-link v-if="tx.blockhash" :to="`/block-info/${tx.blockhash}`" class="text-sm etherscan-link">
                  {{ (tx.blockIndex ?? tx.blockindex) != null ? formatNumber(tx.blockIndex ?? tx.blockindex) : truncateHash(tx.blockhash, 8, 6) }}
                </router-link>
                <span v-else class="text-low text-sm">-</span>
              </td>
              <td class="table-cell-secondary">
                {{ formatAge(tx.blocktime) }}
              </td>
              <td class="table-cell">
                <router-link
                  v-if="tx.sender && tx.sender !== address"
                  :to="`/account-profile/${tx.sender}`"
                  class="font-hash text-sm etherscan-link"
                >
                  {{ truncateHash(tx.sender, 8, 6) }}
                </router-link>
                <span v-else-if="tx.sender" class="text-high font-hash text-sm">
                  {{ truncateHash(tx.sender, 8, 6) }}
                </span>
                <span v-else class="text-low text-sm">-</span>
              </td>
              <td class="px-2 py-3 text-center">
                <span
                  class="inline-block min-w-[40px] rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="getDirection(tx.sender, address).cssClass"
                >
                  {{ getDirection(tx.sender, address).label }}
                </span>
              </td>
              <td class="table-cell">
                <span class="text-high font-hash text-sm">
                  {{ truncateHash(address, 8, 6) }}
                </span>
              </td>
              <td class="table-cell text-right">
                {{ formatTxValue(tx) }}
              </td>
              <td class="table-cell-secondary text-right">
                {{ formatTxFee(tx) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="soft-divider border-t pt-3">
        <EtherscanPagination
          :page="page"
          :total-pages="totalPages"
          :page-size="pageSize"
          :total="totalCount"
          @update:page="$emit('goToPage', $event)"
          @update:page-size="$emit('changePageSize', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { formatAge, truncateHash, formatNumber } from "@/utils/explorerFormat";
import { getTransferDirection, parseTxMethod } from "@/utils/addressDetail";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";

const props = defineProps({
  address: { type: String, default: "" },
  transactions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  totalCount: { type: Number, default: 0 },
});

defineEmits(["goToPage", "changePageSize", "exportCsv"]);

function getDirection(from, to) {
  return getTransferDirection(from, to, props.address);
}

function getTxMethod(tx) {
  return parseTxMethod(tx);
}

function formatTxValue(tx) {
  const val = Number(tx?.value ?? tx?.amount ?? 0);
  if (!val) return "-";
  return val.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function formatTxFee(tx) {
  const net = Number(tx?.netfee || 0);
  const sys = Number(tx?.sysfee || 0);
  const total = net + sys;
  if (!total) return "-";
  const decimals = 8;
  return (total / Math.pow(10, decimals)).toFixed(Math.min(decimals, 6));
}
</script>
