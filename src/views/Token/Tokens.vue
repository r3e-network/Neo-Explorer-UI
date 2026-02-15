<template>
  <div class="tokens-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tokens' }]" />

      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">Tokens</h1>
          <p class="page-subtitle">NEP-17 fungible tokens on Neo N3</p>
        </div>
      </div>

      <!-- Token List Card -->
      <div class="etherscan-card overflow-hidden">
        <!-- Tabs -->
        <div class="card-header">
          <nav class="flex gap-1">
            <button
              @click="switchTab('nep17')"
              :class="['tab-btn', activeTab === 'nep17' ? 'tab-btn-active' : 'tab-btn-inactive']"
            >
              NEP-17 Tokens
            </button>
            <button
              @click="switchTab('nep11')"
              :class="['tab-btn', activeTab === 'nep11' ? 'tab-btn-active' : 'tab-btn-inactive']"
            >
              NEP-11 NFTs
            </button>
          </nav>
        </div>

        <!-- Search + Info bar -->
        <div
          class="flex flex-col gap-3 border-b border-card-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-card-border-dark"
        >
          <p class="text-sm text-text-secondary dark:text-gray-300">
            {{ activeTab === "nep17" ? "NEP-17 Token List" : "NEP-11 NFT Collection List" }}
            <span v-if="totalCount > 0" class="text-text-muted">({{ formatNumber(totalCount) }} total)</span>
          </p>
          <div class="relative w-full sm:w-64">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name..."
              aria-label="Search tokens"
              class="form-input pl-8 pr-3"
              @input="handleSearchDebounced"
            />
            <svg
              class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
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
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="i in pageSize" :key="i" height="44px" />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6">
          <ErrorState title="Unable to load tokens" :message="error" @retry="() => loadPage(currentPage)" />
        </div>

        <!-- Empty -->
        <EmptyState v-else-if="tokens.length === 0" message="No tokens found" />

        <!-- NEP-17 Table -->
        <div v-else-if="activeTab === 'nep17'" class="overflow-x-auto">
          <table class="w-full min-w-[920px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">#</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">Token</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">Symbol</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">Contract</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary dark:text-gray-400">Holders</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary dark:text-gray-400">Total Supply</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary dark:text-gray-400">Market Cap</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="(token, index) in tokens"
                :key="token.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="px-4 py-3 text-sm text-text-muted">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="px-4 py-3">
                  <router-link :to="`/nep17-token-info/${token.hash}`" class="flex items-center gap-3">
                    <div
                      class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-text-primary dark:bg-gray-700 dark:text-gray-100"
                    >
                      {{ token.symbol?.charAt(0) || "?" }}
                    </div>
                    <span class="font-medium text-text-primary hover:text-primary-500 dark:text-gray-100">
                      {{ token.tokenname || "Unknown Token" }}
                    </span>
                  </router-link>
                </td>
                <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">{{ token.symbol || "-" }}</td>
                <td class="px-4 py-3">
                  <router-link :to="`/contract-info/${token.hash}`" class="font-hash text-sm etherscan-link">
                    {{ truncateHash(token.hash) }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                  {{ formatNumber(token.holders || 0) }}
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                  {{ formatSupply(token) }}
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-muted">
                  {{ formatMarketCap(token) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- NEP-11 Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[920px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">#</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">Collection</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">Symbol</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary dark:text-gray-400">Contract</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary dark:text-gray-400">Items</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary dark:text-gray-400">Holders</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="(token, index) in tokens"
                :key="token.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="px-4 py-3 text-sm text-text-muted">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="px-4 py-3">
                  <router-link :to="`/nft-token-info/${token.hash}`" class="flex items-center gap-3">
                    <div
                      class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    >
                      {{ token.symbol?.charAt(0) || "?" }}
                    </div>
                    <span class="font-medium text-text-primary hover:text-primary-500 dark:text-gray-100">
                      {{ token.tokenname || "Unknown Collection" }}
                    </span>
                  </router-link>
                </td>
                <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">{{ token.symbol || "-" }}</td>
                <td class="px-4 py-3">
                  <router-link :to="`/contract-info/${token.hash}`" class="font-hash text-sm etherscan-link">
                    {{ truncateHash(token.hash) }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                  {{ formatSupply(token) }}
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                  {{ formatNumber(token.holders || 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && tokens.length > 0"
          class="border-t border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <EtherscanPagination
            :page="currentPage"
            :total-pages="totalPages"
            :page-size="pageSize"
            :total="totalCount"
            @update:page="goToPage"
            @update:page-size="changePageSize"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { tokenService } from "@/services";
import { getCacheKey } from "@/services/cache";
import { useI18n } from "vue-i18n";
import { SEARCH_DEBOUNCE_MS } from "@/constants";
import {
  truncateHash,
  formatNumber,
  formatSupply as formatSupplyRaw,
  formatMarketCap as formatMarketCapRaw,
} from "@/utils/explorerFormat";
import { usePagination } from "@/composables/usePagination";
import { useDebounceFn } from "@/composables/useVueUtils";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const activeTab = ref("nep17");
const searchQuery = ref("");
const VALID_TABS = ["nep17", "nep11"];

// Dynamic fetch: reads activeTab and searchQuery at call time
function fetchTokens(limit, skip) {
  const query = searchQuery.value.trim();
  if (query) {
    return activeTab.value === "nep11"
      ? tokenService.searchNep11ByName(query, limit, skip)
      : tokenService.searchNep17ByName(query, limit, skip);
  }
  return activeTab.value === "nep11" ? tokenService.getNep11List(limit, skip) : tokenService.getNep17List(limit, skip);
}

// Cache key depends on tab + search
function tokenCacheKey(limit, skip) {
  const query = searchQuery.value.trim();
  if (query) {
    return getCacheKey(activeTab.value === "nep11" ? "token_nep11_search" : "token_nep17_search", {
      name: query,
      limit,
      skip,
    });
  }
  return getCacheKey(activeTab.value === "nep11" ? "token_nep11_list" : "token_nep17_list", { limit, skip });
}

const { items: tokens, loading, error, totalCount, currentPage, pageSize, totalPages, loadPage } = usePagination(
  fetchTokens,
  {
    cacheKeyFn: tokenCacheKey,
    errorMessage: t("errors.loadTokens"),
  }
);

// --- Search debounce (auto-cleanup via useDebounceFn) ---
const { debouncedFn: handleSearchDebounced, cancel: cancelSearch } = useDebounceFn(() => {
  router.push(`/tokens/${activeTab.value}/1`).catch(() => {});
}, SEARCH_DEBOUNCE_MS);

// --- Methods ---
function formatSupply(token) {
  return formatSupplyRaw(token.totalsupply, token.decimals || 0);
}

function formatMarketCap(token) {
  return formatMarketCapRaw(token.market_cap || token.marketcap);
}

function switchTab(tab) {
  if (tab === activeTab.value) return;
  cancelSearch();
  activeTab.value = tab;
  searchQuery.value = "";
  router.push(`/tokens/${tab}/1`).catch(() => {});
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    router.push(`/tokens/${activeTab.value}/${page}`).catch(() => {});
  }
}

function changePageSize(size) {
  pageSize.value = size;
  router.push(`/tokens/${activeTab.value}/1`).catch(() => {});
}

// --- Route watchers ---
watch(
  () => route.params.tab,
  (tab) => {
    if (tab) {
      const validTab = VALID_TABS.includes(tab) ? tab : "nep17";
      if (validTab !== activeTab.value) activeTab.value = validTab;
    }
  }
);

watch(
  () => route.params.page,
  (page) => {
    const parsed = Math.max(1, parseInt(page) || 1);
    currentPage.value = parsed;
    loadPage(parsed);
  },
  { immediate: true }
);
</script>
