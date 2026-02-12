<template>
  <div class="transactions-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="breadcrumbs" />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div
          class="page-header-icon bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">Transactions</h1>
          <p class="page-subtitle">Neo N3 network transactions</p>
        </div>
      </div>

      <!-- Stats Bar -->
      <div
        v-if="total > 0"
        class="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-800 dark:bg-blue-900/20"
      >
        <svg class="h-4 w-4 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span class="text-sm text-blue-800 dark:text-blue-300">
          More than {{ formatNumber(total) }} transactions found
        </span>
      </div>

      <!-- Main Card -->
      <div class="etherscan-card overflow-hidden">
        <!-- Card Header -->
        <div class="card-header flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-text-secondary dark:text-gray-400">
            Showing {{ startRecord }} to {{ endRecord }} of {{ formatNumber(total) }} transactions
          </p>
        </div>

        <!-- Loading Skeletons -->
        <div v-if="loading" class="divide-y divide-card-border dark:divide-card-border-dark">
          <div v-for="i in pageSize" :key="'skel-' + i" class="flex items-center gap-4 px-4 py-3.5">
            <Skeleton width="180px" height="16px" />
            <Skeleton width="60px" height="24px" variant="rounded" />
            <Skeleton width="70px" height="16px" />
            <Skeleton width="80px" height="16px" />
            <Skeleton width="140px" height="16px" class="hidden md:block" />
            <Skeleton width="140px" height="16px" class="hidden lg:block" />
            <Skeleton width="80px" height="16px" class="hidden lg:block" />
            <Skeleton width="70px" height="16px" class="hidden xl:block" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6">
          <ErrorState title="Failed to load transactions" :message="error" @retry="loadPage" />
        </div>

        <!-- Empty State -->
        <EmptyState v-else-if="transactions.length === 0" icon="tx" message="No transactions found" />

        <!-- Transaction Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[900px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="table-header-cell">Txn Hash</th>
                <th class="table-header-cell">Method</th>
                <th class="table-header-cell">Block</th>
                <th
                  class="table-header-cell cursor-pointer select-none transition-colors hover:text-primary-500"
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
                <th class="table-header-cell hidden md:table-cell">
                  From
                </th>
                <th class="table-header-cell hidden lg:table-cell">
                  To
                </th>
                <th class="table-header-cell-right hidden lg:table-cell">
                  Value / Gas
                </th>
                <th class="table-header-cell-right hidden xl:table-cell">
                  Net / Sys Fee
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="tx in transactions"
                :key="tx.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <!-- Txn Hash -->
                <td class="table-cell">
                  <div class="flex items-center gap-1.5">
                    <svg
                      class="h-4 w-4 flex-shrink-0"
                      :class="getTxStatusColor(tx)"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <circle cx="10" cy="10" r="10" />
                    </svg>
                    <router-link
                      :to="`/transaction-info/${tx.hash}`"
                      :title="tx.hash"
                      class="etherscan-link font-mono"
                    >
                      {{ truncateHash(tx.hash) }}
                    </router-link>
                  </div>
                </td>

                <!-- Method -->
                <td class="table-cell">
                  <span
                    class="inline-block max-w-[100px] truncate rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-text-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    :title="getMethodName(tx)"
                  >
                    {{ getMethodName(tx) }}
                  </span>
                </td>

                <!-- Block -->
                <td class="table-cell">
                  <router-link
                    :to="`/block-info/${tx.blockhash}`"
                    class="etherscan-link"
                  >
                    {{ tx.blockIndex }}
                  </router-link>
                </td>

                <!-- Age -->
                <td class="table-cell-secondary">
                  <span :title="formatUnixTime(tx.blocktime)">
                    {{ showAbsoluteTime ? formatUnixTime(tx.blocktime) : formatAge(tx.blocktime) }}
                  </span>
                </td>

                <!-- From -->
                <td class="table-cell hidden md:table-cell">
                  <HashLink v-if="tx.sender" :hash="tx.sender" type="address" />
                  <span v-else class="text-xs text-text-secondary">-</span>
                </td>

                <!-- To -->
                <td class="table-cell hidden lg:table-cell">
                  <span v-if="getRecipient(tx)" class="flex items-center gap-1">
                    <svg
                      class="h-3 w-3 flex-shrink-0 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                    <HashLink :hash="getRecipient(tx)" type="contract" />
                  </span>
                  <span v-else class="text-xs text-text-secondary">-</span>
                </td>

                <!-- Value -->
                <td
                  class="table-cell hidden text-right font-mono lg:table-cell"
                >
                  <div class="flex flex-col items-end leading-tight">
                    <span class="max-w-[180px] truncate" :title="getTxValueSummary(tx)">{{ getTxValueSummary(tx) }}</span>
                    <span class="text-[11px] text-text-secondary">{{ formatTxGas(tx) }} GAS</span>
                  </div>
                </td>

                <!-- Fee -->
                <td class="table-cell-secondary hidden text-right text-xs xl:table-cell">
                  {{ formatTxFeeBreakdown(tx) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && transactions.length > 0"
          class="border-t border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <EtherscanPagination
            :page="currentPage"
            :total-pages="totalPages"
            :page-size="pageSize"
            :total="total"
            @update:page="goToPage"
            @update:page-size="changePageSize"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { transactionService, tokenService } from "@/services";
import { getCache, getCacheKey } from "@/services/cache";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { getNetworkRefreshIntervalMs } from "@/utils/env";
import { truncateHash, formatAge, formatUnixTime, formatNumber, formatGas, formatTokenAmount } from "@/utils/explorerFormat";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import HashLink from "@/components/common/HashLink.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";

const route = useRoute();
const router = useRouter();

// State
const transactions = ref([]);
const loading = ref(false);
const error = ref(null);
const showAbsoluteTime = ref(false);
const currentPage = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
let currentRequestId = 0;
let refreshTimer = null;
const transferSummaryByHash = ref({});
const pendingTransferSummaries = new Set();

// Computed
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const startRecord = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1));
const endRecord = computed(() => Math.min(currentPage.value * pageSize.value, total.value));

const breadcrumbs = [{ label: "Home", to: "/homepage" }, { label: "Transactions" }];

// Methods
function getTxStatusColor(tx) {
  if (tx.vmstate === "FAULT") return "text-red-400";
  return "text-green-400";
}

function getMethodName(tx) {
  // Extract method from script or notifications if available
  if (tx.method) return tx.method;
  if (tx.notifications?.length > 0) {
    return tx.notifications[0].eventname || "Transfer";
  }
  return "Transfer";
}

function getRecipient(tx) {
  // First notification contract or null
  if (tx.notifications?.length > 0) {
    return tx.notifications[0].contract;
  }
  return null;
}

function getTxValueSummary(tx) {
  const summary = transferSummaryByHash.value[tx.hash];
  if (summary) return summary;

  const transferValue = Number(tx.value || 0);
  if (transferValue > 0) {
    return `${formatGas(transferValue)} GAS`;
  }

  return "—";
}

function truncateTokenId(tokenId, start = 8, end = 6) {
  if (!tokenId) return "";
  const value = String(tokenId);

  if (value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function getExtraTransferSuffix(totalCount) {
  const extraTransfers = Math.max(0, Number(totalCount || 0) - 1);
  return extraTransfers > 0 ? ` +${extraTransfers}` : "";
}

function setTransferSummary(hash, summary) {
  transferSummaryByHash.value = {
    ...transferSummaryByHash.value,
    [hash]: summary,
  };
}

async function loadTransferSummaryByHash(hash) {
  if (!hash || transferSummaryByHash.value[hash] || pendingTransferSummaries.has(hash)) {
    return;
  }

  pendingTransferSummaries.add(hash);

  try {
    const nep17Res = await tokenService.getTransfersByTxHash(hash, 1, 0);
    const nep17 = nep17Res?.result?.[0];

    if (nep17) {
      const amount = formatTokenAmount(nep17.value || 0, Number(nep17.decimals || 0), 8);
      const symbol = nep17.symbol || nep17.tokenname || "Token";
      const suffix = getExtraTransferSuffix(nep17Res?.totalCount);
      setTransferSummary(hash, `${amount} ${symbol}${suffix}`);
      return;
    }

    const nep11Res = await tokenService.getNep11TransfersByTxHash(hash, 1, 0);
    const nep11 = nep11Res?.result?.[0];

    if (nep11) {
      const symbol = nep11.symbol || nep11.tokenname || "NFT";
      const tokenId = nep11.tokenid || nep11.tokenId;
      const suffix = getExtraTransferSuffix(nep11Res?.totalCount);
      const readableTokenId = truncateTokenId(tokenId);
      setTransferSummary(hash, readableTokenId ? `1 ${symbol} #${readableTokenId}${suffix}` : `1 ${symbol}${suffix}`);
      return;
    }

    setTransferSummary(hash, "—");
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to load transaction transfer summary:", err);
    }
    setTransferSummary(hash, "—");
  } finally {
    pendingTransferSummaries.delete(hash);
  }
}

async function enrichTransferSummaries(txList) {
  const hashes = (txList || [])
    .filter((tx) => {
      const hash = tx?.hash;
      if (!hash || transferSummaryByHash.value[hash] || pendingTransferSummaries.has(hash)) {
        return false;
      }

      const transferValue = Number(tx?.value || 0);
      return transferValue <= 0;
    })
    .map((tx) => tx.hash);

  if (hashes.length === 0) return;

  const batchSize = 4;
  for (let index = 0; index < hashes.length; index += batchSize) {
    const batch = hashes.slice(index, index + batchSize);
    await Promise.all(batch.map((hash) => loadTransferSummaryByHash(hash)));
  }
}
function formatTxGas(tx) {
  const net = Number(tx.netfee || 0);
  const sys = Number(tx.sysfee || 0);
  const totalFee = net + sys;
  if (totalFee === 0) return "0";
  return formatGas(totalFee);
}

function formatTxFeeBreakdown(tx) {
  const net = Number(tx.netfee || 0);
  const sys = Number(tx.sysfee || 0);

  if (net === 0 && sys === 0) {
    return "N: 0 / S: 0";
  }

  return `N: ${formatGas(net)} / S: ${formatGas(sys)}`;
}

async function loadPage({ silent = false, forceRefresh = false } = {}) {
  const myRequestId = ++currentRequestId;
  const skip = (currentPage.value - 1) * pageSize.value;
  const cacheKey = getCacheKey("tx_list", { limit: pageSize.value, skip });
  const hasCachedData = getCache(cacheKey) !== null;
  const shouldShowLoading = !silent && !hasCachedData;

  if (shouldShowLoading) {
    loading.value = true;
  }

  if (!silent) {
    error.value = null;
  }

  try {
    const res = await transactionService.getList(pageSize.value, skip, { forceRefresh });
    if (myRequestId !== currentRequestId) return;
    total.value = res?.totalCount || 0;
    transactions.value = res?.result || [];
    void enrichTransferSummaries(transactions.value);
  } catch (err) {
    if (myRequestId !== currentRequestId) return;
    if (process.env.NODE_ENV !== "production") console.error("Failed to load transactions:", err);

    if (!silent || transactions.value.length === 0) {
      error.value = "Failed to load transactions. Please try again.";
      transactions.value = [];
    }
  } finally {
    if (myRequestId === currentRequestId && shouldShowLoading) {
      loading.value = false;
    }
  }
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    router.push("/transactions/" + page);
  }
}

function changePageSize(size) {
  pageSize.value = size;
  router.push("/transactions/1");
}

function startAutoRefresh() {
  stopAutoRefresh();

  refreshTimer = setInterval(() => {
    loadPage({ silent: true, forceRefresh: true });
  }, getNetworkRefreshIntervalMs());
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// Watch route param for page changes
watch(
  () => route.params.page,
  (page) => {
    currentPage.value = Math.max(1, parseInt(page) || 1);
    loadPage();
  },
  { immediate: true }
);

onMounted(() => {
  startAutoRefresh();
});

onBeforeUnmount(() => {
  stopAutoRefresh();
});
</script>
