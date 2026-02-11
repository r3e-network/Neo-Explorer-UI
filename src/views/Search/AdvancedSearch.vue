<template>
  <div class="advanced-search-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Advanced Search' }]" />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-text-primary dark:text-gray-100">Advanced Search</h1>
          <p class="text-sm text-text-secondary dark:text-gray-400">Filter and search across the Neo N3 blockchain</p>
        </div>
      </div>

      <!-- Search Form -->
      <div class="etherscan-card mb-6 p-5">
        <form @submit.prevent="performSearch" class="space-y-4">
          <!-- Type Filter + Input Row -->
          <div class="flex flex-col gap-3 sm:flex-row">
            <select v-model="searchType" aria-label="Search type filter" class="form-input sm:w-48">
              <option value="all">All Types</option>
              <option value="address">Address</option>
              <option value="transaction">Transaction</option>
              <option value="block">Block</option>
              <option value="contract">Contract</option>
            </select>

            <div class="relative flex-1">
              <input
                ref="searchInput"
                v-model="query"
                type="text"
                aria-label="Search query input"
                :placeholder="inputPlaceholder"
                class="form-input pr-10"
                @input="clearValidation"
              />
              <button
                v-if="query"
                type="button"
                @click="clearSearch"
                aria-label="Clear search query"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <button
              type="submit"
              :disabled="searching || !query.trim()"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg v-if="searching" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{{ searching ? "Searching..." : "Search" }}</span>
            </button>
          </div>

          <!-- Validation Message -->
          <p v-if="validationError" class="text-sm text-red-500 dark:text-red-400">
            {{ validationError }}
          </p>

          <!-- Search Hints -->
          <div class="flex flex-wrap gap-2 text-xs text-text-muted dark:text-gray-500">
            <span class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700"> Block: height or hash </span>
            <span class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700"> Tx: 0x + 64 hex chars </span>
            <span class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700"> Address: starts with N </span>
            <span class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700"> Contract: script hash </span>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div v-if="searching" class="etherscan-card p-6">
        <div class="space-y-3">
          <Skeleton height="24px" width="40%" />
          <Skeleton height="60px" />
          <Skeleton height="60px" />
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="searchError" class="etherscan-card p-4">
        <ErrorState title="Search failed" :message="searchError" @retry="performSearch" />
      </div>

      <!-- Results -->
      <div v-else-if="hasSearched" class="etherscan-card overflow-hidden">
        <!-- Result Found -->
        <template v-if="result.type">
          <div
            class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
          >
            <p class="text-sm font-semibold text-text-primary dark:text-gray-200">Search Result</p>
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="resultBadgeClass"
            >
              {{ resultTypeLabel }}
            </span>
          </div>

          <div class="p-4">
            <!-- Block Result -->
            <div v-if="result.type === 'block'" class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <svg class="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm text-text-muted dark:text-gray-500">Block Height</p>
                  <p class="font-semibold text-text-primary dark:text-gray-200">
                    {{ formatNumber(result.data.index) }}
                  </p>
                </div>
              </div>
              <HashLink :hash="result.data.hash" type="block" :truncate="false" />
              <router-link
                :to="`/block-info/${result.data.hash}`"
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600"
              >
                View Block Details
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </router-link>
            </div>

            <!-- Transaction Result -->
            <div v-else-if="result.type === 'transaction'" class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <svg class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4z"
                    />
                  </svg>
                </div>
                <div>
                  <p class="text-sm text-text-muted dark:text-gray-500">Transaction</p>
                  <p class="font-semibold text-text-primary dark:text-gray-200">
                    {{ truncateHash(result.data.hash) }}
                  </p>
                </div>
              </div>
              <HashLink :hash="result.data.hash" type="tx" :truncate="false" />
              <router-link
                :to="`/transaction-info/${result.data.hash}`"
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600"
              >
                View Transaction Details
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </router-link>
            </div>

            <!-- Address Result -->
            <div v-else-if="result.type === 'address'" class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <svg class="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                    />
                  </svg>
                </div>
                <div>
                  <p class="text-sm text-text-muted dark:text-gray-500">Address</p>
                  <p class="font-semibold text-text-primary dark:text-gray-200">
                    {{ truncateHash(query.trim(), 12, 10) }}
                  </p>
                </div>
              </div>
              <HashLink :hash="query.trim()" type="address" :truncate="false" />
              <router-link
                :to="`/account-profile/${query.trim()}`"
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600"
              >
                View Address Details
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </router-link>
            </div>

            <!-- Contract Result -->
            <div v-else-if="result.type === 'contract'" class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <svg
                    class="h-5 w-5 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <div>
                  <p class="text-sm text-text-muted dark:text-gray-500">Contract</p>
                  <p class="font-semibold text-text-primary dark:text-gray-200">
                    {{ result.data.name || truncateHash(result.data.hash) }}
                  </p>
                </div>
              </div>
              <HashLink :hash="result.data.hash" type="contract" :truncate="false" />
              <router-link
                :to="`/contract-info/${result.data.hash}`"
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600"
              >
                View Contract Details
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </router-link>
            </div>
          </div>
        </template>

        <!-- No Results -->
        <template v-else>
          <div class="p-4">
            <EmptyState
              message="No results found"
              :description="`No matching ${
                searchType === 'all' ? 'records' : searchType + 's'
              } found for '${query.trim()}'`"
            />
          </div>
        </template>
      </div>

      <!-- Initial Empty State (before any search) -->
      <div v-else class="etherscan-card p-8 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h2 class="mb-2 text-lg font-semibold text-text-primary dark:text-gray-200">Search the Neo N3 Blockchain</h2>
        <p class="mx-auto max-w-md text-sm text-text-secondary dark:text-gray-400">
          Enter a block height, transaction hash, address, or contract hash above to search. Use the type filter to
          narrow your search scope.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import HashLink from "@/components/common/HashLink.vue";
import { searchService } from "@/services";
import { truncateHash, formatNumber } from "@/utils/explorerFormat";

const route = useRoute();

const searchInput = ref(null);
const query = ref("");
const searchType = ref("all");
const searching = ref(false);
const searchError = ref(null);
const hasSearched = ref(false);
const validationError = ref(null);
const result = ref({ type: null, data: null });
const abortController = ref(null);

onBeforeUnmount(() => {
  abortController.value?.abort();
});

const inputPlaceholder = computed(() => {
  const placeholders = {
    all: "Search by address, tx hash, block height, or contract hash...",
    address: "Enter Neo N3 address (starts with N)...",
    transaction: "Enter transaction hash (0x + 64 hex chars)...",
    block: "Enter block height or block hash...",
    contract: "Enter contract script hash...",
  };
  return placeholders[searchType.value] || placeholders.all;
});

const resultTypeLabel = computed(() => {
  const labels = {
    block: "Block",
    transaction: "Transaction",
    address: "Address",
    contract: "Contract",
  };
  return labels[result.value.type] || "Unknown";
});

const resultBadgeClass = computed(() => {
  const classes = {
    block: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    transaction: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    address: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    contract: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return classes[result.value.type] || "";
});

function clearValidation() {
  validationError.value = null;
}

function clearSearch() {
  query.value = "";
  hasSearched.value = false;
  result.value = { type: null, data: null };
  searchError.value = null;
  validationError.value = null;
  searchInput.value?.focus();
}

function validate() {
  const q = query.value.trim();
  if (!q) {
    validationError.value = "Please enter a search term.";
    return false;
  }
  if (q.length > 256) {
    validationError.value = "Search query is too long (max 256 characters).";
    return false;
  }

  if (searchType.value === "address" && !/^N[A-Za-z0-9]{33}$/.test(q)) {
    validationError.value = "Invalid Neo N3 address format. Must start with N followed by 33 alphanumeric characters.";
    return false;
  }
  if (searchType.value === "transaction" && !/^(0x)?[a-fA-F0-9]{64}$/.test(q)) {
    validationError.value = "Invalid transaction hash. Must be 64 hex characters (optionally prefixed with 0x).";
    return false;
  }
  if (searchType.value === "block" && !/^(\d+|(0x)?[a-fA-F0-9]{64})$/.test(q)) {
    validationError.value = "Invalid block identifier. Enter a block height (number) or block hash.";
    return false;
  }
  if (searchType.value === "contract" && !/^(0x)?[a-fA-F0-9]{40,64}$/.test(q)) {
    validationError.value = "Invalid contract hash format.";
    return false;
  }

  validationError.value = null;
  return true;
}

async function performSearch() {
  if (!validate()) return;

  abortController.value?.abort();
  abortController.value = new AbortController();

  searching.value = true;
  searchError.value = null;
  hasSearched.value = true;

  try {
    const res = await searchService.search(query.value.trim());
    if (abortController.value?.signal.aborted) return;
    result.value = res || { type: null, data: null };
  } catch (e) {
    if (abortController.value?.signal.aborted) return;
    searchError.value = e.message || "An unexpected error occurred during search.";
    result.value = { type: null, data: null };
  } finally {
    searching.value = false;
  }
}

// created() equivalent - runs synchronously during setup
const q = route.query.q;
if (q) {
  query.value = q;
  performSearch();
}
</script>
