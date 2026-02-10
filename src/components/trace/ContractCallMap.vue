<template>
  <div class="contract-call-map">
    <div v-if="!callTree || callTree.length === 0" class="text-sm text-gray-500 dark:text-gray-400 italic py-4">
      No contract calls to display
    </div>

    <div v-else class="space-y-6">
      <div v-for="(exec, ei) in callTree" :key="ei" class="execution-group">
        <!-- Execution header -->
        <div class="flex items-center gap-3 mb-3">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border"
            :class="vmStateClass(exec.vmState)"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="vmStateDot(exec.vmState)"></span>
            {{ exec.vmState }}
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400"> Trigger: {{ exec.trigger }} </span>
          <span class="text-xs font-mono text-gray-500 dark:text-gray-400"> {{ exec.gasConsumed }} GAS </span>
        </div>

        <!-- Contract flow -->
        <div class="flow-container flex flex-col md:flex-row gap-3 md:gap-0 md:items-start overflow-x-auto pb-2">
          <template v-for="(node, ni) in exec.children" :key="ni">
            <!-- Arrow between contracts (desktop) -->
            <div v-if="ni > 0" class="hidden md:flex items-center justify-center px-2 self-center">
              <svg
                class="w-6 h-6 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>

            <!-- Arrow between contracts (mobile) -->
            <div v-if="ni > 0" class="flex md:hidden items-center justify-center py-1">
              <svg
                class="w-5 h-5 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            <!-- Contract box -->
            <div
              class="contract-node flex-shrink-0 w-full md:w-64 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden"
            >
              <!-- Contract header -->
              <div class="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <HashLink :hash="node.contract" type="contract" />
              </div>

              <!-- Events list -->
              <div class="p-2 space-y-1.5">
                <div
                  v-for="(evt, evi) in node.events"
                  :key="evi"
                  class="event-badge flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 dark:bg-gray-700/30 text-xs"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0"></span>
                  <span class="font-medium text-gray-700 dark:text-gray-300">
                    {{ evt.eventName }}
                  </span>
                </div>
                <div v-if="!node.events || node.events.length === 0" class="text-xs text-gray-400 italic px-2 py-1">
                  No events
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import HashLink from "@/components/common/HashLink.vue";

defineProps({
  callTree: {
    type: Array,
    required: true,
  },
});

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
</script>
