<template>
  <div>
    <!-- In / Out / All direction filter -->
    <div class="mb-3 flex items-center gap-1">
      <button
        v-for="option in filterOptions"
        :key="option.key"
        type="button"
        class="tab-btn px-2.5 py-1 text-xs"
        :class="filter === option.key ? 'tab-btn-active' : 'tab-btn-inactive'"
        :aria-pressed="filter === option.key ? 'true' : 'false'"
        @click="setFilter(option.key)"
      >
        {{ option.label }}
      </button>
    </div>

    <div v-if="loading" class="soft-divider divide-y">
      <div v-for="i in 8" :key="i" class="flex items-center gap-4 px-4 py-3">
        <Skeleton width="60px" height="18px" />
        <Skeleton width="40%" height="18px" />
        <Skeleton width="20%" height="18px" />
      </div>
    </div>

    <ErrorState
      v-else-if="error"
      :title="tf('errors.loadFailed', 'Failed to load data.')"
      :message="tf('neoX.loadTransactionsError', 'Unable to load transactions.')"
      @retry="refresh"
    />

    <template v-else>
      <XTxTable :transactions="items" :empty="tf('neoX.noTransactions', 'No transactions')" />
      <div v-if="items.length" class="soft-divider border-t px-4 py-3">
        <InfiniteScroll :loading="loadingMore" :has-more="hasMore" @load-more="loadMore" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { accountService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import XTxTable from "./XTxTable.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";

const props = defineProps({
  address: { type: String, required: true },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const filter = ref("all");
const filterOptions = [
  { key: "all", label: tf("neoX.filterAll", "All") },
  // Blockscout semantics: filter=to → received (In), filter=from → sent (Out).
  { key: "to", label: tf("neoX.filterIn", "In") },
  { key: "from", label: tf("neoX.filterOut", "Out") },
];

// The service spreads `opts.cursor` verbatim into the query string, so the
// direction filter rides alongside the Blockscout cursor params.
const withFilter = (cursor) => {
  if (filter.value === "all") return cursor;
  return { ...(cursor || {}), filter: filter.value };
};

const { items, loading, loadingMore, error, hasMore, loadMore, refresh } = useCursorList((cursor, ctx) =>
  accountService.getTransactions(props.address, { net: getNeoxNet(), cursor: withFilter(cursor), signal: ctx.signal })
);

function setFilter(key) {
  if (filter.value === key) return;
  filter.value = key;
}

watch(filter, () => refresh());
</script>
