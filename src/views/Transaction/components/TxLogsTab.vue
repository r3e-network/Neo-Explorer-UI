<template>
  <div>
    <!-- Loading -->
    <div v-if="appLogLoading" class="py-8 text-center">
      <div class="animate-pulse space-y-3">
        <div class="mx-auto h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div class="mx-auto h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
    <!-- Error -->
    <div v-else-if="appLogError" class="py-8 text-center">
      <p class="text-sm text-red-500">{{ appLogError }}</p>
    </div>
    <!-- Empty -->
    <div v-else-if="!appLog" class="py-8 text-center text-text-secondary dark:text-gray-400">
      No application log available for this transaction.
    </div>
    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Raw JSON toggle -->
      <div class="flex justify-end">
        <button
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          :class="
            showRawAppLog
              ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
          "
          @click="$emit('update:showRawAppLog', !showRawAppLog)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          {{ showRawAppLog ? "Decoded View" : "Raw JSON" }}
        </button>
      </div>

      <!-- Full raw JSON view -->
      <pre
        v-if="showRawAppLog"
        class="max-h-[600px] overflow-auto rounded-lg bg-gray-50 dark:bg-gray-900 p-4 font-mono text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
        >{{ formatState(appLog) }}</pre
      >

      <template v-if="!showRawAppLog">
        <div v-for="(exec, eIdx) in appLog.executions" :key="'exec-' + eIdx">
          <!-- Execution badges -->
          <div class="mb-3 flex flex-wrap items-center gap-3">
            <span
              class="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-text-primary dark:bg-gray-700 dark:text-gray-200"
            >
              Trigger: {{ exec.trigger || "Application" }}
            </span>
            <span
              class="rounded px-2 py-1 text-xs font-medium"
              :class="
                exec.vmstate === 'HALT'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              "
            >
              VM State: {{ exec.vmstate || "UNKNOWN" }}
            </span>
            <span
              class="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            >
              GAS Consumed: {{ formatGasDecimal(exec.gasconsumed) }}
            </span>
          </div>

          <!-- Stack Result -->
          <div
            v-if="exec.stack && exec.stack.length"
            class="mb-4 rounded-lg border border-card-border p-3 dark:border-card-border-dark"
          >
            <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400">
              Stack Result
            </h4>
            <pre class="max-h-32 overflow-auto font-mono text-xs text-text-primary dark:text-gray-200">{{
              JSON.stringify(exec.stack, null, 2)
            }}</pre>
          </div>

          <!-- Notifications -->
          <div v-if="exec.notifications && exec.notifications.length">
            <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400">
              Notifications ({{ exec.notifications.length }})
            </h4>
            <!-- Enriched display when available -->
            <div v-if="enrichedTrace && enrichedTrace.executions[eIdx]" class="space-y-3">
              <EnrichedNotification
                v-for="(op, opIdx) in enrichedTrace.executions[eIdx].operations"
                :key="'enriched-' + opIdx"
                :notification="op"
                :event-def="op.eventDef"
              />
            </div>
            <!-- Raw fallback -->
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-card-border dark:border-card-border-dark">
                    <th class="table-header-cell">#</th>
                    <th class="table-header-cell">Contract</th>
                    <th class="table-header-cell">Event</th>
                    <th class="table-header-cell">State</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                  <tr v-for="(n, nIdx) in exec.notifications" :key="'notif-' + nIdx">
                    <td class="table-cell-secondary text-xs">
                      {{ nIdx }}
                    </td>
                    <td class="table-cell">
                      <HashLink :hash="n.contract" type="contract" />
                    </td>
                    <td class="table-cell">
                      <span
                        class="rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                      >
                        {{ n.eventname || "unknown" }}
                      </span>
                    </td>
                    <td class="table-cell">
                      <pre
                        class="max-h-24 max-w-xs overflow-auto font-mono text-xs text-text-primary dark:text-gray-300"
                        >{{ formatState(n.state) }}</pre
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="py-4 text-center text-sm text-text-secondary dark:text-gray-400">
            No notifications emitted.
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import EnrichedNotification from "@/components/trace/EnrichedNotification.vue";
import HashLink from "@/components/common/HashLink.vue";
import { formatGasDecimal } from "@/utils/explorerFormat";

defineProps({
  appLog: { type: Object, default: null },
  appLogLoading: { type: Boolean, default: false },
  appLogError: { type: String, default: "" },
  showRawAppLog: { type: Boolean, default: false },
  enrichedTrace: { type: Object, default: null },
});

defineEmits(["update:showRawAppLog"]);

function formatState(state) {
  if (!state) return "-";
  try {
    return JSON.stringify(state, null, 2);
  } catch {
    return String(state);
  }
}
</script>
