<template>
  <div>
    <!-- Header row: copy (non-raw modes) + mode switcher, right-aligned -->
    <div class="mb-3 flex flex-wrap items-center justify-end gap-2">
      <CopyButton v-if="mode !== 'raw'" :text="rawInput || '0x'" size="sm" />
      <div class="flex items-center gap-1" role="group" :aria-label="tf('neoX.rawInputView', 'Raw input view mode')">
        <button
          v-for="m in modes"
          :key="m.key"
          type="button"
          class="tab-btn"
          :class="mode === m.key ? 'tab-btn-active' : 'tab-btn-inactive'"
          :aria-pressed="mode === m.key ? 'true' : 'false'"
          @click="mode = m.key"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <!-- Calldata-is-data note: only when disassembling a normal (non-creation) input -->
    <p v-if="!isCreation && mode === 'opcodes'" class="mb-2 text-xs text-low">
      {{
        tf(
          "neoX.calldataNotCode",
          "This input is calldata (data, not code) — the disassembly below is shown for inspection only."
        )
      }}
    </p>

    <!-- Raw -->
    <template v-if="mode === 'raw'">
      <div class="panel-muted relative rounded-lg p-4">
        <div class="absolute right-2 top-2">
          <CopyButton :text="rawInput || '0x'" size="sm" />
        </div>
        <div class="block whitespace-pre-wrap break-all pr-8 font-hash text-xs">{{ rawInput || "0x" }}</div>
      </div>
      <p class="mt-2 text-xs text-low">{{ formatInt(byteSize) }} {{ tf("neoX.bytes", "bytes") }}</p>
    </template>

    <!-- Calldata -->
    <template v-else-if="mode === 'calldata'">
      <EmptyState v-if="byteSize === 0" :message="tf('neoX.emptyInput', 'No input data')" />
      <p v-else-if="calldata.error" class="text-xs text-status-error">{{ calldata.error }}</p>
      <div v-else>
        <div v-if="calldata.selector" class="mb-3 flex flex-wrap items-center gap-2">
          <span class="badge-soft">{{ tf("neoX.selector", "selector") }}</span>
          <span class="font-hash text-sm text-high">{{ calldata.selector }}</span>
          <span v-if="selectorMatchesMethodId" class="text-xs text-low">
            ({{ tf("neoX.matchesDecodedMethod", "matches decoded method_id") }})
          </span>
        </div>
        <div v-if="calldata.words.length || calldata.remainder" class="overflow-x-auto">
          <table class="w-full">
            <thead class="table-head">
              <tr>
                <th scope="col" class="table-header-cell">#</th>
                <th scope="col" class="table-header-cell">{{ tf("neoX.offset", "Offset") }}</th>
                <th scope="col" class="table-header-cell">{{ tf("neoX.word", "Word") }}</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="word in calldata.words" :key="word.index" class="list-row">
                <td class="table-cell text-low">{{ word.index }}</td>
                <td class="table-cell font-hash text-low">{{ word.offset }}</td>
                <td class="table-cell-mono break-all">{{ word.hex }}</td>
              </tr>
              <tr v-if="calldata.remainder" class="list-row">
                <td class="table-cell text-low">—</td>
                <td class="table-cell font-hash text-low">{{ tf("neoX.remainder", "remainder") }}</td>
                <td class="table-cell-mono break-all">{{ calldata.remainder }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-xs text-low">{{ formatInt(calldata.byteLength) }} {{ tf("neoX.bytes", "bytes") }}</p>
      </div>
    </template>

    <!-- UTF-8 (etherscan "View Input As → UTF-8": full input decoded verbatim, selector included) -->
    <template v-else-if="mode === 'utf8'">
      <EmptyState v-if="byteSize === 0" :message="tf('neoX.emptyInput', 'No input data')" />
      <div v-else>
        <div class="panel-muted relative rounded-lg p-4">
          <div class="absolute right-2 top-2">
            <CopyButton :text="utf8Text" size="sm" />
          </div>
          <div class="block whitespace-pre-wrap break-all pr-8 font-hash text-xs">{{ utf8Text }}</div>
        </div>
        <p class="mt-2 text-xs text-low">
          {{
            tf(
              "neoX.utf8Note",
              "Lossy view: bytes that are not valid UTF-8 are shown as replacement characters."
            )
          }}
        </p>
      </div>
    </template>

    <!-- Opcodes -->
    <template v-else>
      <EmptyState v-if="byteSize === 0" :message="tf('neoX.emptyInput', 'No input data')" />
      <p v-else-if="disasm.error" class="text-xs text-status-error">{{ disasm.error }}</p>
      <div v-else>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="table-head">
              <tr>
                <th scope="col" class="table-header-cell">{{ tf("neoX.offset", "Offset") }}</th>
                <th scope="col" class="table-header-cell">{{ tf("neoX.opcode", "Opcode") }}</th>
                <th scope="col" class="table-header-cell">{{ tf("neoX.pushData", "Push data") }}</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="inst in disasm.instructions" :key="inst.offset" class="list-row">
                <td class="table-cell font-hash text-low">{{ inst.hexOffset }}</td>
                <td
                  class="table-cell whitespace-nowrap font-semibold"
                  :class="inst.unknown || inst.opcode === 'INVALID' ? 'text-status-error' : 'text-high'"
                >
                  {{ inst.opcode }}
                </td>
                <td class="table-cell font-hash break-all text-mid">{{ inst.push || "" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="disasm.truncatedOutput" class="mt-2 text-xs text-low">
          {{ tf("neoX.showingFirst", "Showing first") }} {{ formatInt(disasm.instructions.length) }}
          {{ tf("neoX.instructions", "instructions") }}
        </p>
        <p class="mt-2 text-xs text-low">{{ formatInt(disasm.byteLength) }} {{ tf("neoX.bytes", "bytes") }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import CopyButton from "@/components/common/CopyButton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import { formatInt } from "@/utils/neoxFormat";
import { disassemble, parseCalldata, hexToUtf8 } from "@/utils/evmDisasm";

const props = defineProps({
  rawInput: { type: String, default: "" },
  // True when the tx has no "to" address (contract creation): the input IS init code.
  isCreation: { type: Boolean, default: false },
  // Optional decoded 4-byte method id (from Blockscout decoded_input), with or without 0x.
  methodId: { type: String, default: null },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

// Init code disassembles meaningfully; normal calldata is ABI-encoded data.
const mode = ref(props.isCreation ? "opcodes" : "calldata");

const modes = computed(() => [
  { key: "raw", label: tf("neoX.rawMode", "Raw") },
  { key: "calldata", label: tf("neoX.calldataMode", "Calldata") },
  { key: "opcodes", label: tf("neoX.opcodesMode", "Opcodes") },
  { key: "utf8", label: tf("neoX.utf8Mode", "UTF-8") },
]);

const byteSize = computed(() => {
  const hex = String(props.rawInput || "").replace(/^0x/i, "");
  return Math.ceil(hex.length / 2);
});

const calldata = computed(() => parseCalldata(props.rawInput));

const utf8Text = computed(() => hexToUtf8(props.rawInput));

const disasm = computed(() => disassemble(props.rawInput, { maxInstructions: 4096 }));

const selectorMatchesMethodId = computed(() => {
  const mid = String(props.methodId || "")
    .replace(/^0x/i, "")
    .toLowerCase();
  const sel = String(calldata.value.selector || "")
    .replace(/^0x/i, "")
    .toLowerCase();
  return Boolean(mid) && mid === sel;
});
</script>
