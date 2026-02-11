<template>
  <div class="transactions-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="breadcrumbs" />

      <!-- Page Header -->
      <div class="mb-5 flex flex-col gap-1">
        <h1 class="text-xl font-bold text-text-primary dark:text-white md:text-2xl">Transactions</h1>
        <p class="text-sm text-text-secondary dark:text-gray-400">Neo N3 network transactions</p>
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
        <div
          class="flex flex-col gap-2 border-b border-card-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-card-border-dark"
        >
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
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800/60">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">Txn Hash</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">Method</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">Block</th>
                <th
                  class="cursor-pointer select-none px-4 py-3 text-left font-medium text-text-secondary transition-colors hover:text-primary-500 dark:text-gray-400"
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
                <th class="hidden px-4 py-3 text-left font-medium text-text-secondary md:table-cell dark:text-gray-400">
                  From
                </th>
                <th class="hidden px-4 py-3 text-left font-medium text-text-secondary lg:table-cell dark:text-gray-400">
                  To
                </th>
                <th
                  class="hidden px-4 py-3 text-right font-medium text-text-secondary lg:table-cell dark:text-gray-400"
                >
                  Value
                </th>
                <th
                  class="hidden px-4 py-3 text-right font-medium text-text-secondary xl:table-cell dark:text-gray-400"
                >
                  Txn Fee
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="tx in transactions"
                :key="tx.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <!-- Txn Hash -->
                <td class="px-4 py-3">
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
                      class="font-mono text-sm text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      {{ truncateHash(tx.hash) }}
                    </router-link>
                  </div>
                </td>

                <!-- Method -->
                <td class="px-4 py-3">
                  <span
                    class="inline-block max-w-[100px] truncate rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-text-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    :title="getMethodName(tx)"
                  >
                    {{ getMethodName(tx) }}
                  </span>
                </td>

                <!-- Block -->
                <td class="px-4 py-3">
                  <router-link
                    :to="`/block-info/${tx.blockhash}`"
                    class="text-sm text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    {{ tx.blockIndex }}
                  </router-link>
                </td>

                <!-- Age -->
                <td class="px-4 py-3 text-sm text-text-secondary dark:text-gray-400">
                  <span :title="formatUnixTime(tx.blocktime)">
                    {{ showAbsoluteTime ? formatUnixTime(tx.blocktime) : formatAge(tx.blocktime) }}
                  </span>
                </td>

                <!-- From -->
                <td class="hidden px-4 py-3 md:table-cell">
                  <HashLink v-if="tx.sender" :hash="tx.sender" type="address" />
                  <span v-else class="text-xs text-text-secondary">-</span>
                </td>

                <!-- To -->
                <td class="hidden px-4 py-3 lg:table-cell">
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
                  class="hidden px-4 py-3 text-right font-mono text-sm text-text-primary lg:table-cell dark:text-gray-200"
                >
                  {{ formatTxValue(tx) }} GAS
                </td>

                <!-- Fee -->
                <td class="hidden px-4 py-3 text-right text-xs text-text-secondary xl:table-cell dark:text-gray-400">
                  {{ formatTxFee(tx) }}
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
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { transactionService } from "@/services";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { truncateHash, formatAge, formatUnixTime, formatNumber, formatGas } from "@/utils/explorerFormat";
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

function formatTxValue(tx) {
  // Sum of GAS value from transfers, or 0
  const val = Number(tx.value || tx.netfee || 0);
  if (val === 0) return "0";
  return formatGas(val);
}

function formatTxFee(tx) {
  const net = Number(tx.netfee || 0);
  const sys = Number(tx.sysfee || 0);
  const totalFee = net + sys;
  if (totalFee === 0) return "0";
  return formatGas(totalFee);
}

async function loadPage() {
  const myRequestId = ++currentRequestId;
  loading.value = true;
  error.value = null;
  try {
    const skip = (currentPage.value - 1) * pageSize.value;
    const res = await transactionService.getList(pageSize.value, skip);
    if (myRequestId !== currentRequestId) return;
    total.value = res?.totalCount || 0;
    transactions.value = res?.result || [];
  } catch (err) {
    if (myRequestId !== currentRequestId) return;
    if (process.env.NODE_ENV !== "production") console.error("Failed to load transactions:", err);
    error.value = "Failed to load transactions. Please try again.";
    transactions.value = [];
  } finally {
    if (myRequestId === currentRequestId) {
      loading.value = false;
    }
  }
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    router.push(`/transactions/${page}`);
  }
}

function changePageSize(size) {
  pageSize.value = size;
  router.push("/transactions/1");
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
</script>
