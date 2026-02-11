<template>
  <div class="accounts-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Accounts' }]" />

      <div class="mb-6 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-text-primary dark:text-gray-100">Top Accounts</h1>
          <p class="text-sm text-text-secondary dark:text-gray-400">Neo N3 accounts ranked by balance</p>
        </div>
      </div>

      <div class="etherscan-card overflow-hidden">
        <div
          class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <p class="text-sm text-text-secondary dark:text-gray-300">
            <span v-if="!loading && total > 0"> More than {{ formatNumber(total) }} addresses found </span>
            <span v-else>Loading addresses...</span>
          </p>
          <p class="text-sm text-text-muted dark:text-gray-400">Page {{ currentPage }} of {{ totalPages }}</p>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in pageSize" :key="index" height="44px" />
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="p-4">
          <ErrorState title="Failed to load accounts" :message="error" @retry="loadPage" />
        </div>

        <!-- Empty state -->
        <div v-else-if="accounts.length === 0" class="p-4">
          <EmptyState message="No accounts found" description="No indexed addresses available yet." />
        </div>

        <!-- Data table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[900px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="w-16 px-4 py-3 text-left font-medium text-text-secondary">Rank</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Address</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">NEO Balance</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">GAS Balance</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">Txn Count</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">Last Active</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="(account, index) in accounts"
                :key="account.address || index"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="px-4 py-3 text-sm text-text-muted dark:text-gray-500">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="px-4 py-3">
                  <router-link
                    :to="`/account-profile/${account.address}`"
                    :title="account.address"
                    class="font-mono text-sm etherscan-link"
                  >
                    {{ displayAddress(account.address) }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-right text-sm font-medium text-text-primary dark:text-gray-300">
                  {{ formatBalance(account.neobalance) }}
                </td>
                <td class="px-4 py-3 text-right text-sm font-medium text-text-primary dark:text-gray-300">
                  {{ formatGasBalance(account.gasbalance) }}
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-secondary dark:text-gray-400">
                  {{ formatNumber(getTxnCount(account)) }}
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-secondary dark:text-gray-400">
                  {{ formatLastActive(account) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="!loading && accounts.length > 0"
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
import { accountService } from "@/services";
import { formatNumber, formatAge, formatBalance, formatGasBalance } from "@/utils/explorerFormat";
import { scriptHashToAddress } from "@/store/util";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref(null);
const accounts = ref([]);
const currentPage = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
let pageRequestId = 0;

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const paginationOffset = computed(() => (currentPage.value - 1) * pageSize.value);

async function loadPage() {
  const myRequestId = ++pageRequestId;
  loading.value = true;
  error.value = null;
  try {
    const response = await accountService.getList(pageSize.value, paginationOffset.value);
    if (myRequestId !== pageRequestId) return;
    total.value = response?.totalCount || 0;
    accounts.value = response?.result || [];
  } catch (err) {
    if (myRequestId !== pageRequestId) return;
    if (process.env.NODE_ENV !== "production") console.error("Failed to load accounts:", err);
    error.value = "Failed to load accounts. Please try again.";
    accounts.value = [];
  } finally {
    if (myRequestId === pageRequestId) {
      loading.value = false;
    }
  }
}

function displayAddress(hash) {
  if (!hash) return "-";
  try {
    return scriptHashToAddress(hash);
  } catch {
    return hash;
  }
}

function getTxnCount(account) {
  return (account.nep17TransferCount || 0) + (account.nep11TransferCount || 0);
}

function formatLastActive(account) {
  const ts = account.lastTransactionTime || account.lasttransactiontime || 0;
  if (!ts) return "-";
  return formatAge(ts);
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    router.push(`/account/${page}`);
  }
}

function changePageSize(size) {
  pageSize.value = size;
  router.push("/account/1");
}

watch(
  () => route.params.page,
  (page) => {
    const parsed = parseInt(page) || 1;
    currentPage.value = Math.max(1, parsed);
    loadPage();
  },
  { immediate: true }
);
</script>
