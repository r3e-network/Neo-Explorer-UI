<template>
  <div class="advanced-search-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.advancedSearch') }]" />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
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
          <h1 class="page-title">{{ $t("pages.advancedSearch.title") }}</h1>
          <p class="page-subtitle">{{ $t("pages.advancedSearch.subtitle") }}</p>
        </div>
      </div>

      <!-- Search Form -->
      <div class="etherscan-card mb-6 p-5">
        <form @submit.prevent="performSearch" class="space-y-4">
          <!-- Type Filter + Input Row -->
          <div class="flex flex-col gap-3 sm:flex-row">
            <select v-model="searchType" :aria-label="$t('pages.advancedSearch.typeAria')" class="form-input sm:w-48">
              <option value="all">{{ $t("pages.advancedSearch.typeAll") }}</option>
              <option value="address">{{ $t("pages.advancedSearch.typeAddress") }}</option>
              <option value="transaction">{{ $t("pages.advancedSearch.typeTransaction") }}</option>
              <option value="block">{{ $t("pages.advancedSearch.typeBlock") }}</option>
              <option value="contract">{{ $t("pages.advancedSearch.typeContract") }}</option>
            </select>

            <div class="relative flex-1">
              <input
                ref="searchInput"
                v-model="query"
                type="text"
                :aria-label="$t('pages.advancedSearch.queryAria')"
                :placeholder="inputPlaceholder"
                class="form-input pr-10"
                @input="clearValidation"
              />
              <button
                v-if="query"
                type="button"
                @click="clearSearch"
                :aria-label="$t('pages.advancedSearch.clearAria')"
                class="text-low absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-mid"
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
              <span>{{ searching ? $t("pages.advancedSearch.submittingLabel") : $t("pages.advancedSearch.submitLabel") }}</span>
            </button>
          </div>

          <!-- Validation Message -->
          <p v-if="validationError" class="text-sm text-red-500 dark:text-red-400">
            {{ validationError }}
          </p>

          <!-- Search Hints -->
          <div class="text-low flex flex-wrap gap-2 text-xs">
            <span class="badge-soft rounded px-2 py-1">{{ $t("pages.advancedSearch.hintBlock") }}</span>
            <span class="badge-soft rounded px-2 py-1">{{ $t("pages.advancedSearch.hintTx") }}</span>
            <span class="badge-soft rounded px-2 py-1">{{ $t("pages.advancedSearch.hintAddress") }}</span>
            <span class="badge-soft rounded px-2 py-1">{{ $t("pages.advancedSearch.hintContract") }}</span>
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
        <ErrorState :title="$t('pages.advancedSearch.errorTitle')" :message="searchError" @retry="performSearch" />
      </div>

      <!-- Results -->
      <div v-else-if="hasSearched" class="etherscan-card overflow-hidden">
        <!-- Result Found -->
        <template v-if="result.type">
          <div class="card-header">
            <p class="text-high text-sm font-semibold">{{ $t("pages.advancedSearch.resultHeader") }}</p>
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
                  <p class="text-low text-sm">{{ $t("pages.advancedSearch.blockHeightLabel") }}</p>
                  <p class="text-high font-semibold">
                    {{ formatNumber(result.data.index) }}
                  </p>
                </div>
              </div>
              <HashLink :hash="result.data.hash" type="block" :truncated="false" />
              <router-link
                :to="`/block-info/${result.data.hash}`"
                class="inline-flex items-center gap-1 text-sm font-medium etherscan-link"
              >
                {{ $t('pages.advancedSearch.viewBlockDetails') }}
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
                  <p class="text-low text-sm">{{ $t('pages.advancedSearch.resultTransaction') }}</p>
                  <p class="text-high font-semibold">
                    {{ truncateHash(result.data.hash) }}
                  </p>
                </div>
              </div>
              <HashLink :hash="result.data.hash" type="tx" :truncated="false" />
              <router-link
                :to="`/transaction-info/${result.data.hash}`"
                class="inline-flex items-center gap-1 text-sm font-medium etherscan-link"
              >
                {{ $t('pages.advancedSearch.viewTxDetails') }}
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
                  <p class="text-low text-sm">{{ $t('pages.advancedSearch.resultAddress') }}</p>
                  <p class="text-high font-semibold">
                    {{ truncateHash(query.trim(), 12, 10) }}
                  </p>
                </div>
              </div>
              <HashLink :hash="query.trim()" type="address" :truncated="false" />
              <router-link
                :to="`/account-profile/${query.trim()}`"
                class="inline-flex items-center gap-1 text-sm font-medium etherscan-link"
              >
                {{ $t('pages.advancedSearch.viewAddressDetails') }}
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
                  <p class="text-low text-sm">{{ $t('pages.advancedSearch.resultContract') }}</p>
                  <p class="text-high font-semibold">
                    {{ result.data.name || truncateHash(result.data.hash) }}
                  </p>
                </div>
              </div>
              <HashLink :hash="result.data.hash" type="contract" :truncated="false" />
              <router-link
                :to="`/contract-info/${result.data.hash}`"
                class="inline-flex items-center gap-1 text-sm font-medium etherscan-link"
              >
                {{ $t('pages.advancedSearch.viewContractDetails') }}
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
              :message="$t('pages.advancedSearch.noResults')"
              :description="
                $t('pages.advancedSearch.noResultsDescription', {
                  type: searchType === 'all'
                    ? $t('pages.advancedSearch.noResultsTypeAll')
                    : $t('pages.advancedSearch.noResultsTypePlural', { type: searchType }),
                  query: query.trim(),
                })
              "
            />
          </div>
        </template>
      </div>

      <!-- Initial Empty State (before any search) -->
      <div v-else class="etherscan-card p-8 text-center">
        <div class="bg-icon-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <svg class="text-mid h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h2 class="text-high mb-2 text-lg font-semibold">{{ $t("pages.advancedSearch.heroTitle") }}</h2>
        <p class="text-mid mx-auto max-w-md text-sm">{{ $t("pages.advancedSearch.heroDescription") }}</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import HashLink from "@/components/common/HashLink.vue";
import { searchService } from "@/services/searchService";
import { truncateHash, formatNumber } from "@/utils/explorerFormat";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const searchInput = ref(null);
const query = ref("");
const searchType = ref("all");
const searching = ref(false);
const searchError = ref(null);
const hasSearched = ref(false);
const validationError = ref(null);
const result = ref({ type: null, data: null });
let searchGeneration = 0;

const inputPlaceholder = computed(() => {
  const placeholders = {
    all: t("pages.advancedSearch.placeholderAll"),
    address: t("pages.advancedSearch.placeholderAddress"),
    transaction: t("pages.advancedSearch.placeholderTransaction"),
    block: t("pages.advancedSearch.placeholderBlock"),
    contract: t("pages.advancedSearch.placeholderContract"),
  };
  return placeholders[searchType.value] || placeholders.all;
});

const resultTypeLabel = computed(() => {
  const labels = {
    block: t("pages.advancedSearch.resultBlock"),
    transaction: t("pages.advancedSearch.resultTransaction"),
    address: t("pages.advancedSearch.resultAddress"),
    contract: t("pages.advancedSearch.resultContract"),
  };
  return labels[result.value.type] || t("pages.advancedSearch.resultUnknown");
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
    validationError.value = t("pages.advancedSearch.validateEmpty");
    return false;
  }
  if (q.length > 256) {
    validationError.value = t("pages.advancedSearch.validateTooLong");
    return false;
  }

  if (searchType.value === "address" && !/^N[A-Za-z0-9]{33}$/.test(q) && !(q.endsWith(".neo") && q.length > 4) && !(q.endsWith(".matrix") && q.length > 7)) {
    validationError.value = t("pages.advancedSearch.validateAddress");
    return false;
  }
  if (searchType.value === "transaction" && !/^(0x)?[a-fA-F0-9]{64}$/.test(q)) {
    validationError.value = t("pages.advancedSearch.validateTransaction");
    return false;
  }
  if (searchType.value === "block" && !/^(\d+|(0x)?[a-fA-F0-9]{64})$/.test(q)) {
    validationError.value = t("pages.advancedSearch.validateBlock");
    return false;
  }
  if (searchType.value === "contract" && !/^(0x)?[a-fA-F0-9]{40,64}$/.test(q)) {
    validationError.value = t("pages.advancedSearch.validateContract");
    return false;
  }

  validationError.value = null;
  return true;
}

async function performSearch() {
  if (!validate()) return;

  const myGeneration = ++searchGeneration;

  searching.value = true;
  searchError.value = null;
  hasSearched.value = true;

  try {
    const res = await searchService.search(query.value.trim());
    if (myGeneration !== searchGeneration) return;

    // The legacy lookup endpoints return null for many valid wallets
    // and tx hashes. If the query shape unambiguously matches one
    // entity type, route to its detail page directly — those pages
    // load through the indexer and render even when the legacy
    // search endpoint is empty.
    if ((!res || !res.type) && validate()) {
      const q = query.value.trim();
      if (/^N[A-Za-z0-9]{33}$/.test(q)) {
        router.push(`/account-profile/${q}`).catch(() => {});
        return;
      }
      if (/^(0x)?[a-fA-F0-9]{64}$/.test(q)) {
        const hash = q.startsWith("0x") ? q : `0x${q}`;
        router.push(`/transaction-info/${hash}`).catch(() => {});
        return;
      }
      if (/^(0x)?[a-fA-F0-9]{40}$/.test(q)) {
        const hash = q.startsWith("0x") ? q : `0x${q}`;
        router.push(`/contract-info/${hash}`).catch(() => {});
        return;
      }
      if (/^\d+$/.test(q)) {
        router.push(`/block-info/${q}`).catch(() => {});
        return;
      }
    }

    result.value = res || { type: null, data: null };
  } catch (e) {
    if (myGeneration !== searchGeneration) return;
    searchError.value = e.message || t("pages.advancedSearch.unexpectedError");
    result.value = { type: null, data: null };
  } finally {
    if (myGeneration === searchGeneration) searching.value = false;
  }
}

// created() equivalent - runs synchronously during setup
const q = route.query.q;
if (q) {
  query.value = q;
  performSearch();
}
</script>
