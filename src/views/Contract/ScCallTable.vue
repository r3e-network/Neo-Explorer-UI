<template>
  <div class="etherscan-card overflow-hidden">
    <!-- Loading -->
    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 5" :key="i" height="40px" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-6">
      <ErrorState title="Unable to load contract calls" :message="error" @retry="() => loadPage(currentPage)" />
    </div>

    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px]">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="table-header-cell">Txn Hash</th>
              <th class="table-header-cell">
                Sender
                <button class="btn-mini ml-1" aria-label="Toggle sender address format" @click="toggleAddressFormat">
                  {{ showAddress ? "Hash" : "Addr" }}
                </button>
              </th>
              <th class="table-header-cell">Method</th>
              <th class="table-header-cell">Call Flags</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
            <tr
              v-for="item in items"
              :key="item.txid + item.method"
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
                <div class="max-w-[200px] truncate">
                  <span v-if="!item.originSender" class="text-sm text-text-muted">Null Address</span>
                  <router-link
                    v-else
                    :to="`/account-profile/${item.originSender}`"
                    class="font-hash text-sm etherscan-link"
                  >
                    {{ formatSender(item.originSender) }}
                  </router-link>
                </div>
              </td>
              <td class="table-cell">
                <span
                  class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700"
                >
                  {{ item.method }}
                </span>
              </td>
              <td class="table-cell">
                {{ item.callFlags }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="items.length === 0" class="p-4">
        <EmptyState message="No contract calls found" />
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
import { scriptHashToAddress } from "@/utils/neoHelpers";
import { usePagination } from "@/composables/usePagination";
import { NULL_TX_HASH } from "@/constants";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const props = defineProps({
  contractHash: { type: String, required: true },
});

const showAddress = ref(true);

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
} = usePagination((limit, skip) => contractService.getScCalls(props.contractHash, limit, skip));

function isNullTx(txid) {
  return txid === NULL_TX_HASH;
}

function toggleAddressFormat() {
  showAddress.value = !showAddress.value;
}

function formatSender(sender) {
  if (!sender) return "";
  return showAddress.value ? scriptHashToAddress(sender) : sender;
}

watch(
  () => props.contractHash,
  () => loadPage(1),
  { immediate: true }
);
</script>
