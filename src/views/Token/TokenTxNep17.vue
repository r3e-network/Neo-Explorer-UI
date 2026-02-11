<template>
  <div class="etherscan-card overflow-hidden">
    <!-- Loading -->
    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 5" :key="i" height="40px" />
    </div>

    <!-- Error State -->
    <ErrorState
      v-else-if="error"
      title="Unable to load NEP-17 transfers"
      :message="error"
      @retry="() => loadPage(currentPage)"
    />

    <template v-else>
      <!-- Info bar -->
      <div
        v-if="totalCount > 0"
        class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
      >
        <p class="text-sm text-text-secondary dark:text-gray-300">
          A total of {{ formatNumber(totalCount) }} transfers found
        </p>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[960px]">
          <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">Txn Hash</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">Type</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">From</th>
              <th class="px-4 py-3 text-center font-medium text-text-secondary dark:text-gray-400"></th>
              <th class="px-4 py-3 text-center font-medium text-text-secondary dark:text-gray-400">Amount</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">To</th>
              <th
                class="cursor-pointer select-none px-4 py-3 text-right font-medium text-text-secondary dark:text-gray-400 hover:text-primary-500"
                @click="showAbsoluteTime = !showAbsoluteTime"
              >
                {{ showAbsoluteTime ? "Date Time (UTC)" : "Age" }}
                <svg class="ml-0.5 inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
            <tr
              v-for="(item, index) in transfers"
              :key="item.txid + index"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
            >
              <!-- Txn Hash -->
              <td class="px-4 py-3">
                <div class="max-w-[160px] truncate">
                  <span v-if="isNullTx(item.txid)" class="text-sm text-text-muted">System</span>
                  <router-link v-else :to="'/transaction-info/' + item.txid" class="font-hash text-sm etherscan-link">
                    {{ item.txid }}
                  </router-link>
                </div>
              </td>
              <!-- Type -->
              <td class="px-4 py-3">
                <span :class="getTypeBadge(item)" class="inline-block rounded-full px-2 py-0.5 text-xs font-medium">
                  {{ getTypeLabel(item) }}
                </span>
              </td>
              <!-- From -->
              <td class="px-4 py-3">
                <div class="max-w-[160px] truncate">
                  <span v-if="item.from === null" class="text-sm text-text-muted">Null Address</span>
                  <router-link v-else :to="'/account-profile/' + item.from" class="font-hash text-sm etherscan-link">
                    {{ showAddress ? scriptHashToAddress(item.from) : truncateHash(item.from) }}
                  </router-link>
                </div>
              </td>
              <!-- Direction Arrow -->
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex h-5 w-5 items-center justify-center rounded-full"
                  :class="
                    item.from === null
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : item.to === null
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  "
                >
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2.5"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </span>
              </td>
              <!-- Amount -->
              <td class="px-4 py-3 text-center">
                <span class="text-sm font-medium text-green-600 dark:text-green-400">
                  {{ convertToken(item.value, decimal) }}
                  <span v-if="symbol" class="text-text-secondary">{{ symbol }}</span>
                </span>
              </td>
              <!-- To -->
              <td class="px-4 py-3">
                <div class="max-w-[160px] truncate">
                  <span v-if="item.to === null" class="text-sm text-text-muted">Null Address</span>
                  <router-link v-else :to="'/account-profile/' + item.to" class="font-hash text-sm etherscan-link">
                    {{ showAddress ? scriptHashToAddress(item.to) : truncateHash(item.to) }}
                  </router-link>
                </div>
              </td>
              <!-- Time -->
              <td class="px-4 py-3 text-right text-sm text-text-secondary dark:text-gray-400">
                {{ showAbsoluteTime ? convertISOTime(item.timestamp) : convertTime(item.timestamp) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="transfers.length === 0" class="p-4">
        <EmptyState title="No transfers found" />
      </div>
    </template>

    <!-- Pagination -->
    <div
      v-if="!loading && totalCount > resultsPerPage"
      class="border-t border-card-border px-4 py-3 dark:border-card-border-dark"
    >
      <EtherscanPagination
        :page="currentPage"
        :total-pages="totalPages"
        :page-size="resultsPerPage"
        :total="totalCount"
        :show-page-size="false"
        @update:page="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { tokenService } from "@/services";
import { GAS_HASH } from "@/constants";
import { truncateHash } from "@/utils/explorerFormat";
import { convertToken, convertTime, scriptHashToAddress, convertISOTime } from "@/store/util";
import { formatNumber } from "@/utils/explorerFormat";
import isOracleReward from "@/utils/isOracleReward";
import { usePagination } from "@/composables/usePagination";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const NULL_TX = "0x0000000000000000000000000000000000000000000000000000000000000000";

const props = defineProps({
  contractHash: { type: String, required: true },
  decimal: { type: Number, default: 0 },
  symbol: { type: String, default: "" },
});

const showAbsoluteTime = ref(false);
const showAddress = ref(true);

const {
  items: transfers,
  loading,
  error,
  totalCount,
  currentPage,
  pageSize: resultsPerPage,
  totalPages,
  loadPage,
  goToPage: handlePageChange,
} = usePagination((limit, skip) => tokenService.getNep17Transfers(props.contractHash, limit, skip));

function isNullTx(txid) {
  return txid === NULL_TX;
}

function getTypeLabel(item) {
  if (isNullTx(item.txid) && item.from === null && item.value === "50000000") return "Block Reward";
  if (isOracleReward(item)) return "Oracle Fee Reward";
  if (isNullTx(item.txid) && item.from === null) return "Network Fee Reward";
  if (isNullTx(item.txid) && item.to === null) return "Fee Burn";
  if (item.from === null && props.contractHash === GAS_HASH) return "Transfer Reward";
  if (item.from === null) return "Mint";
  if (item.to === null) return "Burn";
  return "Transfer";
}

function getTypeBadge(item) {
  const label = getTypeLabel(item);
  const map = {
    "Block Reward": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Oracle Fee Reward": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    "Network Fee Reward": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    "Fee Burn": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    "Transfer Reward": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Mint: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Burn: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    Transfer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return map[label] || "";
}

watch(
  () => props.contractHash,
  () => loadPage(1),
  { immediate: true }
);
</script>
