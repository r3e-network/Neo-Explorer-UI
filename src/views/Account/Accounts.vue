<template>
  <div class="accounts-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.accounts') }]" />

      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
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
          <h1 class="page-title">{{ $t("accounts.title") }}</h1>
          <p class="page-subtitle">{{ $t("accounts.subtitle") }}</p>
        </div>
      </div>

      <div class="etherscan-card overflow-hidden">
        <div class="card-header">
          <p class="text-mid text-sm">
            <span v-if="!loading && total > 0">{{ $t("accounts.moreThanFound", { count: formatNumber(total) }) }}</span>
            <span v-else>{{ $t("accounts.loadingAddresses") }}</span>
          </p>
          <p class="text-low text-sm">{{ $t("accounts.pageOf", { current: currentPage, total: totalPages }) }}</p>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in pageSize" :key="index" height="44px" />
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="p-4">
          <ErrorState :title="$t('accounts.failedToLoad')" :message="error" @retry="loadPage" />
        </div>

        <!-- Empty state -->
        <div v-else-if="accounts.length === 0" class="p-4">
          <EmptyState :message="$t('accounts.emptyTitle')" :description="$t('accounts.emptyDescription')" />
        </div>

        <!-- Data table -->
        <div v-else>
          <div v-if="!isDesktop" class="soft-divider divide-y" data-testid="accounts-mobile-list">
            <MobileListCard v-for="(account, index) in accounts" :key="account.address || index" data-testid="account-mobile-card">
              <template #icon>
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Ad
                </div>
              </template>
              <template #title>
                <HashLink :hash="account.address" type="address" :copyable="false" />
              </template>
              <template #badge>
                <span class="badge-soft whitespace-nowrap text-xs font-semibold">
                  #{{ (currentPage - 1) * pageSize + index + 1 }}
                </span>
              </template>
              <template #subtitle>
                <span>{{ $t("accounts.colLastActive") }}: {{ formatLastActive(account) }}</span>
              </template>
              <template #metrics>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("accounts.colNeoBalance") }}</dt>
                  <dd class="mt-1 truncate text-sm font-medium text-high">{{ formatAccountNeoBalance(account) }}</dd>
                </div>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("accounts.colGasBalance") }}</dt>
                  <dd class="mt-1 truncate text-sm font-medium text-high">{{ formatAccountGasBalance(account) }}</dd>
                </div>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("accounts.colValueUsd") }}</dt>
                  <dd class="mt-1 truncate text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {{ formatUsdValue(account) }}
                  </dd>
                </div>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("accounts.colTxnCount") }}</dt>
                  <dd class="mt-1 truncate text-sm font-medium text-high">{{ formatNumber(getTxnCount(account)) }}</dd>
                </div>
              </template>
            </MobileListCard>
          </div>

          <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[900px]" :aria-label="$t('accounts.tableAriaLabel')">
            <thead class="table-head">
              <tr>
                <th scope="col" class="table-header-cell w-16">{{ $t("accounts.colRank") }}</th>
                <th scope="col" class="table-header-cell">{{ $t("accounts.colAddress") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("accounts.colNeoBalance") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("accounts.colGasBalance") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("accounts.colValueUsd") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("accounts.colTxnCount") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("accounts.colLastActive") }}</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr
                v-for="(account, index) in accounts"
                :key="account.address || index"
                class="list-row group"
              >
                <td class="table-cell-secondary">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="table-cell">
                  <HashLink :hash="account.address" type="address" :copyable="false" />
                </td>
                <td class="table-cell-right font-medium">
                  {{ formatAccountNeoBalance(account) }}
                </td>
                <td class="table-cell-right font-medium">
                  {{ formatAccountGasBalance(account) }}
                </td>
                <td class="table-cell-secondary-right text-emerald-600 dark:text-emerald-400">
                  {{ formatUsdValue(account) }}
                </td>
                <td class="table-cell-secondary-right">
                  {{ formatNumber(getTxnCount(account)) }}
                </td>
                <td class="table-cell-secondary-right">
                  {{ formatLastActive(account) }}
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        <div
          v-if="!loading && accounts.length > 0"
          class="soft-divider border-t px-4 py-3"
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
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useMediaQuery } from "@vueuse/core";
import { accountService, getAccountListCacheKey } from "@/services/accountService";
import { getCache } from "@/services/cache";
import { formatNumber, formatAge, formatBalance, formatGasBalance } from "@/utils/explorerFormat";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import HashLink from "@/components/common/HashLink.vue";
import MobileListCard from "@/components/common/MobileListCard.vue";
import { isAbortError } from "@/utils/abortError";
import { usePriceCache } from "@/composables/usePriceCache";

const { prices, fetchPrices } = usePriceCache();
const isDesktop = useMediaQuery("(min-width: 768px)");

// Compute the USD value of an account's NEO + GAS holdings using cached prices.
function formatUsdValue(account) {
  if (account?.balancesPending) return "...";
  if (account?.balancesUnavailable) return "—";
  const neo = Number(account?.neobalance || 0);
  const gas = Number(account?.gasbalance || 0);
  const neoPrice = Number(prices.value?.neo || 0);
  const gasPrice = Number(prices.value?.gas || 0);
  const total = neo * neoPrice + gas * gasPrice;
  if (!total) return "—";
  return total.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: total < 1 ? 4 : 2 });
}

function formatAccountNeoBalance(account) {
  if (account?.balancesPending) return "...";
  if (account?.balancesUnavailable) return "—";
  return formatBalance(account?.neobalance);
}

function formatAccountGasBalance(account) {
  if (account?.balancesPending) return "...";
  if (account?.balancesUnavailable) return "—";
  return formatGasBalance(account?.gasbalance);
}

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const loading = ref(true);
const error = ref(null);
const accounts = ref([]);
const currentPage = ref(1);
const ACCOUNT_DEFAULT_PAGE_SIZE = 10;
const pageSize = ref(ACCOUNT_DEFAULT_PAGE_SIZE);
const total = ref(0);
let pageRequestId = 0;

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const paginationOffset = computed(() => (currentPage.value - 1) * pageSize.value);

async function loadPage() {
  const myRequestId = ++pageRequestId;
  const skip = paginationOffset.value;
  const cacheKey = getAccountListCacheKey(pageSize.value, skip, { includeBalances: false });
  const hasCachedData = getCache(cacheKey) !== null;

  loading.value = !hasCachedData;
  error.value = null;

  try {
    const response = await accountService.getList(pageSize.value, skip, { includeBalances: false });
    if (myRequestId !== pageRequestId) return;
    total.value = response?.totalCount || 0;
    accounts.value = response?.result || [];
    hydrateCurrentBalances(myRequestId, accounts.value);
  } catch (err) {
    if (myRequestId !== pageRequestId) return;
    if (isAbortError(err)) return;
    if (import.meta.env.DEV) console.error("Failed to load accounts:", err);
    error.value = t("errors.loadAccounts");
    accounts.value = [];
  } finally {
    if (myRequestId === pageRequestId) {
      loading.value = false;
    }
  }
}

async function hydrateCurrentBalances(requestId, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  try {
    const hydratedRows = await accountService.hydrateListBalances(rows);
    if (requestId !== pageRequestId) return;
    const byAddress = new Map(hydratedRows.map((row) => [row.address, row]));
    accounts.value = accounts.value.map((account) => byAddress.get(account.address) || account);
  } catch (err) {
    if (requestId !== pageRequestId) return;
    if (import.meta.env.DEV) console.warn("Failed to hydrate account balances:", err);
    accounts.value = accounts.value.map((account) => ({
      ...account,
      balancesPending: false,
      balancesUnavailable: true,
      neobalance: null,
      gasbalance: null,
    }));
  }
}

function getTxnCount(account) {
  if (account?.txCount !== undefined && account?.txCount !== null) {
    return account.txCount;
  }
  return (account.nep17TransferCount || 0) + (account.nep11TransferCount || 0);
}

function formatLastActive(account) {
  const ts = account.lastTransactionTime || account.lasttransactiontime || 0;
  if (!ts) return "-";
  return formatAge(ts);
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    router.push(`/account/${page}`).catch(() => {});
  }
}

function changePageSize(size) {
  pageSize.value = size;
  router.push("/account/1").catch(() => {});
}

watch(
  () => route.params.page,
  (page) => {
    const parsed = parseInt(page, 10) || 1;
    currentPage.value = Math.max(1, parsed);
    loadPage();
    fetchPrices();
  },
  { immediate: true }
);
</script>
