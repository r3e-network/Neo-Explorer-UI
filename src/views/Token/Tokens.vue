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
              name="token-search"
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

        <!-- NEP-17 Table / Mobile cards -->
        <div v-else-if="activeTab === 'nep17'">
          <div v-if="!isDesktop" class="soft-divider divide-y" data-testid="tokens-mobile-list">
            <MobileListCard v-for="(token, index) in tokens" :key="token.hash" data-testid="token-mobile-card">
              <template #icon>
                <TokenAvatar
                  :src="getTokenLogo(token, 'NEP17')"
                  :name="getTokenName(token)"
                  :symbol="getTokenSymbol(token)"
                  kind="token"
                  size="md"
                />
              </template>

              <template #title>
                <router-link :to="getTokenRoute(token, 'NEP17')" class="etherscan-link font-medium">
                  {{ getTokenName(token) }}
                </router-link>
              </template>

              <template #badge>
                <span class="badge-soft whitespace-nowrap text-xs font-semibold">
                  #{{ (currentPage - 1) * pageSize + index + 1 }}
                </span>
              </template>

              <template #subtitle>
                <span class="inline-flex min-w-0 items-center gap-1.5">
                  <span class="font-medium text-high">{{ getTokenSymbol(token) }}</span>
                  <svg v-if="isTokenVerified(token)" class="h-3.5 w-3.5 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </span>
              </template>

              <template #metrics>
                <div class="min-w-0 rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("tokenDetail.listColContract") }}</dt>
                  <dd class="mt-1 min-w-0 text-sm font-medium">
                    <router-link :to="`/contract-info/${token.hash}`" class="etherscan-link font-hash">
                      {{ truncateHash(token.hash) }}
                    </router-link>
                  </dd>
                </div>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("tokenDetail.holdersHeader") }}</dt>
                  <dd class="mt-1 text-sm font-medium text-high">{{ formatNumber(token.holders || 0) }}</dd>
                </div>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("tokenDetail.listColTotalSupply") }}</dt>
                  <dd class="mt-1 truncate text-sm font-medium text-high" :title="formatSupply(token)">
                    {{ formatSupply(token) }}
                  </dd>
                </div>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("tokenDetail.listColMarketCap") }}</dt>
                  <dd class="mt-1 truncate text-sm font-medium text-high" :title="formatMarketCap(token)">
                    {{ formatMarketCap(token) }}
                  </dd>
                </div>
              </template>
            </MobileListCard>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[920px]" :aria-label="$t('aria.nep17TokensTable')">
            <thead class="table-head">
              <tr>
                <th scope="col" class="table-header-cell w-16">#</th>
                <th scope="col" class="table-header-cell">{{ $t("tokenDetail.listColToken") }}</th>
                <th scope="col" class="table-header-cell">{{ $t("tokenDetail.listColSymbol") }}</th>
                <th scope="col" class="table-header-cell">{{ $t("tokenDetail.listColContract") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("tokenDetail.holdersHeader") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("tokenDetail.listColTotalSupply") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("tokenDetail.listColMarketCap") }}</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="(token, index) in tokens" :key="token.hash" class="list-row group">
                <td class="table-cell-secondary">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="table-cell">
                  <router-link :to="getTokenRoute(token, 'NEP17')" class="flex items-center gap-3">
                    <TokenAvatar
                      :src="getTokenLogo(token, 'NEP17')"
                      :name="getTokenName(token)"
                      :symbol="getTokenSymbol(token)"
                      kind="token"
                      size="sm"
                    />
                    <span
                      class="text-high font-medium hover:text-primary-500 transition-colors flex items-center gap-1"
                    >
                      {{ getTokenName(token) }}
                      <svg
                        v-if="isTokenVerified(token)"
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
                <td class="table-cell font-medium">{{ getTokenSymbol(token) }}</td>
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
        </div>

        <!-- NEP-11 Table / Mobile cards -->
        <div v-else>
          <div v-if="!isDesktop" class="soft-divider divide-y" data-testid="nft-mobile-list">
            <MobileListCard v-for="(token, index) in tokens" :key="token.hash" data-testid="nft-mobile-card">
              <template #icon>
                <TokenAvatar
                  :src="getTokenLogo(token, 'NEP11')"
                  :name="getTokenName(token)"
                  :symbol="getTokenSymbol(token)"
                  kind="nft"
                  size="md"
                />
              </template>

              <template #title>
                <router-link :to="getTokenRoute(token, 'NEP11')" class="etherscan-link font-medium">
                  {{ getTokenName(token) }}
                </router-link>
              </template>

              <template #badge>
                <span class="badge-soft whitespace-nowrap text-xs font-semibold">
                  #{{ (currentPage - 1) * pageSize + index + 1 }}
                </span>
              </template>

              <template #subtitle>
                <span class="inline-flex min-w-0 items-center gap-1.5">
                  <span class="font-medium text-high">{{ getTokenSymbol(token) }}</span>
                  <svg v-if="isTokenVerified(token)" class="h-3.5 w-3.5 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </span>
              </template>

              <template #metrics>
                <div class="min-w-0 rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("tokenDetail.listColContract") }}</dt>
                  <dd class="mt-1 min-w-0 text-sm font-medium">
                    <router-link :to="`/contract-info/${token.hash}`" class="etherscan-link font-hash">
                      {{ truncateHash(token.hash) }}
                    </router-link>
                  </dd>
                </div>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("tokenDetail.listColItems") }}</dt>
                  <dd class="mt-1 truncate text-sm font-medium text-high" :title="formatSupply(token)">
                    {{ formatSupply(token) }}
                  </dd>
                </div>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">{{ $t("tokenDetail.holdersHeader") }}</dt>
                  <dd class="mt-1 text-sm font-medium text-high">{{ formatNumber(token.holders || 0) }}</dd>
                </div>
              </template>
            </MobileListCard>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[920px]" :aria-label="$t('aria.nep11NftsTable')">
            <thead class="table-head">
              <tr>
                <th scope="col" class="table-header-cell w-16">#</th>
                <th scope="col" class="table-header-cell">{{ $t("tokenDetail.listColCollection") }}</th>
                <th scope="col" class="table-header-cell">{{ $t("tokenDetail.listColSymbol") }}</th>
                <th scope="col" class="table-header-cell">{{ $t("tokenDetail.listColContract") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("tokenDetail.listColItems") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("tokenDetail.holdersHeader") }}</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="(token, index) in tokens" :key="token.hash" class="list-row group">
                <td class="table-cell-secondary">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="table-cell">
                  <router-link :to="getTokenRoute(token, 'NEP11')" class="flex items-center gap-3">
                    <TokenAvatar
                      :src="getTokenLogo(token, 'NEP11')"
                      :name="getTokenName(token)"
                      :symbol="getTokenSymbol(token)"
                      kind="nft"
                      size="sm"
                    />
                    <span
                      class="text-high font-medium hover:text-primary-500 transition-colors flex items-center gap-1"
                    >
                      {{ getTokenName(token) }}
                      <svg
                        v-if="isTokenVerified(token)"
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
                <td class="table-cell font-medium">{{ getTokenSymbol(token) }}</td>
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
import { useMediaQuery } from "@vueuse/core";
import { tokenService } from "@/services/tokenService";
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
import { useNetworkChange } from "@/composables/useNetworkChange";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import MobileListCard from "@/components/common/MobileListCard.vue";
import TokenAvatar from "@/components/common/TokenAvatar.vue";
import { isAbortError } from "@/utils/abortError";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const isDesktop = useMediaQuery("(min-width: 768px)");

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
    if (isAbortError(err)) return;
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
function getTokenMeta(token) {
  const hash = String(token?.hash || "").toLowerCase();
  return supabaseMeta.value[token?.hash] || supabaseMeta.value[hash] || {};
}

function getTokenName(token) {
  const meta = getTokenMeta(token);
  const fallbackKey = activeTab.value === "nep11" ? "tokenDetail.unknownCollection" : "tokenDetail.unknownToken";
  return meta.name || token?.tokenname || token?.name || t(fallbackKey);
}

function getTokenSymbol(token) {
  const meta = getTokenMeta(token);
  return token?.symbol || meta.symbol || "-";
}

function getTokenLogo(token, standard) {
  const meta = getTokenMeta(token);
  if (meta.logo_url) return meta.logo_url;
  return hasTokenIcon(token?.hash) ? getTokenIcon(token.hash, standard) : "";
}

function isTokenVerified(token) {
  return Boolean(getTokenMeta(token).is_verified);
}

function getTokenRoute(token, standard) {
  return standard === "NEP11" ? `/nft-token-info/${token.hash}` : `/nep17-token-info/${token.hash}`;
}

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
    const parsed = Math.max(1, parseInt(page, 10) || 1);
    currentPage.value = parsed;
    loadPage(parsed);
  },
  { immediate: true },
);

// Refetch on network switch — without this, switching Mainnet ↔ Testnet
// while sitting on /tokens leaves the previous network's rows visible
// until the user paginates or searches.
useNetworkChange(() => loadPage(currentPage.value));
</script>
