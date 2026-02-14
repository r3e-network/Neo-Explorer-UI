<template>
  <div class="script-viewer">
    <!-- Header with toggle -->
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-semibold text-text-primary dark:text-gray-200">
        {{ label }}
      </h4>
      <div class="flex items-center gap-2">
        <button
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          :class="
            showRaw
              ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
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
      class="max-h-48 overflow-auto rounded-lg bg-gray-50 dark:bg-gray-900 p-3 font-mono text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 break-all whitespace-pre-wrap"
      >{{ rawHex }}</pre
    >

    <!-- Decoded opcodes table -->
    <div
      v-else
      class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <table class="w-full text-xs">
        <thead>
          <tr
            class="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700"
          >
            <th
              class="px-3 py-2 text-left font-medium text-text-secondary dark:text-gray-400 w-16"
            >
              Offset
            </th>
            <th
              class="px-3 py-2 text-left font-medium text-text-secondary dark:text-gray-400 w-32"
            >
              Opcode
            </th>
            <th
              class="px-3 py-2 text-left font-medium text-text-secondary dark:text-gray-400"
            >
              Operand
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr
            v-for="(inst, idx) in visibleInstructions"
            :key="idx"
            class="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
          >
            <td class="px-3 py-1.5 font-mono text-gray-400 dark:text-gray-500">
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
              class="px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300 break-all"
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
        class="w-full py-2 text-xs font-medium text-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-200 dark:border-gray-700"
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
  return "text-gray-800 dark:text-gray-200";
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
