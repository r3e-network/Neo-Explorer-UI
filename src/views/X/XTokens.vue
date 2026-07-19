<template>
  <div class="x-tokens-page">
    <section class="page-container py-6 md:py-8">
      <!-- Page Hero -->
      <PageHero :particles="3" class="animate-page-enter">
        <Breadcrumb :items="breadcrumbs" />

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
            <h1 class="page-title">{{ tf("pageTitles.xTokens", "Neo X Tokens") }}</h1>
            <p class="page-subtitle">{{ tf("neoX.tokensSubtitle", "Token contracts on the Neo X EVM network") }}</p>
          </div>
        </div>
      </PageHero>

      <!-- Token List Card -->
      <div class="etherscan-card overflow-hidden animate-page-enter animate-page-enter-delay-1">
        <!-- Tabs -->
        <div class="card-header">
          <nav class="flex gap-1">
            <button
              v-for="tab in TABS"
              :key="tab.id"
              type="button"
              :class="['tab-btn', tab.id === activeType ? 'tab-btn-active' : 'tab-btn-inactive']"
              :aria-pressed="tab.id === activeType ? 'true' : 'false'"
              @click="setType(tab.id)"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <!-- Search strip -->
        <div class="soft-divider flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-mid text-sm">{{ activeTabLabel }} {{ tf("neoX.tokensSuffix", "tokens") }}</p>
          <div class="relative w-full sm:w-64">
            <input
              v-model="searchQuery"
              type="text"
              name="x-token-search"
              :placeholder="tf('neoX.searchTokensPlaceholder', 'Search by name or symbol')"
              :aria-label="tf('neoX.searchTokensPlaceholder', 'Search by name or symbol')"
              class="form-input pl-8 pr-3"
              @input="onSearchInput"
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

        <!-- Loading Skeleton -->
        <div v-if="loading" class="soft-divider divide-y">
          <div v-for="i in PAGE_SIZE" :key="i" class="flex items-center gap-4 px-4 py-3">
            <Skeleton width="32px" height="32px" variant="circle" />
            <Skeleton width="30%" height="18px" />
            <Skeleton width="60px" height="18px" />
            <Skeleton width="80px" height="18px" />
            <Skeleton width="100px" height="18px" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6">
          <ErrorState
            :title="tf('neoX.tokensErrorTitle', 'Unable to load tokens')"
            :message="tf('errors.loadFailed', 'Failed to load tokens.')"
            @retry="refresh"
          />
        </div>

        <!-- Empty State -->
        <EmptyState v-else-if="items.length === 0" :message="tf('neoX.noTokens', 'No tokens')" icon="token" />

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[800px]">
            <thead class="table-head">
              <tr>
                <th scope="col" class="table-header-cell">{{ tf("neoX.token", "Token") }}</th>
                <th scope="col" class="table-header-cell hidden md:table-cell">{{ tf("neoX.standard", "Standard") }}</th>
                <th scope="col" class="table-header-cell-right">{{ tf("neoX.holders", "Holders") }}</th>
                <th scope="col" class="table-header-cell-right hidden md:table-cell">
                  {{ tf("neoX.totalSupply", "Total Supply") }}
                </th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="token in items" :key="token.contractHash" class="list-row group">
                <td class="table-cell">
                  <router-link
                    :to="`/x/token/${token.contractHash}`"
                    class="etherscan-link flex items-center gap-3 font-medium"
                    :title="token.contractHash"
                  >
                    <TokenAvatar
                      :src="token.iconUrl || ''"
                      :name="token.name || ''"
                      :symbol="token.symbol || ''"
                      kind="token"
                      size="sm"
                    />
                    <span class="min-w-0 truncate">{{ tokenDisplayName(token) }}</span>
                    <span v-if="token.symbol" class="badge-soft whitespace-nowrap text-xs font-semibold">
                      {{ token.symbol }}
                    </span>
                  </router-link>
                </td>
                <td class="table-cell hidden md:table-cell">
                  <span class="badge-soft text-xs font-semibold">{{ token.standard || "—" }}</span>
                </td>
                <td class="table-cell-right font-medium">{{ formatInt(token.holders) }}</td>
                <td class="table-cell-secondary-right hidden md:table-cell">
                  {{ token.totalSupply != null ? formatUnits(token.totalSupply, Number(token.decimals ?? 0)) : "—" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="!loading && items.length > 0" class="soft-divider border-t px-4 py-3">
          <InfiniteScroll :loading="loadingMore" :has-more="hasMore" @load-more="loadMore" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { useDebounceFn } from "@/composables/useVueUtils";
import { getNeoxNet } from "@/utils/neoxEnv";
import { tokenService } from "@/services/neox";
import { formatInt, formatUnits, shortHash } from "@/utils/neoxFormat";
import PageHero from "@/components/common/PageHero.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";
import TokenAvatar from "@/components/common/TokenAvatar.vue";

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

const TABS = [
  { id: "erc20", label: "ERC-20" },
  { id: "erc721", label: "ERC-721" },
  { id: "erc1155", label: "ERC-1155" },
];

const breadcrumbs = computed(() => [
  { label: tf("breadcrumb.home", "Home"), to: "/homepage" },
  { label: tf("neoX.chainName", "Neo X"), to: "/x" },
  { label: tf("breadcrumb.tokens", "Tokens") },
]);

const activeType = ref("erc20");
const searchQuery = ref("");

const activeTabLabel = computed(() => TABS.find((tab) => tab.id === activeType.value)?.label || "");

const { items, loading, loadingMore, error, hasMore, loadMore, refresh } = useCursorList((cursor, ctx) =>
  tokenService.getList({
    net: getNeoxNet(),
    type: activeType.value,
    q: searchQuery.value.trim(),
    cursor,
    signal: ctx.signal,
  })
);

const { debouncedFn: onSearchInput, cancel: cancelSearch } = useDebounceFn(() => refresh(), SEARCH_DEBOUNCE_MS);

function setType(type) {
  if (type === activeType.value) return;
  cancelSearch();
  activeType.value = type;
  refresh();
}

function tokenDisplayName(token) {
  return token.name || token.symbol || shortHash(token.contractHash);
}
</script>
