<!-- @deprecated Use <TransferTable type="nep11" /> from @/components/common/TransferTable.vue instead. -->
<template>
  <div class="etherscan-card overflow-hidden">
    <!-- Loading -->
    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 5" :key="i" height="40px" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-6">
      <ErrorState title="Unable to load NEP-11 transfers" :message="error" @retry="() => loadPage(currentPage)" />
    </div>

    <template v-else>
      <!-- Info bar -->
      <div v-if="totalCount > 0" class="card-header">
        <p class="text-mid text-sm">
          A total of {{ formatNumber(totalCount) }} transfers found
        </p>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[960px]">
          <thead class="table-head text-xs uppercase tracking-wide">
            <tr>
              <th class="table-header-cell">Txn Hash</th>
              <th class="table-header-cell">Token ID</th>
              <th class="table-header-cell">Type</th>
              <th class="table-header-cell">From</th>
              <th class="text-low px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.08em]"></th>
              <th class="text-low px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.08em]">Amount</th>
              <th class="table-header-cell">To</th>
              <th
                class="table-header-cell-right cursor-pointer select-none hover:text-primary-500"
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
          <tbody class="soft-divider divide-y">
            <tr
              v-for="(item, index) in transfers"
              :key="item.txid + index"
              class="list-row transition-colors"
            >
              <!-- Txn Hash -->
              <td class="px-4 py-3">
                <div class="max-w-[160px] truncate">
                  <span v-if="isNullTx(item.txid)" class="text-low text-sm">System</span>
                  <router-link v-else :to="'/transaction-info/' + item.txid" class="font-hash text-sm etherscan-link">
                    {{ item.txid }}
                  </router-link>
                </div>
              </td>
              <!-- Token ID -->
              <td class="px-4 py-3">
                <div class="max-w-[120px] truncate">
                  <router-link
                    :to="'/nft-info/' + props.contractHash + '/' + (item.to || item.from) + '/' + item.tokenId"
                    class="font-hash text-sm etherscan-link"
                    :title="item.tokenId"
                  >
                    #{{ item.tokenId }}
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
                  <span v-if="item.from === null" class="text-low text-sm">Null Address</span>
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
                </span>
              </td>
              <!-- To -->
              <td class="px-4 py-3">
                <div class="max-w-[160px] truncate">
                  <span v-if="item.to === null" class="text-low text-sm">Null Address</span>
                  <router-link v-else :to="'/account-profile/' + item.to" class="font-hash text-sm etherscan-link">
                    {{ showAddress ? scriptHashToAddress(item.to) : truncateHash(item.to) }}
                  </router-link>
                </div>
              </td>
              <!-- Time -->
              <td class="text-mid px-4 py-3 text-right text-sm">
                {{ showAbsoluteTime ? formatDateTime(item.timestamp) : formatAge(item.timestamp) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="transfers.length === 0" class="p-4">
        <EmptyState message="No transfers found" />
      </div>
    </template>

    <!-- Pagination -->
    <div
      v-if="!loading && totalCount > resultsPerPage"
      class="soft-divider border-t px-4 py-3"
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
import { truncateHash, formatNumber } from "@/utils/explorerFormat";
import { convertToken, scriptHashToAddress } from "@/utils/neoHelpers";
import { formatAge, formatDateTime } from "@/utils/timeFormat";
import { usePagination } from "@/composables/usePagination";
import { hexToBase64 } from "@/utils/neoHelpers";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { NULL_TX_HASH } from "@/constants";

const props = defineProps({
  contractHash: { type: String, required: true },
  decimal: { type: Number, default: 0 },
  tokenId: { type: String, default: "" },
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
} = usePagination((limit, skip) =>
  tokenService.getNep11TransfersByTokenId(props.contractHash, hexToBase64(props.tokenId), limit, skip)
);

function isNullTx(txid) {
  return txid === NULL_TX_HASH;
}

function getTypeLabel(item) {
  if (item.from === null) return "Mint";
  if (item.to === null) return "Burn";
  return "Transfer";
}

function getTypeBadge(item) {
  const label = getTypeLabel(item);
  const map = {
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
