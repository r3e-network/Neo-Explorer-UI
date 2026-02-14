<template>
  <div class="etherscan-card overflow-hidden">
    <!-- Loading -->
    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 5" :key="i" height="40px" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-6">
      <ErrorState title="Unable to load events" :message="error" @retry="() => loadPage(currentPage)" />
    </div>

    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[750px]">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="table-header-cell">Txn Hash</th>
              <th class="table-header-cell">Event Name</th>
              <th class="table-header-cell">VM State</th>
              <th class="table-header-cell">Index</th>
              <th class="table-header-cell">
                Time
                <button class="btn-mini ml-1" aria-label="Toggle time format" @click="toggleTimeFormat">Format</button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
            <tr
              v-for="item in items"
              :key="item.txid + item.eventname"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
            >
              <td class="table-cell">
                <div class="max-w-[200px] truncate">
                  <span v-if="isNullTx(item.txid)" class="text-sm text-text-muted"> Null Transaction </span>
                  <router-link v-else :to="`/transaction-info/${item.txid}`" class="font-hash text-sm etherscan-link">
                    {{ item.txid }}
                  </router-link>
                </div>
              </td>
              <td class="table-cell">
                <span
                  class="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 font-mono text-xs text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                >
                  {{ item.eventname }}
                </span>
              </td>
              <td class="table-cell">
                <span
                  class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
                  :class="vmStateClass(item.Vmstate)"
                >
                  {{ item.Vmstate }}
                </span>
              </td>
              <td class="table-cell">
                {{ item.index }}
              </td>
              <td class="table-cell">
                {{ formatTimestamp(item.timestamp) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="items.length === 0" class="p-4">
        <EmptyState message="No events found" />
      </div>
    </template>

    <div v-if="!loading && totalCount > pageSize" class="card-header border-t border-b-0">
      <EtherscanPagination
        :page="currentPage"
        :total-pages="totalPages"
        :page-size="pageSize"
        :total="totalCount"
        :show-page-size="false"
        @update:page="goToPage"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { contractService } from "@/services";
import { convertTime, convertISOTime } from "@/store/util";
import { usePagination } from "@/composables/usePagination";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { vmStateClass } from "@/utils/explorerFormat";
import { NULL_TX_HASH } from "@/constants";

const props = defineProps({
  contractHash: { type: String, required: true },
});

const useRelativeTime = ref(true);

const {
  items,
  loading,
  error,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  loadPage,
  goToPage,
} = usePagination((limit, skip) => contractService.getNotifications(props.contractHash, limit, skip));

function isNullTx(txid) {
  return txid === NULL_TX_HASH;
}

function toggleTimeFormat() {
  useRelativeTime.value = !useRelativeTime.value;
}

function formatTimestamp(ts) {
  return useRelativeTime.value ? convertTime(ts) : convertISOTime(ts);
}

watch(
  () => props.contractHash,
  () => loadPage(1),
  { immediate: true }
);
</script>
