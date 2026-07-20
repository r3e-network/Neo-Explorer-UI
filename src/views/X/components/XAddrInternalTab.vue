<template>
  <div>
    <div v-if="loading" class="soft-divider divide-y">
      <div v-for="i in 8" :key="i" class="flex items-center gap-4 px-4 py-3">
        <Skeleton width="80px" height="18px" />
        <Skeleton width="40%" height="18px" />
        <Skeleton width="20%" height="18px" />
      </div>
    </div>

    <ErrorState
      v-else-if="error"
      :title="tf('errors.loadFailed', 'Failed to load data.')"
      :message="tf('neoX.loadInternalError', 'Unable to load internal transactions.')"
      @retry="refresh"
    />

    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[800px]">
          <thead class="table-head">
            <tr>
              <th scope="col" class="table-header-cell">{{ tf("neoX.type", "Type") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.from", "From") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.to", "To") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.valueGas", "Value (GAS)") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.status", "Status") }}</th>
            </tr>
          </thead>
          <tbody v-if="items.length" class="soft-divider divide-y">
            <tr v-for="(itx, i) in items" :key="`${itx.transactionHash || ''}-${itx.index}-${i}`" class="list-row group">
              <td class="table-cell">
                <span class="badge-soft">{{ itx.type || "—" }}</span>
              </td>
              <td class="table-cell">
                <XHashLink
                  v-if="itx.from?.hash"
                  type="address"
                  :hash="itx.from.hash"
                  :name="itx.from.name || ''"
                />
                <span v-else class="text-mid">—</span>
              </td>
              <td class="table-cell">
                <XHashLink
                  v-if="itx.to?.hash"
                  type="address"
                  :hash="itx.to.hash"
                  :name="itx.to.name || ''"
                />
                <XHashLink
                  v-else-if="itx.createdContract?.hash"
                  type="address"
                  :hash="itx.createdContract.hash"
                  :name="itx.createdContract.name || tf('neoX.contractCreation', 'Contract creation')"
                />
                <span v-else class="text-mid">—</span>
              </td>
              <td class="table-cell whitespace-nowrap">{{ formatGas(itx.value) }}</td>
              <td class="table-cell">
                <span
                  class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                  :class="itx.success ? 'bg-status-success-bg text-status-success' : 'bg-status-error-bg text-status-error'"
                >
                  {{ itx.success ? tf("status.success", "Success") : itx.error || tf("status.failed", "Failed") }}
                </span>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="5" class="p-0">
                <EmptyState :message="tf('neoX.noInternalTxns', 'No internal transactions')" icon="tx" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="items.length" class="soft-divider border-t px-4 py-3">
        <InfiniteScroll :auto="false" :loading="loadingMore" :has-more="hasMore" @load-more="loadMore" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { accountService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import { formatGas } from "@/utils/neoxFormat";
import XHashLink from "@/components/common/XHashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";

const props = defineProps({
  address: { type: String, required: true },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

// Address internal txns, like address logs, repeat the same per-tx `index`
// across transactions — synthesize a composite `hash` so useCursorList's
// dedupe never collapses rows from different parent transactions.
const { items, loading, loadingMore, error, hasMore, loadMore, refresh } = useCursorList(async (cursor, ctx) => {
  const page = await accountService.getInternalTransactions(props.address, {
    net: getNeoxNet(),
    cursor,
    signal: ctx.signal,
  });
  const rows = (Array.isArray(page.items) ? page.items : []).map((itx) => ({
    ...itx,
    hash: `${itx.transactionHash || "?"}:${itx.index}`,
  }));
  return { items: rows, nextPageParams: page.nextPageParams };
});
</script>
