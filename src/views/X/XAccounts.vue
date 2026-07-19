<template>
  <div class="x-accounts-page">
    <section class="page-container py-6 md:py-8">
      <!-- Page Hero -->
      <PageHero :particles="3" class="animate-page-enter">
        <Breadcrumb :items="breadcrumbs" />

        <div class="mb-6 flex items-center gap-3">
          <div class="page-header-icon bg-icon-green text-primary-600 dark:text-primary-300">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
              />
            </svg>
          </div>
          <div>
            <h1 class="page-title">{{ tf("pageTitles.xAccounts", "Neo X Top Accounts") }}</h1>
            <p class="page-subtitle">
              {{ tf("neoX.accountsSubtitle", "Accounts ranked by GAS balance on the Neo X EVM network") }}
            </p>
          </div>
        </div>
      </PageHero>

      <!-- Account List Card -->
      <div class="etherscan-card overflow-hidden animate-page-enter animate-page-enter-delay-1">
        <div class="card-header">
          <p class="text-mid text-sm">{{ tf("neoX.topAccountsHeader", "Top accounts by balance") }}</p>
        </div>

        <!-- Loading Skeleton -->
        <div v-if="loading" class="soft-divider divide-y">
          <div v-for="i in PAGE_SIZE" :key="i" class="flex items-center gap-4 px-4 py-3">
            <Skeleton width="32px" height="18px" />
            <Skeleton width="35%" height="18px" />
            <Skeleton width="120px" height="18px" />
            <Skeleton width="80px" height="18px" />
            <Skeleton width="60px" height="18px" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6">
          <ErrorState
            :title="tf('neoX.accountsErrorTitle', 'Unable to load accounts')"
            :message="tf('errors.loadFailed', 'Failed to load data.')"
            @retry="refresh"
          />
        </div>

        <!-- Empty State -->
        <EmptyState v-else-if="items.length === 0" :message="tf('neoX.noAccounts', 'No accounts')" icon="default" />

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[800px]">
            <thead class="table-head">
              <tr>
                <th scope="col" class="table-header-cell">#</th>
                <th scope="col" class="table-header-cell">{{ tf("neoX.address", "Address") }}</th>
                <th scope="col" class="table-header-cell-right">{{ tf("neoX.balance", "Balance") }}</th>
                <th scope="col" class="table-header-cell-right hidden md:table-cell">
                  {{ tf("neoX.txnCount", "Txn Count") }}
                </th>
                <th scope="col" class="table-header-cell hidden lg:table-cell">{{ tf("neoX.type", "Type") }}</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="(account, idx) in items" :key="account.hash" class="list-row group">
                <td class="table-cell-secondary">{{ idx + 1 }}</td>
                <td class="table-cell">
                  <span class="flex items-center gap-2">
                    <XHashLink type="address" :hash="account.hash" :name="account.name || ''" copyable />
                    <span
                      v-if="account.is_verified"
                      class="inline-flex items-center rounded bg-status-success-bg px-2 py-0.5 text-xs font-semibold text-status-success"
                    >{{ tf("neoX.verified", "Verified") }}</span>
                  </span>
                </td>
                <td class="table-cell-right font-medium">{{ formatGas(account.coin_balance) }} GAS</td>
                <td class="table-cell-secondary-right hidden md:table-cell">
                  {{ account.transactions_count ? formatInt(account.transactions_count) : "—" }}
                </td>
                <td class="table-cell hidden lg:table-cell">
                  <span class="badge-soft text-xs font-semibold">
                    {{ account.is_contract ? tf("neoX.contract", "Contract") : tf("neoX.eoa", "EOA") }}
                  </span>
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
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { getNeoxNet } from "@/utils/neoxEnv";
import { accountService } from "@/services/neox";
import { formatGas, formatInt } from "@/utils/neoxFormat";
import PageHero from "@/components/common/PageHero.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";
import XHashLink from "@/components/common/XHashLink.vue";

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const PAGE_SIZE = 20;

const breadcrumbs = computed(() => [
  { label: tf("breadcrumb.home", "Home"), to: "/homepage" },
  { label: tf("neoX.chainName", "Neo X"), to: "/x" },
  { label: tf("neoX.accounts", "Accounts") },
]);

const { items, loading, loadingMore, error, hasMore, loadMore, refresh } = useCursorList((cursor, ctx) =>
  accountService.getTopAccounts({ net: getNeoxNet(), cursor, signal: ctx.signal })
);
</script>
