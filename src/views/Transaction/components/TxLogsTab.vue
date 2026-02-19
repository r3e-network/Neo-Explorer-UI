<template>
  <div>
    <!-- Loading -->
    <div v-if="appLogLoading" class="py-8 text-center" role="status" aria-live="polite">
      <div class="space-y-3">
        <Skeleton class="mx-auto" width="75%" height="16px" />
        <Skeleton class="mx-auto" width="50%" height="16px" />
      </div>
    </div>
    <!-- Error -->
    <div v-else-if="appLogError" class="py-8 text-center" role="alert">
      <p class="text-sm text-red-500">{{ appLogError }}</p>
    </div>
    <!-- Empty -->
    <div v-else-if="!appLog" class="panel-muted text-mid px-4 py-8 text-center text-sm">
      No application log available for this transaction.
    </div>
    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Raw JSON toggle -->
      <div class="flex justify-end">
        <button
          type="button"
          :aria-pressed="showRawAppLog"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          :class="
            showRawAppLog
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
              : 'badge-soft hover:text-high'
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
        class="panel-muted text-mid max-h-[600px] overflow-auto rounded-lg p-4 font-mono text-xs"
        >{{ formatState(appLog) }}</pre
      >

      <template v-if="!showRawAppLog">
        <div v-for="(exec, eIdx) in appLog.executions" :key="'exec-' + eIdx">
          <!-- Execution badges -->
          <div class="mb-3 flex flex-wrap items-center gap-3">
            <span
              class="badge-soft rounded px-2 py-1 text-xs font-medium text-high"
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
            class="panel-muted mb-4 p-3"
          >
            <h4 class="text-low mb-2 text-xs font-semibold uppercase tracking-wider">
              Stack Result
            </h4>
            <pre class="text-high max-h-32 overflow-auto font-mono text-xs">{{
              JSON.stringify(exec.stack, null, 2)
            }}</pre>
          </div>

          <!-- Notifications -->
          <div v-if="exec.notifications && exec.notifications.length">
            <h4 class="text-low mb-2 text-xs font-semibold uppercase tracking-wider">
              Notifications ({{ exec.notifications.length }})
            </h4>
            <!-- Enriched display when available -->
            <div v-if="enrichedTrace && enrichedTrace.executions[eIdx]" class="space-y-3">
              <EnrichedNotification
                v-for="(op, opIdx) in enrichedTrace.executions[eIdx].operations || []"
                :key="'enriched-' + opIdx"
                :notification="op"
                :event-def="op.eventDef"
              />
            </div>
            <!-- Raw fallback -->
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <caption class="sr-only">
                  Raw VM notifications
                </caption>
                <thead class="table-head">
                  <tr class="soft-divider border-b">
                    <th class="table-header-cell">#</th>
                    <th class="table-header-cell">Contract</th>
                    <th class="table-header-cell">Event</th>
                    <th class="table-header-cell">State</th>
                  </tr>
                </thead>
                <tbody class="soft-divider divide-y">
                  <tr v-for="(n, nIdx) in exec.notifications" :key="'notif-' + nIdx" class="list-row transition-colors">
                    <td class="table-cell-secondary text-xs">
                      {{ nIdx + 1 }}
                    </td>
                    <td class="table-cell">
                      <HashLink :hash="n.contract" type="contract" />
                    </td>
                    <td class="table-cell">
                      <span
                        class="badge-soft text-high rounded px-2 py-0.5 text-xs font-medium"
                      >
                        {{ n.eventname || "unknown" }}
                      </span>
                    </td>
                    <td class="table-cell">
                      <pre
                        class="text-high max-h-24 max-w-xs overflow-auto font-mono text-xs"
                        >{{ formatState(n.state) }}</pre
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="text-mid py-4 text-center text-sm">
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
import Skeleton from "@/components/common/Skeleton.vue";
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
