<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import EnrichedNotification from "@/components/trace/EnrichedNotification.vue";
import StackViewer from "@/components/trace/StackViewer.vue";
import HashLink from "@/components/common/HashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import { formatGas } from "@/utils/explorerFormat";

const { t } = useI18n();

defineProps({
  appLog: { type: Object, default: null },
  appLogLoading: { type: Boolean, default: false },
  appLogError: { type: String, default: "" },
  enrichedTrace: { type: Object, default: null },
});

const showRawAppLog = ref(false);

function formatState(state) {
  if (!state) return "-";
  try {
    return JSON.stringify(state, null, 2);
  } catch {
    return String(state);
  }
}

// dBFT trigger codes are protocol identifiers, not user-facing copy. Translate
// only the generic "System" fallback when no trigger is present.
function triggerLabel(trigger) {
  if (!trigger) return t("blockDetail.logsTriggerSystem");
  const code = trigger.toLowerCase();
  if (code === "onpersist") return "OnPersist";
  if (code === "postpersist") return "PostPersist";
  return trigger;
}

function triggerDescription(trigger) {
  const code = (trigger || "").toLowerCase();
  if (code === "onpersist") return t("blockDetail.logsOnPersistDescription");
  if (code === "postpersist") return t("blockDetail.logsPostPersistDescription");
  return "";
}
</script>

<template>
  <div class="p-4 md:p-5">
    <!-- Raw JSON toggle -->
    <div v-if="appLog && !appLogLoading" class="mb-4 flex justify-end">
      <button
        type="button"
        :aria-pressed="showRawAppLog"
        class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        :class="
          showRawAppLog
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
            : 'badge-soft hover:text-high'
        "
        @click="showRawAppLog = !showRawAppLog"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
        {{ showRawAppLog ? $t("blockDetail.logsDecoded") : $t("blockDetail.logsRawJson") }}
      </button>
    </div>

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
    <EmptyState
      v-else-if="!appLog || !appLog.executions || appLog.executions.length === 0"
      :message="$t('blockDetail.logsEmpty')"
      icon="log"
    />

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Full raw JSON view -->
      <pre
        v-if="showRawAppLog"
        class="panel-muted text-mid max-h-[600px] overflow-auto rounded-lg p-4 font-mono text-xs"
      >{{ formatState(appLog) }}</pre>

      <template v-if="!showRawAppLog">
        <div
          v-for="(exec, eIdx) in appLog.executions"
          :key="'exec-' + eIdx"
          class="rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <!-- Execution header -->
          <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div class="flex flex-wrap items-center gap-3">
              <span
                class="rounded px-2.5 py-1 text-xs font-semibold"
                :class="
                  (exec.trigger || '').toLowerCase() === 'onpersist'
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                "
              >
                {{ triggerLabel(exec.trigger) }}
              </span>
              <span
                class="rounded px-2 py-1 text-xs font-medium"
                :class="
                  exec.vmstate === 'HALT'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                "
              >
                {{ $t("blockDetail.logsVmState", { state: exec.vmstate || $t("blockDetail.logsVmStateUnknown") }) }}
              </span>
              <span
                class="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {{ $t("blockDetail.logsGasConsumed", { amount: formatGas(exec.gasconsumed) }) }}
              </span>
            </div>
            <p
              v-if="triggerDescription(exec.trigger)"
              class="mt-1.5 text-xs text-mid"
            >
              {{ triggerDescription(exec.trigger) }}
            </p>
          </div>

          <div class="p-4">
            <!-- Stack Result -->
            <div
              v-if="exec.stack && exec.stack.length"
              class="panel-muted mb-4 p-3"
            >
              <h4 class="text-low mb-2 text-xs font-semibold uppercase tracking-wider">
                {{ $t("blockDetail.logsStackResult") }}
              </h4>
              <StackViewer :stack="exec.stack" />
            </div>

            <!-- Notifications -->
            <div v-if="exec.notifications && exec.notifications.length">
              <h4 class="text-low mb-2 text-xs font-semibold uppercase tracking-wider">
                {{ $t("blockDetail.logsNotifications", { count: exec.notifications.length }) }}
              </h4>

              <!-- Enriched display -->
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
                  <caption class="sr-only">{{ $t("blockDetail.logsCaption") }}</caption>
                  <thead class="table-head">
                    <tr class="soft-divider border-b">
                      <th class="table-header-cell">#</th>
                      <th class="table-header-cell">{{ $t("blockDetail.logsColContract") }}</th>
                      <th class="table-header-cell">{{ $t("blockDetail.logsColEvent") }}</th>
                      <th class="table-header-cell">{{ $t("blockDetail.logsColState") }}</th>
                    </tr>
                  </thead>
                  <tbody class="soft-divider divide-y">
                    <tr
                      v-for="(n, nIdx) in exec.notifications"
                      :key="'notif-' + nIdx"
                      class="list-row group"
                    >
                      <td class="table-cell-secondary text-xs">{{ nIdx + 1 }}</td>
                      <td class="table-cell">
                        <HashLink :hash="n.contract" type="contract" />
                      </td>
                      <td class="table-cell">
                        <span class="badge-soft text-high rounded px-2 py-0.5 text-xs font-medium">
                          {{ n.eventname || $t("blockDetail.logsEventUnknown") }}
                        </span>
                      </td>
                      <td class="table-cell">
                        <pre class="text-high max-h-24 max-w-xs overflow-auto font-mono text-xs">{{ formatState(n.state) }}</pre>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-else class="text-mid py-4 text-center text-sm">
              {{ $t("blockDetail.logsNoNotifications") }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
