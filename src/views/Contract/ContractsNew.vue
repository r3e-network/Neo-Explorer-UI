<template>
  <div class="contracts-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Contracts' }]" />

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
          <h1 class="page-title">Contracts</h1>
          <p class="page-subtitle">Smart contracts deployed on Neo N3</p>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative max-w-md flex-1">
          <svg
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
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
            placeholder="Search by contract name..."
            aria-label="Search contracts"
            class="form-input rounded-lg py-2 pl-10 pr-4"
            @input="onSearchInput"
          />
        </div>
        <router-link
          to="/verify-contract"
          class="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Verify Contract
        </router-link>
      </div>

      <div class="etherscan-card overflow-hidden">
        <div class="card-header">
          <p class="text-sm text-text-secondary dark:text-gray-300">
            {{ isSearchMode ? "Search results" : "Contract registry" }}
          </p>
          <p class="text-sm text-text-muted dark:text-gray-400">Page {{ currentPage }} / {{ totalPages }}</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in 10" :key="index" height="44px" />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-4">
          <ErrorState title="Failed to load contracts" :message="error" @retry="loadPage" />
        </div>

        <!-- Empty State -->
        <div v-else-if="contracts.length === 0" class="p-4">
          <EmptyState :message="isSearchMode ? 'No contracts match your search' : 'No contracts found'" />
        </div>

        <!-- Data Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[900px]">
            <thead class="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th class="table-header-cell">#</th>
                <th class="table-header-cell">Contract</th>
                <th class="table-header-cell">Hash</th>
                <th class="table-header-cell-right">Invocations</th>
                <th class="table-header-cell text-center">Standards</th>
                <th class="table-header-cell text-center">Verified</th>
                <th class="table-header-cell-right">Created</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="(contract, index) in contracts"
                :key="contract.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="table-cell-secondary">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="table-cell">
                  <router-link
                    :to="`/contract-info/${contract.hash}`"
                    class="font-medium text-text-primary etherscan-link dark:text-gray-100"
                  >
                    {{ contract.name || "Unknown Contract" }}
                  </router-link>
                </td>
                <td class="table-cell">
                  <router-link :to="`/contract-info/${contract.hash}`" class="font-hash text-sm etherscan-link">
                    {{ truncateHash(contract.hash) }}
                  </router-link>
                </td>
                <td class="table-cell text-right">
                  {{ formatNumber(contract.invocations || 0) }}
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
                    <span v-if="!getStandards(contract).length" class="text-xs text-text-muted">-</span>
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
                  <span v-else class="text-xs text-text-muted">-</span>
                </td>
                <td class="table-cell-secondary text-right">
                  {{ formatTime(contract.createtime) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && contracts.length > 0"
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
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { contractService } from "@/services";
import { getCache, getCacheKey } from "@/services/cache";
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/constants";
import { truncateHash, formatUnixTime, formatNumber } from "@/utils/explorerFormat";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";

const route = useRoute();
const router = useRouter();

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
  const manifest = contract.manifest;
  if (!manifest) return [];
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
  return "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600";
}

function formatTime(timestamp) {
  return formatUnixTime(timestamp) || "-";
}

// Data fetching
async function loadPage() {
  const myRequestId = ++currentRequestId;
  const offset = (currentPage.value - 1) * pageSize.value;
  const query = searchQuery.value.trim();
  const cacheKey = isSearchMode.value
    ? getCacheKey("contract_search", { name: query, limit: pageSize.value, skip: offset })
    : getCacheKey("contract_list", { limit: pageSize.value, skip: offset });
  const hasCachedData = getCache(cacheKey) !== null;

  loading.value = !hasCachedData;
  error.value = null;

  try {
    let response;

    if (isSearchMode.value) {
      response = await contractService.searchByName(query, pageSize.value, offset);
    } else {
      response = await contractService.getList(pageSize.value, offset);
    }

    if (myRequestId !== currentRequestId) return;
    contracts.value = response?.result || [];
    total.value = response?.totalCount || 0;
  } catch (err) {
    if (myRequestId !== currentRequestId) return;
    if (process.env.NODE_ENV !== "production") console.error("Failed to load contracts:", err);
    error.value = "Failed to load contracts. Please try again.";
    contracts.value = [];
  } finally {
    if (myRequestId === currentRequestId) {
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
      router.push(`/contracts/${page}`);
    }
  }
}

function changePageSize(size) {
  pageSize.value = size;
  if (isSearchMode.value) {
    currentPage.value = 1;
    loadPage();
  } else {
    router.push("/contracts/1");
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
    const parsed = parseInt(page) || 1;
    currentPage.value = Math.max(1, parsed);
    loadPage();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce);
});
</script>
