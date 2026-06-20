<template>
  <div class="contracts-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.contracts') }]" />

      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">{{ $t("nav.contracts") || "Contracts" }}</h1>
          <p class="page-subtitle">{{ $t("contractsPage.pageSubtitle") }}</p>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative max-w-md flex-1">
          <svg
            class="text-low absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            name="contract-search"
            :placeholder="$t('common.searchByContract')"
            :aria-label="$t('contractsPage.searchAria')"
            class="form-input rounded-lg py-2 pl-10 pr-4"
            @input="onSearchInput"
          />
        </div>
        <router-link
          to="/verify-contract"
          class="btn-primary gap-2"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {{ $t("contractsPage.verifyContract") }}
        </router-link>
      </div>

      <div class="etherscan-card overflow-hidden">
        <div class="card-header">
          <p class="text-mid text-sm">
            {{ isSearchMode ? $t("contractsPage.headerSearchResults") : $t("contractsPage.headerRegistry") }}
          </p>
          <p class="text-low text-sm">
            {{ $t("contractsPage.pageOfTotal", { current: currentPage, total: totalPages }) }}
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in 10" :key="index" height="44px" />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-4">
          <ErrorState :title="$t('contractsPage.errorLoad')" :message="error" @retry="loadPage" />
        </div>

        <!-- Empty State -->
        <div v-else-if="contracts.length === 0" class="p-4">
          <EmptyState :message="isSearchMode ? $t('contractsPage.emptySearch') : $t('contractsPage.emptyAll')" />
        </div>

        <!-- Data Table / Mobile cards -->
        <div v-else>
          <div v-if="!isDesktop" class="soft-divider divide-y" data-testid="contracts-mobile-list">
            <MobileListCard v-for="(contract, index) in contracts" :key="contract.hash" data-testid="contract-mobile-card">
              <template #icon>
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
              </template>

              <template #title>
                <router-link :to="`/contract-info/${contract.hash}`" class="etherscan-link font-medium">
                  {{ contract.name || $t("contractsPage.unknownContract") }}
                </router-link>
              </template>

              <template #badge>
                <span
                  class="inline-flex items-center rounded px-2 py-1 text-xs font-semibold"
                  :class="contract.verified ? 'bg-status-success-bg text-status-success' : 'badge-soft'"
                >
                  {{ contract.verified ? $t("contractsPage.colVerified") : `#${(currentPage - 1) * pageSize + index + 1}` }}
                </span>
              </template>

              <template #subtitle>
                <router-link :to="`/contract-info/${contract.hash}`" class="etherscan-link font-hash">
                  {{ truncateHash(contract.hash) }}
                </router-link>
              </template>

              <template #metrics>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("contractsPage.colInvocations") }}</dt>
                  <dd class="mt-1 text-sm font-medium text-high">
                    {{ formatNumber(contract.totalsccall || contract.invocations || 0) }}
                  </dd>
                </div>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("contractsPage.colCreated") }}</dt>
                  <dd class="mt-1 truncate text-sm font-medium text-high" :title="formatTime(contract.createtime)">
                    {{ formatTime(contract.createtime) }}
                  </dd>
                </div>
              </template>

              <div v-if="getStandards(contract).length" class="flex flex-wrap gap-1">
                <span
                  v-for="std in getStandards(contract)"
                  :key="std"
                  class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  :class="nepBadgeClass(std)"
                >
                  {{ std }}
                </span>
              </div>
            </MobileListCard>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[900px]" :aria-label="$t('aria.contractsTable')">
            <thead class="table-head">
              <tr>
                <th scope="col" class="table-header-cell">#</th>
                <th scope="col" class="table-header-cell">{{ $t("contractsPage.colContract") }}</th>
                <th scope="col" class="table-header-cell">{{ $t("contractsPage.colHash") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("contractsPage.colInvocations") }}</th>
                <th scope="col" class="table-header-cell text-center">{{ $t("contractsPage.colStandards") }}</th>
                <th scope="col" class="table-header-cell text-center">{{ $t("contractsPage.colVerified") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("contractsPage.colCreated") }}</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr
                v-for="(contract, index) in contracts"
                :key="contract.hash"
                class="list-row group"
              >
                <td class="table-cell-secondary">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="table-cell">
                  <router-link
                    :to="`/contract-info/${contract.hash}`"
                    class="text-high etherscan-link font-medium"
                  >
                    {{ contract.name || $t("contractsPage.unknownContract") }}
                  </router-link>
                </td>
                <td class="table-cell">
                  <router-link :to="`/contract-info/${contract.hash}`" class="font-hash text-sm etherscan-link">
                    {{ truncateHash(contract.hash) }}
                  </router-link>
                </td>
                <td class="table-cell-right">
                  {{ formatNumber(contract.totalsccall || contract.invocations || 0) }}
                </td>
                <td class="table-cell text-center">
                  <div class="flex flex-wrap justify-center gap-1">
                    <span
                      v-for="std in getStandards(contract)"
                      :key="std"
                      class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      :class="nepBadgeClass(std)"
                    >
                      {{ std }}
                    </span>
                    <span v-if="!getStandards(contract).length" class="text-low text-xs">-</span>
                  </div>
                </td>
                <td class="table-cell text-center">
                  <svg
                    v-if="contract.verified"
                    class="mx-auto h-5 w-5 text-success"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span v-else class="text-low text-xs">-</span>
                </td>
                <td class="table-cell-secondary-right">
                  {{ formatTime(contract.createtime) }}
                </td>
              </tr>
            </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && contracts.length > 0"
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
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useMediaQuery } from "@vueuse/core";
import { contractService } from "@/services/contractService";
import { getCache, getCacheKey } from "@/services/cache";
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/constants";
import { truncateHash, formatUnixTime, formatNumber } from "@/utils/explorerFormat";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import { useNetworkChange } from "@/composables/useNetworkChange";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import MobileListCard from "@/components/common/MobileListCard.vue";
import { isAbortError } from "@/utils/abortError";
import { resolveNetworkName } from "@/utils/env";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const isDesktop = useMediaQuery("(min-width: 768px)");

// State
const loading = ref(true);
const error = ref(null);
const contracts = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const searchQuery = ref("");
let searchDebounce = null;
let currentRequestId = 0;

// Computed
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const isSearchMode = computed(() => searchQuery.value.trim().length > 0);

// NEP standard helpers
function getStandards(contract) {
  let manifest = contract.manifest;
  if (!manifest) return [];
  if (typeof manifest === "string") {
    try {
      manifest = JSON.parse(manifest);
    } catch (e) {
      return [];
    }
  }
  const raw = manifest.supportedstandards || manifest.supportedStandards || [];
  return Array.isArray(raw) ? raw : [];
}

function nepBadgeClass(std) {
  const upper = String(std || "").toUpperCase();
  if (upper.includes("NEP-17") || upper.includes("NEP17")) {
    return "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
  }
  if (upper.includes("NEP-11") || upper.includes("NEP11")) {
    return "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
  }
  return "badge-soft";
}

function formatTime(timestamp) {
  return formatUnixTime(timestamp) || "-";
}

// Data fetching
async function loadPage() {
  const myRequestId = ++currentRequestId;
  const requestNetwork = resolveNetworkName();
  const offset = (currentPage.value - 1) * pageSize.value;
  const query = searchQuery.value.trim();
  const cacheKey = isSearchMode.value
    ? getCacheKey("contract_search", { name: query, limit: pageSize.value, skip: offset }, requestNetwork)
    : getCacheKey("contract_list", { limit: pageSize.value, skip: offset }, requestNetwork);
  const hasCachedData = getCache(cacheKey) !== null;

  loading.value = !hasCachedData;
  error.value = null;

  try {
    let response;

    response = await contractService.getListWithFallback(pageSize.value, offset, {
      search: isSearchMode.value ? query : "",
      network: requestNetwork,
    });

    if (myRequestId !== currentRequestId || requestNetwork !== resolveNetworkName()) return;
    contracts.value = response?.result || [];
    total.value = response?.totalCount || 0;
  } catch (err) {
    if (myRequestId !== currentRequestId || requestNetwork !== resolveNetworkName()) return;
    if (isAbortError(err)) return;
    if (import.meta.env.DEV) console.error("Failed to load contracts:", err);
    error.value = t("errors.loadContracts");
    contracts.value = [];
  } finally {
    if (myRequestId === currentRequestId && requestNetwork === resolveNetworkName()) {
      loading.value = false;
    }
  }
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    if (isSearchMode.value) {
      currentPage.value = page;
      loadPage();
    } else {
      router.push(`/contracts/${page}`).catch(() => {});
    }
  }
}

function changePageSize(size) {
  pageSize.value = size;
  if (isSearchMode.value) {
    currentPage.value = 1;
    loadPage();
  } else {
    router.push("/contracts/1").catch(() => {});
  }
}

function onSearchInput() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentPage.value = 1;
    loadPage();
  }, SEARCH_DEBOUNCE_MS);
}

// Route-driven page loading
watch(
  () => route.params.page,
  (page) => {
    const parsed = parseInt(page, 10) || 1;
    currentPage.value = Math.max(1, parsed);
    loadPage();
  },
  { immediate: true }
);

// Refetch on network switch — Mainnet ↔ Testnet otherwise leaves
// the previous network's contract list visible until next paginate.
useNetworkChange(() => {
  contracts.value = [];
  total.value = 0;
  loadPage();
});

onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce);
});
</script>
