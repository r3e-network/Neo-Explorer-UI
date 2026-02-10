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

    <!-- Call map section -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Contract Call Map</h2>
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div v-if="loading" class="space-y-3">
          <Skeleton width="60%" height="20px" />
          <Skeleton width="100%" height="100px" variant="rounded" />
        </div>
        <ContractCallMap v-else-if="callTree.length > 0" :call-tree="callTree" />
        <EmptyState v-else icon="transaction" message="No call map available" />
      </div>
    </section>

    <!-- Detailed trace section -->
    <section>
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Detailed Trace</h2>
      <ExecutionTraceView :tx-hash="txHash" />
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { executionService } from "@/services/executionService";
import HashLink from "@/components/common/HashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ExecutionTraceView from "@/components/trace/ExecutionTraceView.vue";
import ContractCallMap from "@/components/trace/ContractCallMap.vue";

const route = useRoute();
const txHash = route.params.txhash;

const loading = ref(false);
const callTree = ref([]);

async function loadCallMap() {
  loading.value = true;
  try {
    const data = await executionService.getExecutionTrace(txHash);
    if (data && executionService.isComplexTransaction(data)) {
      callTree.value = executionService.buildCallTree(data);
    }
  } catch {
    // ExecutionTraceView handles its own errors
  } finally {
    loading.value = false;
  }
}

onMounted(loadCallMap);
</script>
