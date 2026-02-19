<template>
  <div class="etherscan-card overflow-hidden">
    <!-- Loading -->
    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 5" :key="i" height="40px" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-6">
      <ErrorState
        :title="`Unable to load ${type === 'nep11' ? 'NEP-11' : 'NEP-17'} transfers`"
        :message="error"
        @retry="() => loadPage(currentPage)"
      />
    </div>

    <template v-else>
      <!-- Info bar -->
      <div v-if="totalCount > 0" class="card-header">
        <p class="text-sm text-mid">A total of {{ formatNumber(totalCount) }} transfers found</p>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[960px]">
          <thead class="text-xs uppercase tracking-wide" style="background: var(--surface-elevated)">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-mid">Txn Hash</th>
              <th v-if="type === 'nep11'" class="px-4 py-3 text-left font-medium text-mid">Token ID</th>
              <th class="px-4 py-3 text-left font-medium text-mid">Type</th>
              <th class="px-4 py-3 text-left font-medium text-mid">From</th>
              <th class="px-4 py-3 text-center font-medium text-mid"></th>
              <th class="px-4 py-3 text-center font-medium text-mid">Amount</th>
              <th class="px-4 py-3 text-left font-medium text-mid">To</th>
              <th
                class="cursor-pointer select-none px-4 py-3 text-right font-medium text-mid hover:text-primary-500"
                role="button"
                tabindex="0"
                aria-label="Toggle time format"
                @click="showAbsoluteTime = !showAbsoluteTime"
                @keydown.enter.prevent="showAbsoluteTime = !showAbsoluteTime"
                @keydown.space.prevent="showAbsoluteTime = !showAbsoluteTime"
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
          <tbody class="divide-y" style="border-color: var(--line-soft)">
            <tr v-for="(item, index) in transfers" :key="item.txid + index" class="list-row transition-colors">
              <!-- Txn Hash -->
              <td class="px-4 py-3">
                <div class="max-w-[160px] truncate">
                  <span v-if="isNullTx(item.txid)" class="text-sm text-low">System</span>
                  <router-link v-else :to="'/transaction-info/' + item.txid" class="font-hash text-sm etherscan-link">
                    {{ item.txid }}
                  </router-link>
                </div>
              </td>
              <!-- Token ID (NEP-11 only) -->
              <td v-if="type === 'nep11'" class="px-4 py-3">
                <div class="max-w-[120px] truncate">
                  <router-link
                    :to="'/nft-info/' + contractHash + '/' + (item.to || item.from) + '/' + item.tokenId"
                    class="font-hash text-sm etherscan-link"
                    :title="item.tokenId"
                  >
                    #{{ item.tokenId }}
                  </router-link>
                </div>
              </td>
              <!-- Type -->
              <td class="px-4 py-3">
                <span
                  :class="getTypeBadge(item, type, contractHash)"
                  class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                >
                  {{ getTypeLabel(item, type, contractHash) }}
                </span>
              </td>
              <!-- From -->
              <td class="px-4 py-3">
                <div class="max-w-[160px] truncate">
                  <span v-if="item.from === null" class="text-sm text-low">Null Address</span>
                  <router-link v-else :to="'/account-profile/' + item.from" class="font-hash text-sm etherscan-link">
                    {{ showAddress ? scriptHashToAddress(item.from) : truncateHash(item.from) }}
                  </router-link>
                </div>
              </td>
              <!-- Direction Arrow -->
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex h-5 w-5 items-center justify-center rounded-full"
                  :style="getDirectionStyle(item)"
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
                <span class="text-success text-sm font-medium">
                  {{ convertToken(item.value, decimal) }}
                  <span v-if="type === 'nep17' && symbol" class="text-mid">{{ symbol }}</span>
                </span>
              </td>
              <!-- To -->
              <td class="px-4 py-3">
                <div class="max-w-[160px] truncate">
                  <span v-if="item.to === null" class="text-sm text-low">Null Address</span>
                  <router-link v-else :to="'/account-profile/' + item.to" class="font-hash text-sm etherscan-link">
                    {{ showAddress ? scriptHashToAddress(item.to) : truncateHash(item.to) }}
                  </router-link>
                </div>
              </td>
              <!-- Time -->
              <td class="px-4 py-3 text-right text-sm text-mid">
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
    <div v-if="!loading && totalCount > resultsPerPage" class="border-t px-4 py-3 soft-divider">
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
import { isNullTx, getTypeLabel, getTypeBadge } from "@/utils/transferTypeUtils";
import { usePagination } from "@/composables/usePagination";
import { hexToBase64 } from "@/utils/neoHelpers";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const props = defineProps({
  /** "nep17" or "nep11" */
  type: { type: String, required: true, validator: (v) => ["nep17", "nep11"].includes(v) },
  contractHash: { type: String, required: true },
  decimal: { type: Number, default: 0 },
  /** Display symbol next to amount (NEP-17 only) */
  symbol: { type: String, default: "" },
  /** Token ID for NEP-11 single-token transfer queries */
  tokenId: { type: String, default: "" },
});

const showAbsoluteTime = ref(false);
const showAddress = ref(true);

function getDirectionStyle(item) {
  if (item.from === null) {
    return { background: "var(--status-success-bg)", color: "var(--status-success)" };
  }
  if (item.to === null) {
    return { background: "var(--status-error-bg)", color: "var(--status-error)" };
  }
  return { background: "var(--status-warning-bg)", color: "var(--status-warning)" };
}

function fetchTransfers(limit, skip) {
  if (props.type === "nep11") {
    return tokenService.getNep11TransfersByTokenId(props.contractHash, hexToBase64(props.tokenId), limit, skip);
  }
  return tokenService.getNep17Transfers(props.contractHash, limit, skip);
}

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
} = usePagination(fetchTransfers);

watch(
  () => props.contractHash,
  () => loadPage(1),
  { immediate: true }
);
</script>
