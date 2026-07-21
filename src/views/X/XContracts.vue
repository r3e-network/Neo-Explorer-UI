<template>
  <div class="x-contracts-page">
    <section class="page-container py-6 md:py-8">
      <!-- Page Hero -->
      <PageHero :particles="3" class="animate-page-enter">
        <Breadcrumb :items="breadcrumbs" />

        <div class="mb-6 flex items-center gap-3">
          <div class="page-header-icon bg-icon-purple text-violet-500">
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
            <h1 class="page-title">{{ tf("pageTitles.xContracts", "Neo X Contracts") }}</h1>
            <p class="page-subtitle">
              {{ tf("neoX.contractsSubtitle", "Verified smart contracts on the Neo X EVM network") }}
            </p>
          </div>
        </div>
      </PageHero>

      <!-- Stats Bar -->
      <div class="mb-5 grid grid-cols-2 gap-4 animate-page-enter animate-page-enter-delay-1">
        <DashboardStatCard
          :label="tf('neoX.statVerifiedContracts', 'Verified Contracts')"
          :value="counters ? toNum(counters.verified_smart_contracts) : null"
          :animated="!countersLoading"
          :icon="verifiedIcon"
          glow-color="#00b377"
          subtitle=""
        />
        <DashboardStatCard
          :label="tf('neoX.statTotalContracts', 'Total Contracts')"
          :value="counters ? toNum(counters.smart_contracts) : null"
          :animated="!countersLoading"
          :icon="totalIcon"
          glow-color="#8b5cf6"
          subtitle=""
        />
      </div>

      <!-- Contract List Card -->
      <div class="etherscan-card overflow-hidden animate-page-enter animate-page-enter-delay-2">
        <div class="card-header">
          <p class="text-mid text-sm">{{ tf("neoX.verifiedContractsHeader", "Verified smart contracts") }}</p>
        </div>

        <!-- Search strip -->
        <div class="soft-divider flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
          <div class="relative w-full sm:w-64">
            <input
              v-model="searchQuery"
              type="text"
              name="x-contract-search"
              :placeholder="tf('neoX.searchContractsPlaceholder', 'Search by contract name')"
              :aria-label="tf('neoX.searchContractsPlaceholder', 'Search by contract name')"
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
            <Skeleton width="30%" height="18px" />
            <Skeleton width="100px" height="18px" />
            <Skeleton width="80px" height="18px" />
            <Skeleton width="80px" height="18px" />
            <Skeleton width="60px" height="18px" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6">
          <ErrorState
            :title="tf('neoX.contractsErrorTitle', 'Unable to load contracts')"
            :message="tf('errors.loadFailed', 'Failed to load data.')"
            @retry="refresh"
          />
        </div>

        <!-- Empty State -->
        <EmptyState v-else-if="items.length === 0" :message="tf('neoX.noContracts', 'No contracts')" icon="contract" />

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[800px]">
            <thead class="table-head">
              <tr>
                <th scope="col" class="table-header-cell">{{ tf("neoX.contract", "Contract") }}</th>
                <th scope="col" class="table-header-cell hidden md:table-cell">{{ tf("neoX.compiler", "Compiler") }}</th>
                <th scope="col" class="table-header-cell hidden lg:table-cell">{{ tf("neoX.license", "License") }}</th>
                <th scope="col" class="table-header-cell">{{ tf("neoX.verified", "Verified") }}</th>
                <th scope="col" class="table-header-cell-right hidden lg:table-cell">
                  {{ tf("neoX.balance", "Balance") }}
                </th>
                <th scope="col" class="table-header-cell-right hidden md:table-cell">
                  {{ tf("neoX.txns", "Txns") }}
                </th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="(contract, idx) in items" :key="contract.address?.hash || idx" class="list-row group">
                <td class="table-cell">
                  <span class="flex items-center gap-2">
                    <XHashLink
                      type="contract"
                      :hash="contract.address?.hash || ''"
                      :name="contract.address?.name || ''"
                      copyable
                    />
                    <span v-if="contract.certified" class="badge-soft whitespace-nowrap text-xs font-semibold">
                      {{ tf("neoX.certified", "Certified") }}
                    </span>
                  </span>
                </td>
                <td class="table-cell hidden md:table-cell">
                  <span v-if="contract.compiler_version" class="badge-soft text-xs font-semibold">
                    {{ contract.compiler_version }}
                  </span>
                  <span v-else class="text-mid">—</span>
                </td>
                <td class="table-cell hidden lg:table-cell">
                  <span class="text-mid">{{ formatLicense(contract.license_type) }}</span>
                </td>
                <td class="table-cell-secondary">
                  {{ contract.verified_at ? formatWhen(Date.parse(contract.verified_at)) : "—" }}
                </td>
                <td class="table-cell-secondary-right hidden lg:table-cell">
                  {{ contract.coin_balance != null ? `${formatGas(contract.coin_balance)} GAS` : "—" }}
                </td>
                <td class="table-cell-right hidden font-medium md:table-cell">
                  {{ contract.transactions_count != null ? formatInt(contract.transactions_count) : "—" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="!loading && items.length > 0" class="soft-divider border-t px-4 py-3">
          <InfiniteScroll :auto="false" :loading="loadingMore" :has-more="hasMore" @load-more="loadMore" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { useDebounceFn } from "@/composables/useVueUtils";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { getNeoxNet } from "@/utils/neoxEnv";
import { contractService } from "@/services/neox";
import { formatGas, formatInt } from "@/utils/neoxFormat";
import { useAgeMode } from "@/composables/useAgeMode";
import PageHero from "@/components/common/PageHero.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";
import XHashLink from "@/components/common/XHashLink.vue";
import DashboardStatCard from "@/components/charts/DashboardStatCard.vue";

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

// Shared etherscan-style Age ⇄ UTC toggle: the Verified column follows the
// app-wide mode like every other timestamp column.
const { formatWhen } = useAgeMode();

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

const verifiedIcon =
  "<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'/></svg>";
const totalIcon =
  "<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'/></svg>";

const breadcrumbs = computed(() => [
  { label: tf("breadcrumb.home", "Home"), to: "/homepage" },
  { label: tf("neoX.chainName", "Neo X"), to: "/x" },
  { label: tf("neoX.contracts", "Contracts") },
]);

const searchQuery = ref("");
const counters = ref(null);
const countersLoading = ref(false);
let countersReqId = 0;

const { items, loading, loadingMore, error, hasMore, loadMore, refresh } = useCursorList((cursor, ctx) =>
  contractService.getList({
    net: getNeoxNet(),
    q: searchQuery.value.trim(),
    cursor,
    signal: ctx.signal,
  })
);

const { debouncedFn: onSearchInput } = useDebounceFn(() => refresh(), SEARCH_DEBOUNCE_MS);

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatLicense(licenseType) {
  if (!licenseType || licenseType === "none") return "—";
  return String(licenseType).replace(/_/g, " ").toUpperCase();
}

async function loadCounters() {
  const current = ++countersReqId;
  counters.value = null;
  countersLoading.value = true;
  try {
    const data = await contractService.getCounters({ net: getNeoxNet() });
    if (current === countersReqId) counters.value = data;
  } catch (_err) {
    if (current === countersReqId) counters.value = null;
  } finally {
    if (current === countersReqId) countersLoading.value = false;
  }
}

onMounted(loadCounters);
useNetworkChange(loadCounters);
</script>
