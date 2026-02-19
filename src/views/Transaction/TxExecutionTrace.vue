<template>
  <div class="tx-execution-trace">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb
        :items="[
          { label: 'Home', to: '/homepage' },
          { label: 'Transactions', to: '/transactions/1' },
          { label: 'Transaction', to: `/transaction-info/${txHash}` },
          { label: 'Execution Trace' },
        ]"
      />

      <!-- Page header -->
      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">Execution Trace</h1>
          <div class="flex items-center gap-2">
            <span class="page-subtitle">Transaction:</span>
            <HashLink :hash="txHash" type="tx" :truncated="false" />
          </div>
        </div>
      </div>

      <!-- State Change Summary -->
      <section class="mb-6">
        <StateChangeSummary :enriched-trace="enrichedData" :loading="loading" />
      </section>

      <!-- Call map section -->
      <section class="mb-6">
        <h2 class="mb-3 text-base font-semibold text-text-primary dark:text-gray-200">Contract Call Map</h2>
        <div class="etherscan-card p-4">
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
      <section class="mb-6">
        <h2 class="mb-3 text-base font-semibold text-text-primary dark:text-gray-200">Gas Usage Breakdown</h2>
        <div class="etherscan-card p-4">
          <GasBreakdown :executions="enrichedData?.executions ?? []" :total-gas="totalGas" :loading="loading" />
        </div>
      </section>

      <!-- Token transfer flow section -->
      <section v-if="transfers.length > 0" class="mb-6">
        <h2 class="mb-3 text-base font-semibold text-text-primary dark:text-gray-200">Token Transfer Flow</h2>
        <div class="etherscan-card p-4">
          <TokenTransferFlow :transfers="transfers" :loading="loading" />
        </div>
      </section>

      <!-- Detailed trace section -->
      <section>
        <h2 class="mb-3 text-base font-semibold text-text-primary dark:text-gray-200">Detailed Trace</h2>
        <ExecutionTraceView :tx-hash="txHash" :enriched-data="enrichedData" :preloaded="!!enrichedData" />
      </section>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { executionService } from "@/services";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
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
const { t } = useI18n();
const loading = ref(false);
const error = ref(null);
const enrichedData = ref(null);
let fetchGeneration = 0;

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
  const myGeneration = ++fetchGeneration;
  loading.value = true;
  error.value = null;
  enrichedData.value = null;
  try {
    const result = await executionService.getEnrichedTrace(h);
    if (myGeneration !== fetchGeneration) return;
    enrichedData.value = result;
  } catch (err) {
    if (myGeneration !== fetchGeneration) return;
    if (import.meta.env.DEV) console.error("Failed to load trace:", err);
    error.value = t("errors.loadExecutionTrace");
  } finally {
    if (myGeneration === fetchGeneration) loading.value = false;
  }
}

watch(
  () => route.params.txhash,
  (hash) => {
    if (hash) loadTrace(hash);
  },
  { immediate: true }
);
</script>
