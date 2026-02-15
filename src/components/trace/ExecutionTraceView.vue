<template>
  <div class="execution-trace-view">
    <!-- Loading state -->
    <div v-if="loading" aria-live="polite" class="space-y-4 py-6">
      <Skeleton width="40%" height="24px" />
      <Skeleton width="100%" height="120px" variant="rounded" />
      <Skeleton width="100%" height="80px" variant="rounded" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" aria-live="assertive">
      <ErrorState :title="'Failed to load execution trace'" :message="error" @retry="loadTrace" />
    </div>

    <!-- Simple transaction -->
    <EmptyState
      v-else-if="appLog && !isComplex"
      icon="tx"
      message="Simple transfer — no complex execution trace for this transaction."
    />

    <!-- Complex trace -->
    <div v-else-if="callTree.length > 0" class="space-y-6">
      <!-- State Change Summary -->
      <StateChangeSummary :enriched-trace="enrichedTrace" :loading="enrichedLoading" />

      <!-- Gas Breakdown -->
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <GasBreakdown :executions="enrichedTrace?.executions ?? []" :total-gas="totalGas" :loading="enrichedLoading" />
      </div>

      <div
        v-for="(exec, ei) in callTree"
        :key="exec.trigger + '-' + exec.vmState + '-' + ei"
        class="trace-execution rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
      >
        <!-- Collapsible execution header -->
        <button
          :aria-label="`Toggle execution ${ei + 1}: ${exec.trigger} (${exec.vmState})`"
          class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors cursor-pointer"
          :aria-expanded="!!expandedExecs[ei]"
          @click="toggleExec(ei)"
        >
          <div class="flex items-center gap-3">
            <svg
              class="w-4 h-4 text-gray-400 transition-transform flex-shrink-0"
              :class="{ 'rotate-90': expandedExecs[ei] }"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clip-rule="evenodd"
              />
            </svg>
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
          <span class="text-sm font-mono text-gray-500 dark:text-gray-400">
            {{ formatGasDecimal(exec.gasConsumed) }} GAS
          </span>
        </button>

        <!-- FAULT banner -->
        <div
          v-if="exec.vmState !== 'HALT'"
          class="flex flex-col gap-1 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800"
        >
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-sm font-medium text-red-700 dark:text-red-300">
              Execution {{ exec.vmState }} — operations may be incomplete or reverted
            </span>
          </div>
          <p v-if="execExceptions[ei]" class="text-xs font-mono text-red-600 dark:text-red-400 mt-1 break-all">
            {{ execExceptions[ei] }}
          </p>
        </div>

        <!-- Collapsible body -->
        <div v-if="expandedExecs[ei]" class="divide-y divide-gray-100 dark:divide-gray-700">
          <!-- Contract calls section -->
          <TraceSection title="Contract Calls" :count="(exec.children ?? []).length" default-open>
            <div class="space-y-2">
              <div v-for="(node, ni) in exec.children ?? []" :key="ni" class="contract-group">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Contract</span>
                  <HashLink :hash="node.contract" type="contract" />
                </div>
                <div class="space-y-2 pl-4 border-l-2 border-primary-200 dark:border-primary-800">
                  <NotificationDecoder
                    v-for="(evt, evi) in node.events"
                    :key="evi"
                    :notification="evt"
                    :show-inline-params="true"
                  />
                </div>
              </div>
            </div>
          </TraceSection>

          <!-- Opcode Execution Steps (from neo3fura detailed trace) -->
          <TraceSection
            v-if="(execStepsMap[ei] ?? []).length > 0"
            title="Execution Steps (Opcodes)"
            :count="execStepsMap[ei].length"
            :default-open="false"
          >
            <div class="max-h-[500px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                  <tr>
                    <th class="w-16 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">#</th>
                    <th class="w-28 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      OpCode
                    </th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Operand</th>
                    <th class="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Gas</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr
                    v-for="(step, si) in execStepsMap[ei]"
                    :key="step.opcode + '-' + (step.offset ?? si)"
                    class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td class="px-3 py-1.5 font-mono text-xs text-gray-400">{{ step.offset ?? si }}</td>
                    <td class="px-3 py-1.5">
                      <span
                        class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                        :class="opcodeColorClass(step.opcode)"
                      >
                        {{ step.opcode }}
                      </span>
                    </td>
                    <td class="px-3 py-1.5 font-mono text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs">
                      {{ step.operand || step.instruction || "-" }}
                    </td>
                    <td class="px-3 py-1.5 text-right font-mono text-xs text-gray-400">
                      {{ step.gasConsumed ?? step.gas ?? "-" }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TraceSection>

          <!-- Contract-to-Contract Calls (from detailed trace) -->
          <TraceSection
            v-if="(execContractCallsMap[ei] ?? []).length > 0"
            title="Internal Contract Calls"
            :count="execContractCallsMap[ei].length"
            :default-open="true"
          >
            <div class="space-y-2">
              <div
                v-for="(call, ci) in execContractCallsMap[ei]"
                :key="ci"
                class="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-3 py-2"
              >
                <span
                  class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300"
                >
                  {{ ci + 1 }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <HashLink :hash="call.contract || call.contractHash || call.callee" type="contract" />
                    <span
                      v-if="call.method || call.operation"
                      class="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                    >
                      {{ call.method || call.operation }}
                    </span>
                  </div>
                  <div v-if="call.caller" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Called by: <HashLink :hash="call.caller" type="contract" />
                  </div>
                </div>
              </div>
            </div>
          </TraceSection>

          <!-- Return Stack section (collapsed by default) -->
          <TraceSection
            v-if="exec.stack && exec.stack.length > 0"
            title="Advanced: Return Stack"
            :count="exec.stack.length"
            :default-open="false"
          >
            <StackViewer :stack="exec.stack" />
          </TraceSection>
        </div>
      </div>
    </div>

    <!-- No data -->
    <EmptyState
      v-else-if="!loading"
      icon="tx"
      message="No execution data — application log not available for this transaction."
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, toRef } from "vue";
import { executionService } from "@/services/executionService";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import HashLink from "@/components/common/HashLink.vue";
import NotificationDecoder from "./NotificationDecoder.vue";
import StackViewer from "./StackViewer.vue";
import TraceSection from "./TraceSection.vue";
import StateChangeSummary from "./StateChangeSummary.vue";
import GasBreakdown from "./GasBreakdown.vue";
import { vmStateClass, vmStateDot, formatGasDecimal, opcodeColorClass } from "@/utils/explorerFormat";

const props = defineProps({
  txHash: {
    type: String,
    required: true,
    validator: (val) => val.length > 0,
  },
  enrichedData: {
    type: Object,
    default: null,
    validator: (val) => val === null || (typeof val === "object" && !Array.isArray(val)),
  },
  preloaded: {
    type: Boolean,
    default: false,
  },
});

const loading = ref(false);
const error = ref(null);
const appLog = ref(null);
const isComplex = ref(false);
const callTree = ref([]);
const expandedExecs = reactive({});
const enrichedTrace = ref(null);
const enrichedLoading = ref(false);

function toggleExec(index) {
  expandedExecs[index] = !expandedExecs[index];
}

function applyPreloadedData(data) {
  if (!data) return;
  appLog.value = data.raw || null;
  isComplex.value = data.isComplex || false;
  enrichedTrace.value = data;
  enrichedLoading.value = false;

  if (isComplex.value && data.executions) {
    callTree.value = data.executions.map((exec) => ({
      trigger: exec.trigger ?? "Application",
      vmState: exec.vmState ?? "UNKNOWN",
      gasConsumed: exec.gasConsumed ?? "0",
      stack: exec.stack ?? [],
      children: exec.byContract ?? [],
      steps: exec.steps ?? [],
      contractCalls: exec.contractCalls ?? [],
    }));
    callTree.value.forEach((_, i) => {
      expandedExecs[i] = true;
    });
  } else {
    callTree.value = [];
  }
}

/** Pre-computed maps: avoids re-evaluating per render cycle in v-for */
const execStepsMap = computed(() => (enrichedTrace.value?.executions ?? callTree.value).map((e) => e?.steps ?? []));

const execContractCallsMap = computed(() =>
  (enrichedTrace.value?.executions ?? callTree.value).map((e) => e?.contractCalls ?? [])
);

const totalGas = computed(() => {
  if (!enrichedTrace.value?.executions) return "0";
  return enrichedTrace.value.executions.reduce((sum, e) => sum + Number(e.gasConsumed || 0), 0).toString();
});

const execExceptions = computed(() => {
  if (!appLog.value?.executions) return {};
  const map = {};
  appLog.value.executions.forEach((e, i) => {
    if (e.exception) map[i] = e.exception;
  });
  return map;
});

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
    // Auto-expand all execution groups
    callTree.value.forEach((_, i) => {
      expandedExecs[i] = true;
    });

    // Load enriched trace for summary and gas breakdown
    loadEnrichedTrace();
  } catch (err) {
    error.value = err?.message ?? "Failed to fetch execution trace";
  } finally {
    loading.value = false;
  }
}

async function loadEnrichedTrace() {
  enrichedLoading.value = true;
  try {
    const data = await executionService.getEnrichedTrace(props.txHash);
    enrichedTrace.value = data;
    // Rebuild callTree from enriched data to include steps/contractCalls
    if (data?.executions && isComplex.value) {
      callTree.value = data.executions.map((exec) => ({
        trigger: exec.trigger ?? "Application",
        vmState: exec.vmState ?? "UNKNOWN",
        gasConsumed: exec.gasConsumed ?? "0",
        stack: exec.stack ?? [],
        children: exec.byContract ?? [],
        steps: exec.steps ?? [],
        contractCalls: exec.contractCalls ?? [],
      }));
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Failed to load enriched trace:", err);
  } finally {
    enrichedLoading.value = false;
  }
}

watch(
  toRef(props, "txHash"),
  () => {
    if (props.preloaded && props.enrichedData) {
      applyPreloadedData(props.enrichedData);
    } else {
      loadTrace();
    }
  },
  { immediate: true }
);

watch(
  () => props.enrichedData,
  (newData) => {
    if (props.preloaded && newData) {
      applyPreloadedData(newData);
    }
  }
);
</script>
