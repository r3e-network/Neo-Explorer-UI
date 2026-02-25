<template>
  <div>
    <!-- Full trace link for complex txns -->
    <div v-if="isComplexTx" class="mb-4">
      <router-link
        :to="`/tx/${txHash}/trace`"
        class="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
        Open Fullscreen Execution Trace
      </router-link>
    </div>
    
    <ExecutionTraceView 
      :tx-hash="txHash" 
      :enriched-data="enrichedTrace" 
      :preloaded="!!enrichedTrace" 
    />
  </div>
</template>

<script setup>
import ExecutionTraceView from "@/components/trace/ExecutionTraceView.vue";

const props = defineProps({
  appLog: { type: Object, default: null },
  appLogLoading: { type: Boolean, default: false },
  callTree: { type: Array, default: () => [] },
  enrichedTrace: { type: Object, default: null },
  isComplexTx: { type: Boolean, default: false },
  txHash: { type: String, default: "" },
});
</script>
