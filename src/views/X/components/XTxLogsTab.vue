<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="etherscan-card p-4">
        <div class="flex items-center gap-3">
          <Skeleton width="48px" height="18px" />
          <Skeleton width="40%" height="18px" />
        </div>
        <Skeleton width="90%" height="14px" class="mt-3" />
        <Skeleton width="70%" height="14px" class="mt-2" />
      </div>
    </div>

    <!-- Error -->
    <ErrorState
      v-else-if="error"
      :title="tf('neoX.logs', 'Logs')"
      :message="tf('errors.loadFailed', 'Failed to load data.')"
      @retry="refresh"
    />

    <!-- Empty -->
    <EmptyState v-else-if="logs.length === 0" :message="tf('neoX.noLogs', 'No logs')" icon="contract" />

    <!-- Log cards -->
    <div v-else>
      <div v-for="log in logs" :key="log.index" class="etherscan-card mb-3 p-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="badge-soft">#{{ log.index }}</span>
          <XHashLink
            v-if="log.address?.hash"
            type="address"
            :hash="log.address.hash"
            :name="log.address.name || ''"
            copyable
          />
          <span
            v-if="log.address?.isVerified"
            class="inline-flex items-center rounded bg-status-success-bg px-2 py-0.5 text-xs font-semibold text-status-success"
          >{{ tf("neoX.verified", "Verified") }}</span>
        </div>

        <div v-if="log.decoded" class="mt-3">
          <XDecodedInput :decoded="log.decoded" />
        </div>

        <CollapsibleSection class="mt-3" :title="tf('neoX.rawTopicsData', 'Raw topics & data')">
          <div class="p-4">
            <ul class="space-y-1.5">
              <li v-for="(topic, i) in log.topics" :key="i" class="font-hash text-xs break-all">
                <span class="text-low">[{{ i }}]</span> {{ topic }}
              </li>
            </ul>
            <div v-if="log.data" class="mt-3">
              <p class="text-[10px] uppercase text-low">{{ tf("neoX.data", "Data") }}</p>
              <div class="panel-muted mt-1 block rounded px-3 py-2 font-hash text-xs break-all">{{ log.data }}</div>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      <div v-if="hasMore" class="pt-1 text-center">
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
import { watch } from "vue";
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { transactionService } from "@/services/neox";
import { toXLog } from "@/adapters/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import XHashLink from "@/components/common/XHashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import CollapsibleSection from "@/components/common/CollapsibleSection.vue";
import XDecodedInput from "./XDecodedInput.vue";

const props = defineProps({
  hash: { type: String, required: true },
});

const emit = defineEmits(["count"]);

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const {
  items: logs,
  loading,
  loadingMore,
  error,
  hasMore,
  loadMore,
  refresh,
} = useCursorList(async (cursor, { signal }) => {
  const page = await transactionService.getLogs(props.hash, { net: getNeoxNet(), cursor, signal });
  return { items: page.items.map(toXLog).filter(Boolean), nextPageParams: page.nextPageParams };
});

watch(logs, () => emit("count", logs.value.length));
</script>
