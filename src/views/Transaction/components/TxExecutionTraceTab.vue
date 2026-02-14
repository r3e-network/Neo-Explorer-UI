<template>
  <div>
    <!-- Loading -->
    <div v-if="appLogLoading" class="py-8 text-center">
      <div class="animate-pulse space-y-3">
        <div class="mx-auto h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div class="mx-auto h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
    <!-- Empty -->
    <div v-else-if="!appLog" class="py-8 text-center text-text-secondary dark:text-gray-400">
      No execution trace available for this transaction.
    </div>
    <!-- Content -->
    <div v-else class="space-y-4">
      <!-- Full trace link for complex txns -->
      <router-link
        v-if="isComplexTx"
        :to="`/tx/${txHash}/trace`"
        class="mb-4 flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
        View Full Execution Trace
      </router-link>

      <div
        v-for="(node, nIdx) in callTree"
        :key="'tree-' + nIdx"
        class="rounded-lg border border-card-border dark:border-card-border-dark"
      >
        <div class="flex flex-wrap items-center gap-3 border-b border-card-border p-4 dark:border-card-border-dark">
          <span class="rounded bg-gray-100 px-2 py-1 text-xs font-medium dark:bg-gray-700">
            Trigger: {{ node.trigger }}
          </span>
          <span
            class="rounded px-2 py-1 text-xs font-medium"
            :class="
              node.vmState === 'HALT'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            "
          >
            {{ node.vmState }}
          </span>
          <span class="text-xs text-text-secondary dark:text-gray-400">
            GAS: {{ formatGasDecimal(node.gasConsumed) }}
          </span>
        </div>
        <div class="p-4 space-y-4">
          <!-- Contract Notifications -->
          <div v-if="node.children && node.children.length" class="space-y-3">
            <div
              v-for="(child, cIdx) in node.children"
              :key="'child-' + cIdx"
              class="rounded-md border-l-4 border-primary-500 bg-gray-50 p-3 dark:bg-gray-800/40"
            >
              <div class="mb-2 flex items-center gap-2">
                <span class="text-xs font-semibold text-text-primary dark:text-gray-200">Contract:</span>
                <HashLink :hash="child.contract" type="contract" />
              </div>
              <div
                v-for="(evt, evtIdx) in child.events"
                :key="'evt-' + evtIdx"
                class="mt-2 border-l-2 border-gray-200 pl-3 dark:border-gray-600"
              >
                <span
                  class="rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                >
                  {{ evt.eventName }}
                </span>
                <pre
                  v-if="evt.state"
                  class="mt-1 max-h-24 overflow-auto font-mono text-xs text-text-secondary dark:text-gray-400"
                  >{{ formatState(evt.state) }}</pre
                >
              </div>
            </div>
          </div>
          <div v-else-if="!traceContractCalls(nIdx).length" class="text-sm text-text-secondary dark:text-gray-400">
            No contract interactions recorded.
          </div>

          <!-- Internal Contract Calls (from detailed trace) -->
          <div v-if="traceContractCalls(nIdx).length > 0">
            <button
              class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400"
              @click="toggleSection('calls-' + nIdx)"
            >
              <svg
                class="w-3 h-3 transition-transform"
                :class="{ 'rotate-90': expandedSections['calls-' + nIdx] }"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clip-rule="evenodd"
                />
              </svg>
              Internal Contract Calls ({{ traceContractCalls(nIdx).length }})
            </button>
            <div v-if="expandedSections['calls-' + nIdx]" class="space-y-2">
              <div
                v-for="(call, ci) in traceContractCalls(nIdx)"
                :key="'icall-' + ci"
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
          </div>

          <!-- Opcode Execution Steps (from detailed trace) -->
          <div v-if="traceSteps(nIdx).length > 0">
            <button
              class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400"
              @click="toggleSection('steps-' + nIdx)"
            >
              <svg
                class="w-3 h-3 transition-transform"
                :class="{ 'rotate-90': expandedSections['steps-' + nIdx] }"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clip-rule="evenodd"
                />
              </svg>
              Execution Steps — Opcodes ({{ traceSteps(nIdx).length }})
            </button>
            <div
              v-if="expandedSections['steps-' + nIdx]"
              class="max-h-[400px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700"
            >
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
                    v-for="(step, si) in traceSteps(nIdx)"
                    :key="'step-' + si"
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from "vue";
import HashLink from "@/components/common/HashLink.vue";
import { formatGasDecimal, opcodeColorClass } from "@/utils/explorerFormat";

const props = defineProps({
  appLog: { type: Object, default: null },
  appLogLoading: { type: Boolean, default: false },
  callTree: { type: Array, default: () => [] },
  enrichedTrace: { type: Object, default: null },
  isComplexTx: { type: Boolean, default: false },
  txHash: { type: String, default: "" },
});

const expandedSections = reactive({});

function toggleSection(key) {
  expandedSections[key] = !expandedSections[key];
}

function traceSteps(execIdx) {
  return props.enrichedTrace?.executions?.[execIdx]?.steps ?? [];
}

function traceContractCalls(execIdx) {
  return props.enrichedTrace?.executions?.[execIdx]?.contractCalls ?? [];
}

function formatState(state) {
  if (!state) return "-";
  try {
    return JSON.stringify(state, null, 2);
  } catch {
    return String(state);
  }
}
</script>
