<template>
  <div class="candidates-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <header class="mb-5 flex flex-col gap-1">
        <h1 class="page-title">Candidates</h1>
        <p class="page-subtitle">Neo consensus candidate ranking</p>
      </header>

      <div class="etherscan-card overflow-hidden">
        <div
          class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <p class="text-sm text-text-secondary dark:text-gray-300">Candidate list</p>
          <p class="text-sm text-text-muted dark:text-gray-400">Page {{ page }} / {{ totalPages }}</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">#</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Address</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">Votes</th>
                <th class="px-4 py-3 text-center font-medium text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="(candidate, index) in candidates"
                :key="candidate.candidate"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="px-4 py-3 text-sm text-text-muted">
                  {{ (page - 1) * pageSize + index + 1 }}
                </td>
                <td class="px-4 py-3">
                  <router-link :to="`/account-profile/${candidate.candidate}`" class="font-hash text-sm etherscan-link">
                    {{ truncateHash(candidate.candidate, 10, 6) }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                  {{ formatVotes(candidate.votes) }}
                </td>
                <td class="px-4 py-3 text-center">
                  <StatusBadge :status="candidateStatus(candidate.state)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in 10" :key="index" height="44px" />
        </div>

        <div v-else-if="error" class="p-4">
          <ErrorState title="Failed to load candidates" :message="error" @retry="load" />
        </div>

        <div v-else-if="!candidates.length" class="p-4">
          <EmptyState title="No candidates found" />
        </div>

        <div class="border-t border-card-border px-4 py-3 dark:border-card-border-dark">
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

<script>
import { candidateService } from "@/services";
import { createPaginationMixin } from "@/composables/usePagination";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import StatusBadge from "@/components/common/StatusBadge.vue";
import { truncateHash } from "@/utils/explorerFormat";

export default {
  name: "CandidatesPage",
  mixins: [createPaginationMixin("/candidates")],
  components: {
    EmptyState,
    ErrorState,
    Skeleton,
    EtherscanPagination,
    StatusBadge,
  },
  data: () => ({
    loading: true,
    error: null,
    candidates: [],
  }),
  methods: {
    async loadPage() {
      this.loading = true;
      this.error = null;
      try {
        const res = await candidateService.getList(this.pageSize, this.paginationOffset);
        this.candidates = this.applyPage(res?.totalCount || (res?.result || []).length, res?.result || []);
      } catch {
        this.error = "Failed to load candidates. Please try again.";
      } finally {
        this.loading = false;
      }
    },
    truncateHash,
    formatVotes(value) {
      return Number(value || 0).toLocaleString();
    },
    candidateStatus(state) {
      return state === "Consensus" ? "success" : "pending";
    },
  },
};
</script>
