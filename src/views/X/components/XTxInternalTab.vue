<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="soft-divider divide-y">
      <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-4 py-3">
        <Skeleton width="70px" height="18px" />
        <Skeleton width="30%" height="18px" />
        <Skeleton width="30%" height="18px" />
        <Skeleton width="80px" height="18px" />
      </div>
    </div>

    <!-- Error -->
    <ErrorState
      v-else-if="error"
      :title="tf('neoX.internalTxns', 'Internal Txns')"
      :message="tf('errors.loadFailed', 'Failed to load data.')"
      @retry="refresh"
    />

    <!-- Empty -->
    <EmptyState v-else-if="rows.length === 0" :message="tf('neoX.noInternalTxns', 'No internal transactions')" icon="tx" />

    <!-- Table -->
    <div v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px]">
          <thead class="table-head">
            <tr>
              <th scope="col" class="table-header-cell">{{ tf("neoX.type", "Type") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.from", "From") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.to", "To") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.valueGas", "Value (GAS)") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.gasLimit", "Gas Limit") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.status", "Status") }}</th>
            </tr>
          </thead>
          <tbody class="soft-divider divide-y">
            <tr v-for="(itx, i) in rows" :key="`${itx.index}-${i}`" class="list-row group">
              <td class="table-cell">
                <span class="badge-soft">{{ itx.type || "—" }}</span>
              </td>
              <td class="table-cell">
                <XHashLink v-if="itx.from?.hash" type="address" :hash="itx.from.hash" :name="itx.from.name || ''" />
                <span v-else class="text-mid">—</span>
              </td>
              <td class="table-cell">
                <XHashLink v-if="itx.to?.hash" type="address" :hash="itx.to.hash" :name="itx.to.name || ''" />
                <XHashLink
                  v-else-if="itx.createdContract?.hash"
                  type="address"
                  :hash="itx.createdContract.hash"
                  :name="itx.createdContract.name || tf('neoX.contractCreation', 'Contract creation')"
                />
                <span v-else class="text-mid">—</span>
              </td>
              <td class="table-cell whitespace-nowrap">{{ formatGas(itx.value) }}</td>
              <td class="table-cell-secondary whitespace-nowrap">{{ formatInt(itx.gasLimit) }}</td>
              <td class="table-cell">
                <span
                  class="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  :class="itx.success ? 'bg-status-success-bg text-status-success' : 'bg-status-error-bg text-status-error'"
                  :title="itx.error || ''"
                >{{ itx.success ? tf("status.success", "Success") : tf("status.failed", "Failed") }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="hasMore" class="soft-divider border-t px-4 py-3 text-center">
        <button type="button" class="btn-outline px-4 py-2 text-xs" :disabled="loadingMore" @click="loadMore">
          <svg
            v-if="loadingMore"
            class="mr-1.5 h-3.5 w-3.5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {{ tf("neoX.loadMore", "Load More") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { transactionService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import XHashLink from "@/components/common/XHashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { formatGas, formatInt } from "@/utils/neoxFormat";

const props = defineProps({
  hash: { type: String, required: true },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const {
  items: rows,
  loading,
  loadingMore,
  error,
  hasMore,
  loadMore,
  refresh,
} = useCursorList((cursor, { signal }) =>
  transactionService.getInternalTransactions(props.hash, { net: getNeoxNet(), cursor, signal }),
);
</script>
