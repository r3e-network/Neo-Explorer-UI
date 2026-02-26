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
            class="list-row group"
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
              <template v-if="inst.operand">
                <span v-if="parseOperand(inst.operand)" :class="operandClass(inst)">
                  {{ parseOperand(inst.operand).hash }}
                  <span class="text-mid font-normal">(</span>
                  <span v-if="parseOperand(inst.operand).type === 'account'" class="text-mid font-normal">Account: </span>
                  <span v-else-if="parseOperand(inst.operand).type === 'native'" class="text-mid font-normal">Native: </span>
                  <span v-else-if="parseOperand(inst.operand).type === 'contract'" class="text-mid font-normal">Contract</span>
                  <span v-else-if="parseOperand(inst.operand).type === 'tx'" class="text-mid font-normal">Hash256: </span>
                  <HashLink
                    v-if="parseOperand(inst.operand).type === 'account'"
                    :hash="parseOperand(inst.operand).address"
                    type="address"
                    :copyable="false"
                    :truncate="false"
                    class="inline-flex"
                  />
                  <span v-else-if="parseOperand(inst.operand).type === 'native'" class="text-mid font-normal">
                    {{ parseOperand(inst.operand).name || "Native" }}
                  </span>
                  <HashLink
                    v-else-if="parseOperand(inst.operand).type === 'tx'"
                    :hash="parseOperand(inst.operand).hash"
                    type="tx"
                    :copyable="false"
                    :truncate="false"
                    class="inline-flex"
                  />
                  <span class="text-mid font-normal">)</span>
                </span>
                <span v-else :class="operandClass(inst)">{{
                  inst.operand
                }}</span>
              </template>
              <span
                v-if="inst.semantic"
                class="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 dark:text-primary-400"
              >
                // Call:
                <HashLink
                  v-if="inst.semantic.startsWith('0x')"
                  :hash="inst.semantic.split('.')[0]"
                  type="contract"
                  :truncate="true"
                />
                <span v-else>{{ inst.semantic.split('.')[0] }}</span>
                <span>.{{ inst.semantic.split('.').slice(1).join('.') }}</span>
              </span>
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
import HashLink from "@/components/common/HashLink.vue";

const props = defineProps({
  /** Base64-encoded script */
  script: { type: String, default: "" },
  /** Display label */
  label: { type: String, default: "Script" },
});

function parseOperand(operandStr) {
  if (!operandStr) return null;

  // Try matching "0x... (Account: N...)" with optional line breaks/spaces.
  let m = operandStr.match(/^(0x[a-fA-F0-9]+)\s+\(Account:\s*(N[a-zA-Z0-9]+)\s*\)$/);
  if (m) return { type: 'account', hash: m[1], address: m[2] };

  // Try matching "0x... (Native: XXX)"
  m = operandStr.match(/^(0x[a-fA-F0-9]+)\s+\(Native:\s+([^)]+)\)$/);
  if (m) return { type: 'native', hash: m[1], name: m[2] };

  // Try matching "0x... (Contract)" or "0x... (Contract: Name)"
  m = operandStr.match(/^(0x[a-fA-F0-9]+)\s+\(Contract(?::\s*([^)]+))?\)$/);
  if (m) return { type: 'contract', hash: m[1], name: m[2] || null };
  
  // Backward compatibility: "0x... (Hash160)"
  m = operandStr.match(/^(0x[a-fA-F0-9]+)\s+\(Hash160\)$/);
  if (m) return { type: 'contract', hash: m[1], name: null };
  
  // Try matching "0x... (Hash256)"
  m = operandStr.match(/^(0x[a-fA-F0-9]+)\s+\(Hash256\)$/);
  if (m) return { type: 'tx', hash: m[1] };

  return null;
}

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
  if (inst.opcode === "SYSCALL") return "text-amber-600 dark:text-amber-400 font-semibold";
  if (inst.operand.startsWith('"')) return "text-emerald-600 dark:text-emerald-400";
  if (
    inst.operand.includes("Hash160") ||
    inst.operand.includes("Account:") ||
    inst.operand.includes("Native:")
  ) {
    return "text-blue-600 dark:text-blue-400 font-semibold";
  }
  return "";
}
</script>
