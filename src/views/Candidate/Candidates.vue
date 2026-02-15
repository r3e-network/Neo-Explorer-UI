<template>
  <div class="candidates-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Candidates' }]" />

      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">Consensus Candidates</h1>
          <p class="page-subtitle">Neo N3 consensus node candidates and voting</p>
        </div>
      </div>

      <div class="etherscan-card overflow-hidden">
        <div class="card-header">
          <p class="text-sm text-text-secondary dark:text-gray-300">Candidate list</p>
          <p class="text-sm text-text-muted dark:text-gray-400">Page {{ currentPage }} / {{ totalPages }}</p>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in pageSize" :key="index" height="44px" />
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="p-4">
          <ErrorState title="Failed to load candidates" :message="error" @retry="() => loadPage(currentPage)" />
        </div>

        <!-- Empty state -->
        <div v-else-if="candidates.length === 0" class="p-4">
          <EmptyState message="No candidates found" />
        </div>

        <!-- Data table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[760px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="table-header-cell">#</th>
                <th class="table-header-cell">Address</th>
                <th class="table-header-cell-right">Votes</th>
                <th class="table-header-cell text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="(candidate, index) in candidates"
                :key="candidate.candidate"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="table-cell-secondary">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="table-cell">
                  <router-link :to="`/account-profile/${candidate.candidate}`" class="font-hash text-sm etherscan-link">
                    {{ truncateHash(candidate.candidate, 10, 6) }}
                  </router-link>
                </td>
                <td class="table-cell text-right">
                  {{ formatVotes(candidate.votes) }}
                </td>
                <td class="table-cell text-center">
                  <StatusBadge :status="candidateStatus(candidate.state)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="!loading && candidates.length > 0"
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
import { useI18n } from "vue-i18n";
import { candidateService } from "@/services";
import { getCacheKey } from "@/services/cache";
import { truncateHash } from "@/utils/explorerFormat";
import { usePagination } from "@/composables/usePagination";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import StatusBadge from "@/components/common/StatusBadge.vue";

const { t } = useI18n();

const {
  items: candidates,
  loading,
  error,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  loadPage,
  goToPage,
  changePageSize,
} = usePagination((limit, skip) => candidateService.getList(limit, skip), {
  routeSync: { basePath: "/candidates" },
  cacheKeyFn: (limit, skip) => getCacheKey("candidate_list", { limit, skip }),
  errorMessage: t("errors.loadCandidates"),
});

function formatVotes(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString() : "0";
}

function candidateStatus(state) {
  return state === "Consensus" ? "success" : "pending";
}
</script>
