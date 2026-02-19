<template>
  <div class="detailed-trace-viewer">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-high text-lg font-semibold">
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
          class="soft-divider list-row text-mid rounded-md border px-3 py-1.5 text-xs font-medium"
        >
          {{ showOpcodes ? "Hide Opcodes" : "Show Opcodes" }}
        </button>
      </div>
    </div>

    <!-- Summary -->
    <div class="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="panel-muted p-3">
        <div class="text-mid text-xs">Trigger</div>
        <div class="text-high font-medium">
          {{ trace.trigger }}
        </div>
      </div>
      <div class="panel-muted p-3">
        <div class="text-mid text-xs">Gas Consumed</div>
        <div class="text-high font-medium">
          {{ formatGas(trace.gasConsumed) }} GAS
        </div>
      </div>
      <div class="panel-muted p-3">
        <div class="text-mid text-xs">Steps</div>
        <div class="text-high font-medium">
          {{ trace.steps?.length || 0 }}
        </div>
      </div>
      <div class="panel-muted p-3">
        <div class="text-mid text-xs">
          Notifications
        </div>
        <div class="text-high font-medium">
          {{ trace.notifications?.length || 0 }}
        </div>
      </div>
    </div>

    <!-- Opcode Steps -->
    <div v-if="showOpcodes" class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="text-high text-sm font-medium">
          Execution Steps
        </h4>
        <div class="text-mid flex items-center gap-2 text-xs">
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

      <div class="soft-divider max-h-[500px] overflow-y-auto rounded-lg border">
        <table class="w-full text-sm">
          <thead class="table-head sticky top-0">
            <tr>
              <th
                class="text-mid w-16 px-3 py-2 text-left text-xs font-medium"
              >
                #
              </th>
              <th
                class="text-mid w-24 px-3 py-2 text-left text-xs font-medium"
              >
                OpCode
              </th>
              <th
                class="text-mid px-3 py-2 text-left text-xs font-medium"
              >
                Instruction
              </th>
              <th
                class="text-mid w-24 px-3 py-2 text-right text-xs font-medium"
              >
                Gas
              </th>
            </tr>
          </thead>
          <tbody class="soft-divider divide-y">
            <tr
              v-for="(step, index) in trace.steps"
              :key="index"
              class="list-row"
            >
              <td class="text-low px-3 py-2 font-mono text-xs">
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
              <td class="text-high px-3 py-2 font-mono text-xs">
                {{ step.instruction || "-" }}
              </td>
              <td class="text-low px-3 py-2 text-right font-mono text-xs">
                {{ step.gasConsumed }}
              </td>
            </tr>
            <tr v-if="!trace.steps || trace.steps.length === 0">
              <td colspan="4" class="text-mid px-3 py-8 text-center">
                <div class="flex flex-col items-center gap-2">
                  <svg
                    class="text-low h-8 w-8"
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
      <h4 class="text-high mb-2 text-sm font-medium">
        Notifications ({{ trace.notifications?.length || 0 }})
      </h4>
      <div class="space-y-2">
        <div
          v-for="(notification, index) in trace.notifications"
          :key="index"
          class="panel-muted p-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-low font-mono text-xs">{{
                truncateHash(notification.contract, 8, 6)
              }}</span>
              <span class="text-low">→</span>
              <span
                class="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {{ notification.eventName }}
              </span>
            </div>
          </div>
          <div
            v-if="notification.state"
            class="text-mid mt-2 font-mono text-xs"
          >
            {{ JSON.stringify(notification.state).substring(0, 200)
            }}{{ JSON.stringify(notification.state).length > 200 ? "..." : "" }}
          </div>
        </div>
        <div
          v-if="!trace.notifications || trace.notifications.length === 0"
          class="text-mid text-center text-sm"
        >
          No notifications
        </div>
      </div>
    </div>

    <!-- Stack -->
    <div v-if="trace.stack && trace.stack.length > 0" class="mt-4">
      <h4 class="text-high mb-2 text-sm font-medium">
        Final Stack ({{ trace.stack.length }} items)
      </h4>
      <div class="panel-muted max-h-48 overflow-y-auto p-3">
        <pre class="text-mid font-mono text-xs">{{
          JSON.stringify(trace.stack, null, 2)
        }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { truncateHash } from "@/utils/explorerFormat";

defineProps({
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
  return "badge-soft";
}

function vmStateDot(state) {
  if (state === "HALT") return "bg-emerald-500";
  if (state === "FAULT") return "bg-red-500";
  return "bg-slate-500";
}

function getOpCodeClass(opcode) {
  if (!opcode) return "badge-soft";

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

  return "badge-soft";
}
</script>
