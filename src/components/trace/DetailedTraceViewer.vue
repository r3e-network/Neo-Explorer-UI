<template>
  <div class="detailed-trace-viewer">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Execution Trace
      </h3>
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border"
          :class="vmStateClass(trace.vmstate)"
        >
          <span
            class="w-1.5 h-1.5 rounded-full"
            :class="vmStateDot(trace.vmstate)"
          ></span>
          {{ trace.vmstate }}
        </span>
        <button
          @click="toggleView"
          class="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          {{ showOpcodes ? "Hide Opcodes" : "Show Opcodes" }}
        </button>
      </div>
    </div>

    <!-- Summary -->
    <div class="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div
        class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="text-xs text-gray-500 dark:text-gray-400">Trigger</div>
        <div class="font-medium text-gray-900 dark:text-gray-100">
          {{ trace.trigger }}
        </div>
      </div>
      <div
        class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="text-xs text-gray-500 dark:text-gray-400">Gas Consumed</div>
        <div class="font-medium text-gray-900 dark:text-gray-100">
          {{ formatGas(trace.gasConsumed) }} GAS
        </div>
      </div>
      <div
        class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="text-xs text-gray-500 dark:text-gray-400">Steps</div>
        <div class="font-medium text-gray-900 dark:text-gray-100">
          {{ trace.steps?.length || 0 }}
        </div>
      </div>
      <div
        class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Notifications
        </div>
        <div class="font-medium text-gray-900 dark:text-gray-100">
          {{ trace.notifications?.length || 0 }}
        </div>
      </div>
    </div>

    <!-- Opcode Steps -->
    <div v-if="showOpcodes" class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Execution Steps
        </h4>
        <div class="flex items-center gap-2 text-xs text-gray-500">
          <span class="flex items-center gap-1">
            <span class="h-2 w-2 rounded bg-green-500"></span>
            PUSH
          </span>
          <span class="flex items-center gap-1">
            <span class="h-2 w-2 rounded bg-blue-500"></span>
            CALL
          </span>
          <span class="flex items-center gap-1">
            <span class="h-2 w-2 rounded bg-yellow-500"></span>
            JUMP
          </span>
        </div>
      </div>

      <div
        class="max-h-[500px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-gray-50 dark:bg-gray-800">
            <tr>
              <th
                class="w-16 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                #
              </th>
              <th
                class="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                OpCode
              </th>
              <th
                class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Instruction
              </th>
              <th
                class="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Gas
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="(step, index) in trace.steps"
              :key="index"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td class="px-3 py-2 font-mono text-xs text-gray-500">
                {{ index }}
              </td>
              <td class="px-3 py-2">
                <span
                  class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                  :class="getOpCodeClass(step.opcode)"
                >
                  {{ step.opcode }}
                </span>
              </td>
              <td
                class="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300"
              >
                {{ step.instruction || "-" }}
              </td>
              <td class="px-3 py-2 text-right font-mono text-xs text-gray-500">
                {{ step.gasConsumed }}
              </td>
            </tr>
            <tr v-if="!trace.steps || trace.steps.length === 0">
              <td colspan="4" class="px-3 py-8 text-center text-gray-500">
                <div class="flex flex-col items-center gap-2">
                  <svg
                    class="h-8 w-8 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p>No execution trace available</p>
                  <p class="text-xs">
                    Detailed opcode trace requires trace storage to be enabled
                    on the Neo node
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Notifications -->
    <div class="mt-4">
      <h4 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Notifications ({{ trace.notifications?.length || 0 }})
      </h4>
      <div class="space-y-2">
        <div
          v-for="(notification, index) in trace.notifications"
          :key="index"
          class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs text-gray-500">{{
                truncateHash(notification.contract, 8, 6)
              }}</span>
              <span class="text-gray-300">→</span>
              <span
                class="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {{ notification.eventName }}
              </span>
            </div>
          </div>
          <div
            v-if="notification.state"
            class="mt-2 font-mono text-xs text-gray-600 dark:text-gray-400"
          >
            {{ JSON.stringify(notification.state).substring(0, 200)
            }}{{ JSON.stringify(notification.state).length > 200 ? "..." : "" }}
          </div>
        </div>
        <div
          v-if="!trace.notifications || trace.notifications.length === 0"
          class="text-center text-sm text-gray-500"
        >
          No notifications
        </div>
      </div>
    </div>

    <!-- Stack -->
    <div v-if="trace.stack && trace.stack.length > 0" class="mt-4">
      <h4 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Final Stack ({{ trace.stack.length }} items)
      </h4>
      <div
        class="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900"
      >
        <pre class="font-mono text-xs text-gray-700 dark:text-gray-300">{{
          JSON.stringify(trace.stack, null, 2)
        }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { truncateHash } from "@/utils/explorerFormat";

const props = defineProps({
  trace: {
    type: Object,
    default: () => ({
      txid: "",
      blockhash: "",
      blockindex: 0,
      trigger: "",
      vmstate: "",
      gasConsumed: 0,
      steps: [],
      notifications: [],
      stack: [],
    }),
  },
  loading: { type: Boolean, default: false },
});

const showOpcodes = ref(true);

function toggleView() {
  showOpcodes.value = !showOpcodes.value;
}

function formatGas(gas) {
  if (!gas) return "0";
  return (Number(gas) / 1e8).toFixed(8);
}

function vmStateClass(state) {
  if (state === "HALT") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
  }
  if (state === "FAULT") {
    return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  }
  return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600";
}

function vmStateDot(state) {
  if (state === "HALT") return "bg-emerald-500";
  if (state === "FAULT") return "bg-red-500";
  return "bg-gray-500";
}

function getOpCodeClass(opcode) {
  if (!opcode)
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

  const op = opcode.toUpperCase();

  // Stack operations
  if (op.startsWith("PUSH") || op === "POP") {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  }

  // Control flow
  if (
    op.includes("CALL") ||
    op === "JMP" ||
    op === "JMPIF" ||
    op === "JMPIFNOT" ||
    op === "JMPLE" ||
    op === "JMPGT" ||
    op === "JMPLE" ||
    op === "JMPLT"
  ) {
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  }

  // Function
  if (op === "CALL" || op === "CALLT" || op === "RET" || op === "SYSCALL") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }

  // Storage
  if (op.startsWith("INIT") || op === "SLOAD" || op === "SSTORE") {
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  }

  // Crypto
  if (
    op.startsWith("SHA") ||
    op.startsWith("CHECK") ||
    op.startsWith("VERIFY")
  ) {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  }

  return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
}
</script>
