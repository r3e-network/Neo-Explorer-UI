<template>
  <div class="candidates-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Candidates' }]" />

      <div class="mb-6 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300"
        >
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
          <h1 class="text-2xl font-bold text-text-primary dark:text-gray-100">Consensus Candidates</h1>
          <p class="text-sm text-text-secondary dark:text-gray-400">Neo N3 consensus node candidates and voting</p>
        </div>
      </div>

      <div class="etherscan-card overflow-hidden">
        <div
          class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <p class="text-sm text-text-secondary dark:text-gray-300">Candidate list</p>
          <p class="text-sm text-text-muted dark:text-gray-400">Page {{ currentPage }} / {{ totalPages }}</p>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in pageSize" :key="index" height="44px" />
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="p-4">
          <ErrorState title="Failed to load candidates" :message="error" @retry="loadPage" />
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
                  {{ (currentPage - 1) * pageSize + index + 1 }}
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

        <div
          v-if="!loading && candidates.length > 0"
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
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { candidateService } from "@/services";
import { truncateHash } from "@/utils/explorerFormat";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import StatusBadge from "@/components/common/StatusBadge.vue";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref(null);
const candidates = ref([]);
const currentPage = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
let currentRequestId = 0;
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const paginationOffset = computed(() => (currentPage.value - 1) * pageSize.value);

async function loadPage() {
  const myRequestId = ++currentRequestId;
  loading.value = true;
  error.value = null;
  try {
    const res = await candidateService.getList(pageSize.value, paginationOffset.value);
    if (myRequestId !== currentRequestId) return;
    const count = res?.totalCount || (res?.result || []).length;
    total.value = count || 0;
    candidates.value = res?.result || [];
  } catch (err) {
    if (myRequestId !== currentRequestId) return;
    if (process.env.NODE_ENV !== "production") console.error("Failed to load candidates:", err);
    error.value = "Failed to load candidates. Please try again.";
    candidates.value = [];
  } finally {
    if (myRequestId === currentRequestId) {
      loading.value = false;
    }
  }
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    router.push(`/candidates/${page}`);
  }
}

function changePageSize(size) {
  pageSize.value = size;
  router.push("/candidates/1");
}

function formatVotes(value) {
  return Number(value || 0).toLocaleString();
}

function candidateStatus(state) {
  return state === "Consensus" ? "success" : "pending";
}

watch(
  () => route.params.page,
  (page) => {
    const parsed = parseInt(page) || 1;
    currentPage.value = Math.max(1, parsed);
    loadPage();
  },
  { immediate: true }
);
</script>
