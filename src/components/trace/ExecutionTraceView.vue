<template>
  <div class="execution-trace-view">
    <!-- Loading state -->
    <div v-if="loading" class="space-y-4 py-6">
      <Skeleton width="40%" height="24px" />
      <Skeleton width="100%" height="120px" variant="rounded" />
      <Skeleton width="100%" height="80px" variant="rounded" />
    </div>

    <!-- Error state -->
    <ErrorState v-else-if="error" :title="'Failed to load execution trace'" :message="error" @retry="loadTrace" />

    <!-- Simple transaction -->
    <EmptyState
      v-else-if="appLog && !isComplex"
      icon="transaction"
      message="Simple transfer"
      description="No complex execution trace for this transaction."
    />

    <!-- Complex trace -->
    <div v-else-if="callTree.length > 0" class="space-y-6">
      <!-- Execution summary -->
      <div
        v-for="(exec, ei) in callTree"
        :key="ei"
        class="trace-execution rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
      >
        <!-- Execution header bar -->
        <div
          class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-3">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border"
              :class="vmStateClass(exec.vmState)"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="vmStateDot(exec.vmState)"></span>
              {{ exec.vmState }}
            </span>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              Trigger: <span class="font-medium">{{ exec.trigger }}</span>
            </span>
          </div>
          <span class="text-sm font-mono text-gray-500 dark:text-gray-400"> {{ exec.gasConsumed }} GAS </span>
        </div>

        <!-- Collapsible sections -->
        <div class="divide-y divide-gray-100 dark:divide-gray-700">
          <!-- Contract calls section -->
          <TraceSection title="Contract Calls" :count="exec.children.length" default-open>
            <div class="space-y-2">
              <div v-for="(node, ni) in exec.children" :key="ni" class="contract-group">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Contract</span>
                  <HashLink :hash="node.contract" type="contract" />
                </div>
                <div class="space-y-2 pl-4 border-l-2 border-primary-200 dark:border-primary-800">
                  <NotificationDecoder v-for="(evt, evi) in node.events" :key="evi" :notification="evt" />
                </div>
              </div>
            </div>
          </TraceSection>

          <!-- Stack section -->
          <TraceSection v-if="exec.stack && exec.stack.length > 0" title="Return Stack" :count="exec.stack.length">
            <StackViewer :stack="exec.stack" />
          </TraceSection>
        </div>
      </div>
    </div>

    <!-- No data -->
    <EmptyState
      v-else-if="!loading"
      icon="transaction"
      message="No execution data"
      description="Application log not available for this transaction."
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { executionService } from "@/services/executionService";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import HashLink from "@/components/common/HashLink.vue";
import NotificationDecoder from "./NotificationDecoder.vue";
import StackViewer from "./StackViewer.vue";
import TraceSection from "./TraceSection.vue";

const props = defineProps({
  txHash: {
    type: String,
    required: true,
  },
});

const loading = ref(false);
const error = ref(null);
const appLog = ref(null);
const isComplex = ref(false);
const callTree = ref([]);

function vmStateClass(state) {
  if (state === "HALT")
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
  if (state === "FAULT")
    return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600";
}

function vmStateDot(state) {
  if (state === "HALT") return "bg-emerald-500";
  if (state === "FAULT") return "bg-red-500";
  return "bg-gray-400";
}

async function loadTrace() {
  loading.value = true;
  error.value = null;

  try {
    const data = await executionService.getExecutionTrace(props.txHash);
    appLog.value = data;

    if (!data) {
      callTree.value = [];
      isComplex.value = false;
      return;
    }

    isComplex.value = executionService.isComplexTransaction(data);
    callTree.value = isComplex.value ? executionService.buildCallTree(data) : [];
  } catch (err) {
    error.value = err?.message ?? "Failed to fetch execution trace";
  } finally {
    loading.value = false;
  }
}

onMounted(loadTrace);
</script>
