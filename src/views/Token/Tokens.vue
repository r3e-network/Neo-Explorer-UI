<template>
  <div class="tokens-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.tokens') }]" />

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
          <h1 class="page-title">{{ $t("nav.tokens") || "Tokens" }}</h1>
          <p class="page-subtitle">{{ $t("tokenDetail.pageSubtitle") }}</p>
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
              {{ $t("tokenDetail.tabNep17") }}
            </button>
            <button
              @click="switchTab('nep11')"
              :class="['tab-btn', activeTab === 'nep11' ? 'tab-btn-active' : 'tab-btn-inactive']"
            >
              {{ $t("tokenDetail.tabNep11") }}
            </button>
          </nav>
        </div>

        <!-- Search + Info bar -->
        <div class="soft-divider flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-mid text-sm">
            {{ activeTab === "nep17" ? $t("tokenDetail.listTitleNep17") : $t("tokenDetail.listTitleNep11") }}
            <span v-if="totalCount > 0" class="text-low">{{ $t("tokenDetail.totalCountSuffix", { count: formatNumber(totalCount) }) }}</span>
          </p>
          <div class="relative w-full sm:w-64">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('tokenDetail.searchPlaceholder')"
              :aria-label="$t('tokenDetail.searchAria')"
              class="form-input pl-8 pr-3"
              @input="handleSearchDebounced"
            />
            <svg
              class="text-low absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
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
          <ErrorState :title="$t('tokenDetail.errorLoadTokens')" :message="error" @retry="() => loadPage(currentPage)" />
        </div>

        <!-- Empty -->
        <EmptyState v-else-if="tokens.length === 0" :message="$t('tokenDetail.emptyTokens')" />

        <!-- NEP-17 Table -->
        <div v-else-if="activeTab === 'nep17'" class="overflow-x-auto">
          <table class="w-full min-w-[920px]" :aria-label="$t('aria.nep17TokensTable')">
            <thead class="table-head">
              <tr>
                <th class="table-header-cell w-16">#</th>
                <th class="table-header-cell">{{ $t("tokenDetail.listColToken") }}</th>
                <th class="table-header-cell">{{ $t("tokenDetail.listColSymbol") }}</th>
                <th class="table-header-cell">{{ $t("tokenDetail.listColContract") }}</th>
                <th class="table-header-cell-right">{{ $t("tokenDetail.holdersHeader") }}</th>
                <th class="table-header-cell-right">{{ $t("tokenDetail.listColTotalSupply") }}</th>
                <th class="table-header-cell-right">{{ $t("tokenDetail.listColMarketCap") }}</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="(token, index) in tokens" :key="token.hash" class="list-row group">
                <td class="table-cell-secondary">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="table-cell">
                  <router-link :to="`/nep17-token-info/${token.hash}`" class="flex items-center gap-3">
                    <img
                      v-if="supabaseMeta[token.hash]?.logo_url"
                      :src="supabaseMeta[token.hash].logo_url"
                      class="h-8 w-8 rounded-full object-cover ring-1 ring-line-soft bg-white"
                      alt=""
                      loading="lazy"
                      @error="$event.target.src='/img/brand/neo.png'"
                    />
                    <img
                      v-else-if="hasTokenIcon(token.hash)"
                      :src="getTokenIcon(token.hash, 'NEP17')"
                      class="h-8 w-8 rounded-full object-cover ring-1 ring-line-soft bg-white"
                      alt=""
                      loading="lazy"
                    />
                    <div
                      v-else
                      class="soft-divider text-high flex h-8 w-8 items-center justify-center rounded-full border bg-slate-50 text-sm font-semibold dark:bg-slate-800/70"
                    >
                      {{ token.symbol?.charAt(0) || "?" }}
                    </div>
                    <span
                      class="text-high font-medium hover:text-primary-500 transition-colors flex items-center gap-1"
                    >
                      {{ supabaseMeta[token.hash]?.name || token.tokenname || $t("tokenDetail.unknownToken") }}
                      <svg
                        v-if="supabaseMeta[token.hash]?.is_verified"
                        class="h-3.5 w-3.5 text-success"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </span>
                  </router-link>
                </td>
                <td class="table-cell font-medium">{{ token.symbol || "-" }}</td>
                <td class="table-cell">
                  <router-link :to="`/contract-info/${token.hash}`" class="etherscan-link font-hash">
                    {{ truncateHash(token.hash) }}
                  </router-link>
                </td>
                <td class="table-cell-right font-medium">
                  {{ formatNumber(token.holders || 0) }}
                </td>
                <td class="table-cell-right font-medium">
                  {{ formatSupply(token) }}
                </td>
                <td class="table-cell-secondary-right">
                  {{ formatMarketCap(token) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- NEP-11 Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[920px]" :aria-label="$t('aria.nep11NftsTable')">
            <thead class="table-head">
              <tr>
                <th class="table-header-cell w-16">#</th>
                <th class="table-header-cell">{{ $t("tokenDetail.listColCollection") }}</th>
                <th class="table-header-cell">{{ $t("tokenDetail.listColSymbol") }}</th>
                <th class="table-header-cell">{{ $t("tokenDetail.listColContract") }}</th>
                <th class="table-header-cell-right">{{ $t("tokenDetail.listColItems") }}</th>
                <th class="table-header-cell-right">{{ $t("tokenDetail.holdersHeader") }}</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="(token, index) in tokens" :key="token.hash" class="list-row group">
                <td class="table-cell-secondary">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="table-cell">
                  <router-link :to="`/nft-token-info/${token.hash}`" class="flex items-center gap-3">
                    <img
                      v-if="supabaseMeta[token.hash]?.logo_url"
                      :src="supabaseMeta[token.hash].logo_url"
                      class="h-8 w-8 rounded-full object-cover ring-1 ring-line-soft bg-white"
                      alt=""
                      loading="lazy"
                      @error="$event.target.src='/img/brand/neo.png'"
                    />
                    <img
                      v-else-if="hasTokenIcon(token.hash)"
                      :src="getTokenIcon(token.hash, 'NEP11')"
                      class="h-8 w-8 rounded-full object-cover ring-1 ring-line-soft bg-white"
                      alt=""
                      loading="lazy"
                    />
                    <div
                      v-else
                      class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    >
                      {{ token.symbol?.charAt(0) || "?" }}
                    </div>
                    <span
                      class="text-high font-medium hover:text-primary-500 transition-colors flex items-center gap-1"
                    >
                      {{ supabaseMeta[token.hash]?.name || token.tokenname || $t("tokenDetail.unknownCollection") }}
                      <svg
                        v-if="supabaseMeta[token.hash]?.is_verified"
                        class="h-3.5 w-3.5 text-success"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </span>
                  </router-link>
                </td>
                <td class="table-cell font-medium">{{ token.symbol || "-" }}</td>
                <td class="table-cell">
                  <router-link :to="`/contract-info/${token.hash}`" class="etherscan-link font-hash">
                    {{ truncateHash(token.hash) }}
                  </router-link>
                </td>
                <td class="table-cell-right font-medium">
                  {{ formatSupply(token) }}
                </td>
                <td class="table-cell-right font-medium">
                  {{ formatNumber(token.holders || 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="!loading && tokens.length > 0" class="soft-divider border-t px-4 py-3">
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
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { tokenService } from "@/services";
import { supabaseService } from "@/services/supabaseService";
import { useI18n } from "vue-i18n";
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/constants";
import {
  truncateHash,
  formatNumber,
  formatSupply as formatSupplyRaw,
  formatMarketCap as formatMarketCapRaw,
} from "@/utils/explorerFormat";
import { getTokenIcon, hasTokenIcon } from "@/utils/getTokenIcon";
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
const tokens = ref([]);
const loading = ref(true);
const error = ref(null);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize.value)));
let currentRequestId = 0;

async function loadPage(page = currentPage.value) {
  const myRequestId = ++currentRequestId;
  const offset = (page - 1) * pageSize.value;
  const query = searchQuery.value.trim();
  loading.value = true;
  error.value = null;

  try {
    const response = await tokenService.getTokenListWithFallback(
      activeTab.value === "nep11" ? "NEP11" : "NEP17",
      pageSize.value,
      offset,
      { search: query },
    );

    if (myRequestId !== currentRequestId) return;
    tokens.value = response?.result || [];
    totalCount.value = response?.totalCount || 0;
    currentPage.value = page;
  } catch (err) {
    if (myRequestId !== currentRequestId) return;
    const message = String(err?.message || "").toLowerCase();
    error.value =
      message.includes("not found") || message.includes("unknown rpc error")
        ? t("errors.loadTokensUnavailable")
        : t("errors.loadTokens");
    tokens.value = [];
    totalCount.value = 0;
  } finally {
    if (myRequestId === currentRequestId) {
      loading.value = false;
    }
  }
}

// --- Search debounce (auto-cleanup via useDebounceFn) ---
const { debouncedFn: handleSearchDebounced, cancel: cancelSearch } = useDebounceFn(() => {
  router.push(`/tokens/${activeTab.value}/1`).catch(() => {});
}, SEARCH_DEBOUNCE_MS);

const supabaseMeta = ref({});

watch(
  () => tokens.value,
  async (newTokens) => {
    if (newTokens && newTokens.length) {
      try {
        const hashes = newTokens.map((t) => t.hash).filter(Boolean);
        const meta = await supabaseService.getContractMetadataBatch(hashes);
        supabaseMeta.value = meta;
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[tokens] metadata batch failed:", err);
        supabaseMeta.value = {};
      }
    } else {
      supabaseMeta.value = {};
    }
  },
  { immediate: true },
);

// --- Methods ---
function formatSupply(token) {
  if (token?.totalsupply === null || token?.totalsupply === undefined) return "-";
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
  if (currentPage.value === 1) {
    loadPage(1);
  } else {
    router.push(`/tokens/${tab}/1`).catch(() => {});
  }
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
  },
  { immediate: true },
);

watch(
  () => route.params.page,
  (page) => {
    const parsed = Math.max(1, parseInt(page) || 1);
    currentPage.value = parsed;
    loadPage(parsed);
  },
  { immediate: true },
);
</script>
