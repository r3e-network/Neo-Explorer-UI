<template>
  <div class="etherscan-card overflow-hidden">
    <!-- Loading -->
    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 5" :key="i" height="40px" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-6">
      <ErrorState title="Unable to load token holders" :message="error" @retry="() => loadPage(currentPage)" />
    </div>

    <template v-else>
      <!-- Info bar -->
      <div v-if="totalCount > 0" class="card-header">
        <p class="text-mid text-sm">
          A total of {{ formatNumber(totalCount) }} holders found
        </p>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px]">
          <thead class="table-head text-xs uppercase tracking-wide">
            <tr>
              <th class="table-header-cell">Rank</th>
              <th class="table-header-cell">Address</th>
              <th class="table-header-cell-right">Balance</th>
              <th class="table-header-cell-right">Percentage</th>
            </tr>
          </thead>
          <tbody class="soft-divider divide-y">
            <tr
              v-for="(item, index) in holders"
              :key="item.address"
              class="list-row transition-colors"
            >
              <!-- Rank -->
              <td class="text-low px-4 py-3 text-sm">
                <span v-if="rankIndex(index) <= 3" class="font-medium">
                  {{ rankIndex(index) }}
                  <span v-if="rankIndex(index) === 1">&#129351;</span>
                  <span v-else-if="rankIndex(index) === 2">&#129352;</span>
                  <span v-else>&#129353;</span>
                </span>
                <span v-else>{{ rankIndex(index) }}</span>
              </td>
              <!-- Address -->
              <td class="px-4 py-3">
                <div class="max-w-[220px] truncate">
                  <span v-if="item.address === NULL_ADDRESS" class="text-low text-sm"> Null Address </span>
                  <router-link v-else :to="'/account-profile/' + item.address" class="font-hash text-sm etherscan-link">
                    {{ showAddress ? scriptHashToAddress(item.address) : truncateHash(item.address) }}
                  </router-link>
                </div>
              </td>
              <!-- Balance -->
              <td class="text-high px-4 py-3 text-right text-sm">
                {{ formatBalance ? convertToken(item.balance, decimal) : item.balance }}
              </td>
              <!-- Percentage -->
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <div class="progress-track hidden h-1.5 w-16 overflow-hidden rounded-full sm:block">
                    <div
                      class="h-full rounded-full bg-primary-500"
                      :style="{ width: Math.min(item.percentage * 100, 100) + '%' }"
                    ></div>
                  </div>
                  <span class="text-high text-sm">
                    {{ toPercentage(item.percentage) }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="holders.length === 0" class="p-4">
        <EmptyState message="No holders found" />
      </div>
    </template>

    <!-- Pagination -->
    <div
      v-if="!loading && totalCount > resultsPerPage"
      class="soft-divider border-t px-4 py-3"
    >
      <EtherscanPagination
        :page="currentPage"
        :total-pages="totalPages"
        :page-size="resultsPerPage"
        :total="totalCount"
        :show-page-size="false"
        @update:page="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { tokenService } from "@/services";
import { truncateHash, formatNumber } from "@/utils/explorerFormat";
import { convertToken, scriptHashToAddress } from "@/utils/neoHelpers";
import { usePagination } from "@/composables/usePagination";
import { NULL_ADDRESS } from "@/constants";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const props = defineProps({
  contractHash: { type: String, required: true },
  decimal: { type: Number, default: 0 },
  formatBalance: { type: Boolean, default: true },
});

const showAddress = ref(true);

const {
  items: holders,
  loading,
  error,
  totalCount,
  currentPage,
  pageSize: resultsPerPage,
  totalPages,
  loadPage,
  goToPage: handlePageChange,
} = usePagination((limit, skip) => tokenService.getHolders(props.contractHash, limit, skip));

function rankIndex(index) {
  return index + (currentPage.value - 1) * resultsPerPage.value + 1;
}

function toPercentage(num) {
  return Number(num * 100).toFixed(2) + "%";
}

watch(
  () => props.contractHash,
  () => loadPage(1),
  { immediate: true }
);
</script>
