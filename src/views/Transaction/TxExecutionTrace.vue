<template>
  <div class="tx-execution-trace max-w-6xl mx-auto px-4 py-6">
    <!-- Breadcrumb / back link -->
    <div class="mb-6">
      <router-link
        :to="`/transaction-info/${txHash}`"
        class="inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Transaction
      </router-link>
    </div>

    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Execution Trace</h1>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500 dark:text-gray-400">Transaction:</span>
        <HashLink :hash="txHash" type="tx" :truncate="false" />
      </div>
    </div>

    <!-- State Change Summary -->
    <section class="mb-6">
      <StateChangeSummary :enriched-trace="enrichedData" :loading="loading" />
    </section>

    <!-- Call map section -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Contract Call Map</h2>
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div v-if="loading" class="space-y-3">
          <Skeleton width="60%" height="20px" />
          <Skeleton width="100%" height="100px" variant="rounded" />
        </div>
        <ErrorState
          v-else-if="error"
          title="Unable to load execution trace"
          :message="error"
          @retry="loadTrace(txHash)"
        />
        <ContractCallMap
          v-else-if="callTree.length > 0"
          :call-tree="callTree"
          :contract-metadata="enrichedData?.contractMetadata"
        />
        <EmptyState v-else icon="tx" message="No call map available" />
      </div>
    </section>

    <!-- Gas Breakdown -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Gas Usage Breakdown</h2>
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <GasBreakdown :executions="enrichedData?.executions ?? []" :total-gas="totalGas" :loading="loading" />
      </div>
    </section>

    <!-- Token transfer flow section -->
    <section v-if="transfers.length > 0" class="mb-8">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Token Transfer Flow</h2>
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <TokenTransferFlow :transfers="transfers" :loading="loading" />
      </div>
    </section>

    <!-- Detailed trace section -->
    <section>
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Detailed Trace</h2>
      <ExecutionTraceView :tx-hash="txHash" :enriched-data="enrichedData" :preloaded="!!enrichedData" />
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { executionService } from "@/services";
import HashLink from "@/components/common/HashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import ContractCallMap from "@/components/trace/ContractCallMap.vue";
import TokenTransferFlow from "@/components/trace/TokenTransferFlow.vue";
import ExecutionTraceView from "@/components/trace/ExecutionTraceView.vue";
import StateChangeSummary from "@/components/trace/StateChangeSummary.vue";
import GasBreakdown from "@/components/trace/GasBreakdown.vue";

const route = useRoute();

const loading = ref(false);
const error = ref(null);
const enrichedData = ref(null);
const abortController = ref(null);

const txHash = computed(() => route.params.txhash || "");

const callTree = computed(() => {
  if (!enrichedData.value?.executions) return [];
  return enrichedData.value.executions.map((e) => ({
    vmState: e.vmState,
    trigger: e.trigger,
    gasConsumed: e.gasConsumed,
    children: e.byContract,
  }));
});

const transfers = computed(() => enrichedData.value?.transfers ?? []);

const totalGas = computed(() => {
  if (!enrichedData.value?.executions) return "0";
  return enrichedData.value.executions.reduce((sum, e) => sum + Number(e.gasConsumed || 0), 0).toString();
});

async function loadTrace(hash) {
  const h = hash || txHash.value;
  if (!h) return;
  abortController.value?.abort();
  abortController.value = new AbortController();
  loading.value = true;
  error.value = null;
  enrichedData.value = null;
  try {
    enrichedData.value = await executionService.getEnrichedTrace(h);
  } catch (err) {
    if (abortController.value?.signal.aborted) return;
    if (process.env.NODE_ENV !== "production") console.error("Failed to load trace:", err);
    error.value = "Failed to load execution trace.";
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.params.txhash,
  (hash) => {
    if (hash) loadTrace(hash);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  abortController.value?.abort();
});
</script>
