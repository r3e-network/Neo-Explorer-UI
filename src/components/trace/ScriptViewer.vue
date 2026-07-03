<template>
  <div class="script-viewer text-high">
    <!-- Header with toggle -->
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-semibold text-high dark:text-slate-200">
        {{ label }}
      </h4>
      <div class="flex items-center gap-2">
        <button
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          :class="
            showRaw
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
              : 'border border-line-soft bg-surface text-mid hover:bg-surface-muted hover:text-high dark:border-white/10 dark:bg-surface-elevated dark:text-slate-400 dark:hover:text-slate-200'
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
          {{ showRaw ? $t("unsignedTx.decodedToggle") : $t("unsignedTx.rawHexToggle") }}
        </button>
        <CopyButton :text="rawHex" />
      </div>
    </div>

    <!-- Raw hex view -->
    <pre
      v-if="showRaw"
      class="max-h-48 overflow-auto rounded-lg break-all whitespace-pre-wrap border border-line-soft bg-surface p-3 font-mono text-xs text-high shadow-inner dark:border-white/5 dark:bg-[#020617] dark:text-slate-400"
      >{{ rawHex }}</pre
    >

    <!-- Decoded opcodes table -->
    <div
      v-else
      class="overflow-x-auto rounded-lg border border-line-soft bg-surface shadow-inner dark:border-white/10 dark:bg-[#020617]"
    >
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-line-soft bg-surface-muted/70 dark:border-white/10 dark:bg-white/5">
            <th scope="col" class="w-16 px-3 py-2 text-left font-medium text-low dark:text-slate-400">{{ $t("unsignedTx.colOffset") }}</th>
            <th scope="col" class="w-32 px-3 py-2 text-left font-medium text-low dark:text-slate-400">{{ $t("unsignedTx.colOpcode") }}</th>
            <th scope="col" class="px-3 py-2 text-left font-medium text-low dark:text-slate-400">{{ $t("unsignedTx.colOperand") }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line-soft dark:divide-white/5">
          <tr
            v-for="(inst, idx) in visibleInstructions"
            :key="idx"
            class="group transition-colors hover:bg-surface-muted/50 dark:hover:bg-white/[0.02]"
          >
            <td class="px-3 py-1.5 font-mono text-low dark:text-slate-500">
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
            <td class="break-all px-3 py-1.5 font-mono text-high dark:text-slate-300">
              <template v-if="inst.operand">
                <span v-if="parseOperand(inst.operand)" :class="operandClass(inst)">
                  {{ parseOperand(inst.operand).hash }}
                  <span class="text-slate-500 font-normal">(</span>
                  <span v-if="parseOperand(inst.operand).type === 'account'" class="text-slate-500 font-normal">Account: </span>
                  <span v-else-if="parseOperand(inst.operand).type === 'native'" class="text-slate-500 font-normal">Native: </span>
                  <span v-else-if="parseOperand(inst.operand).type === 'contract'" class="text-slate-500 font-normal">Contract</span>
                  <span v-else-if="parseOperand(inst.operand).type === 'tx'" class="text-slate-500 font-normal">Hash256: </span>
                  <HashLink
                    v-if="parseOperand(inst.operand).type === 'account'"
                    :hash="parseOperand(inst.operand).address"
                    type="address"
                    :copyable="false"
                    :truncate="false"
                    class="inline-flex text-high hover:text-primary-700 dark:text-slate-300 dark:hover:text-white"
                  />
                  <span v-else-if="parseOperand(inst.operand).type === 'native'" class="font-normal text-high dark:text-slate-300">
                    {{ parseOperand(inst.operand).name || "Native" }}
                  </span>
                  <HashLink
                    v-else-if="parseOperand(inst.operand).type === 'tx'"
                    :hash="parseOperand(inst.operand).hash"
                    type="tx"
                    :copyable="false"
                    :truncate="false"
                    class="inline-flex text-high hover:text-primary-700 dark:text-slate-300 dark:hover:text-white"
                  />
                  <span class="text-slate-500 font-normal">)</span>
                </span>
                <span v-else :class="operandClass(inst)">{{ inst.operand }}</span>
              </template>
              <span
                v-if="inst.semantic"
                class="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary-400"
              >
                // Call:
                <HashLink
                  v-if="inst.semantic.startsWith('0x')"
                  :hash="inst.semantic.split('.')[0]"
                  type="contract"
                  :truncate="true"
                  class="text-primary-400 hover:text-primary-300"
                />
                <span v-else>{{ inst.semantic.split('.')[0] }}</span>
                <span>.{{ inst.semantic.split('.').slice(1).join('.') }}</span>
              </span>
              <span
                v-if="inst.annotationLabel && inst.annotationValue"
                class="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary-400"
              >
                // {{ inst.annotationLabel }}:
                <span>{{ inst.annotationValue }}</span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Show more -->
      <button
        v-if="instructions.length > maxVisible && !showAllOps"
        class="w-full border-t border-line-soft py-2 text-xs font-medium text-primary-600 transition-colors hover:bg-surface-muted/60 dark:border-white/10 dark:text-primary-400 dark:hover:bg-white/5"
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
  if (opcode.startsWith("PUSH")) return "text-primary-600 dark:text-primary-400";
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
  if (!inst.operand) return "";
  if (inst.operand.startsWith('"')) return "text-emerald-600 dark:text-emerald-400";
  if (
    inst.operand.includes("Hash160") ||
    inst.operand.includes("Account:") ||
    inst.operand.includes("Native:")
  ) {
    return "text-primary-600 dark:text-primary-400 font-semibold";
  }
  return "";
}
</script>
