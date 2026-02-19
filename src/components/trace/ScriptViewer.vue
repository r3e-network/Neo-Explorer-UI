<template>
  <div class="script-viewer">
    <!-- Header with toggle -->
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-high text-sm font-semibold">
        {{ label }}
      </h4>
      <div class="flex items-center gap-2">
        <button
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          :class="
            showRaw
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
              : 'badge-soft hover:text-high'
          "
          @click="showRaw = !showRaw"
        >
          <svg
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          {{ showRaw ? "Decoded" : "Raw Hex" }}
        </button>
        <CopyButton :text="rawHex" />
      </div>
    </div>

    <!-- Raw hex view -->
    <pre
      v-if="showRaw"
      class="panel-muted text-mid max-h-48 overflow-auto rounded-lg break-all whitespace-pre-wrap p-3 font-mono text-xs"
      >{{ rawHex }}</pre
    >

    <!-- Decoded opcodes table -->
    <div
      v-else
      class="soft-divider overflow-x-auto rounded-lg border"
    >
      <table class="w-full text-xs">
        <thead>
          <tr
            class="table-head soft-divider border-b"
          >
            <th
              class="text-low w-16 px-3 py-2 text-left font-medium"
            >
              Offset
            </th>
            <th
              class="text-low w-32 px-3 py-2 text-left font-medium"
            >
              Opcode
            </th>
            <th
              class="text-low px-3 py-2 text-left font-medium"
            >
              Operand
            </th>
          </tr>
        </thead>
        <tbody class="soft-divider divide-y">
          <tr
            v-for="(inst, idx) in visibleInstructions"
            :key="idx"
            class="list-row transition-colors"
          >
            <td class="text-low px-3 py-1.5 font-mono">
              {{ formatOffset(inst.offset) }}
            </td>
            <td class="px-3 py-1.5">
              <span
                class="font-mono font-semibold"
                :class="opcodeColor(inst.opcode)"
              >
                {{ inst.opcode }}
              </span>
            </td>
            <td
              class="text-high break-all px-3 py-1.5 font-mono"
            >
              <span v-if="inst.operand" :class="operandClass(inst)">{{
                inst.operand
              }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Show more -->
      <button
        v-if="instructions.length > maxVisible && !showAllOps"
        class="soft-divider w-full border-t py-2 text-xs font-medium text-primary-500 transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/20"
        @click="showAllOps = true"
      >
        Show all {{ instructions.length }} instructions
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { disassembleScript } from "@/utils/scriptDisassembler";
import CopyButton from "@/components/common/CopyButton.vue";

const props = defineProps({
  /** Base64-encoded script */
  script: { type: String, default: "" },
  /** Display label */
  label: { type: String, default: "Script" },
});

const showRaw = ref(false);
const showAllOps = ref(false);
const maxVisible = 50;

const instructions = computed(() => {
  if (!props.script) return [];
  try {
    return disassembleScript(props.script);
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("Failed to disassemble script:", e);
    }
    return [];
  }
});

const visibleInstructions = computed(() => {
  if (showAllOps.value || instructions.value.length <= maxVisible) {
    return instructions.value;
  }
  return instructions.value.slice(0, maxVisible);
});

const rawHex = computed(() => {
  if (!props.script) return "";
  try {
    const bin = atob(props.script);
    return Array.from(bin)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return props.script;
  }
});

function formatOffset(offset) {
  return offset.toString(16).padStart(4, "0").toUpperCase();
}

function opcodeColor(opcode) {
  if (opcode === "SYSCALL") return "text-amber-600 dark:text-amber-400";
  if (opcode.startsWith("PUSH")) return "text-blue-600 dark:text-blue-400";
  if (
    opcode.startsWith("JMP") ||
    opcode === "CALL" ||
    opcode === "CALL_L" ||
    opcode === "RET"
  )
    return "text-purple-600 dark:text-purple-400";
  if (opcode === "ABORT" || opcode === "THROW" || opcode === "FAULT")
    return "text-red-600 dark:text-red-400";
  return "text-high";
}

function operandClass(inst) {
  if (inst.opcode === "SYSCALL")
    return "text-amber-700 dark:text-amber-300 font-semibold";
  if (inst.operand.startsWith('"'))
    return "text-emerald-600 dark:text-emerald-400";
  if (inst.operand.includes("Hash160"))
    return "text-blue-600 dark:text-blue-400";
  return "";
}
</script>
