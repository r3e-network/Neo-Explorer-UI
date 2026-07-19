<template>
  <div>
    <div v-if="loading" class="space-y-3">
      <Skeleton width="40%" height="24px" />
      <Skeleton v-for="i in 5" :key="i" height="32px" />
    </div>

    <ErrorState
      v-else-if="error"
      :title="tf('errors.loadFailed', 'Failed to load data.')"
      :message="tf('neoX.loadContractError', 'Unable to load contract details.')"
      @retry="load"
    />

    <template v-else-if="contract && contract.is_verified">
      <!-- Verification metadata strip -->
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <span
          class="inline-flex items-center gap-1 rounded bg-status-success-bg px-2 py-0.5 text-xs font-semibold text-status-success"
        >
          <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          {{ tf("neoX.verified", "Verified") }}
        </span>
        <span v-if="contract.language" class="badge-soft capitalize">{{ contract.language }}</span>
        <span v-if="contract.compiler_version" class="badge-soft">{{ contract.compiler_version }}</span>
        <span v-if="contract.evm_version" class="badge-soft">EVM: {{ contract.evm_version }}</span>
        <span class="badge-soft">
          {{
            contract.optimization_enabled
              ? tf("neoX.optimizationRuns", "Optimization:") + " " + (contract.optimization_runs ?? "—")
              : tf("neoX.noOptimization", "No optimization")
          }}
        </span>
        <span v-if="verifiedAtDisplay" class="badge-soft">
          {{ tf("neoX.verifiedAt", "Verified") }} {{ verifiedAtDisplay }}
        </span>
      </div>

      <!-- Source files -->
      <div class="space-y-3">
        <CollapsibleSection
          v-if="contract.source_code"
          :title="contract.file_path || tf('neoX.contractSource', 'Contract Source')"
          :default-open="true"
        >
          <div class="p-4">
            <div class="mb-2 flex justify-end">
              <CopyButton :text="contract.source_code" size="sm" />
            </div>
            <pre class="panel-muted overflow-x-auto whitespace-pre rounded-lg p-4 text-xs font-hash">{{ contract.source_code }}</pre>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          v-for="(source, i) in additionalSources"
          :key="source.file_path || i"
          :title="source.file_path || tf('neoX.contractSource', 'Contract Source')"
        >
          <div class="p-4">
            <div class="mb-2 flex justify-end">
              <CopyButton :text="source.source_code || ''" size="sm" />
            </div>
            <pre class="panel-muted overflow-x-auto whitespace-pre rounded-lg p-4 text-xs font-hash">{{ source.source_code }}</pre>
          </div>
        </CollapsibleSection>

        <!-- ABI -->
        <CollapsibleSection v-if="abiJson" :title="tf('neoX.contractAbi', 'ABI')">
          <div class="p-4">
            <div class="mb-2 flex justify-end">
              <CopyButton :text="abiJson" size="sm" />
            </div>
            <pre class="panel-muted overflow-x-auto whitespace-pre rounded-lg p-4 text-xs font-hash">{{ abiJson }}</pre>
          </div>
        </CollapsibleSection>
      </div>
    </template>

    <template v-else>
      <EmptyState :message="tf('neoX.contractNotVerified', 'Contract not verified')" icon="contract" />
      <div v-if="contract && contract.deployed_bytecode" class="mt-4">
        <CollapsibleSection :title="tf('neoX.deployedBytecode', 'Deployed Bytecode')">
          <div class="p-4">
            <div class="mb-2 flex justify-end">
              <CopyButton :text="contract.deployed_bytecode" size="sm" />
            </div>
            <pre class="panel-muted overflow-x-auto whitespace-pre-wrap break-all rounded-lg p-4 text-xs font-hash">{{ contract.deployed_bytecode }}</pre>
          </div>
        </CollapsibleSection>
      </div>
    </template>

    <!-- Bytecode disassembly (verified + unverified) — lazy: only disassembled on first open -->
    <div
      v-if="!loading && !error && contract && contract.deployed_bytecode"
      class="mt-3"
      @click.capture="ensureDisasm"
    >
      <CollapsibleSection :title="tf('neoX.bytecodeDisassembly', 'Bytecode Disassembly')">
        <template #title-suffix>
          <span v-if="disasm && !disasm.error" class="ml-1.5 text-sm font-normal text-mid">
            ({{ formatInt(disasm.instructions.length) }} {{ tf("neoX.instructions", "instructions") }} ·
            {{ formatInt(disasm.byteLength) }} {{ tf("neoX.bytes", "bytes") }})
          </span>
        </template>
        <div class="p-4">
          <p v-if="disasm && disasm.error" class="text-xs text-status-error">{{ disasm.error }}</p>
          <template v-else-if="disasm">
            <div class="panel-muted max-h-[480px] overflow-y-auto rounded-lg">
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
          </template>
        </div>
      </CollapsibleSection>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { contractService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import CollapsibleSection from "@/components/common/CollapsibleSection.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { formatInt } from "@/utils/neoxFormat";
import { disassemble } from "@/utils/evmDisasm";

const props = defineProps({
  address: { type: String, required: true },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const contract = ref(null);
const loading = ref(false);
const error = ref(false);
const disasm = ref(null);
let reqId = 0;

// Deferred so a large contract never blocks the tab render: the bytecode is
// only disassembled the first time the collapsible section is interacted with.
function ensureDisasm() {
  if (disasm.value) return;
  const bytecode = contract.value?.deployed_bytecode;
  if (!bytecode) return;
  disasm.value = disassemble(bytecode, { maxInstructions: 4096 });
}

async function load() {
  const current = ++reqId;
  loading.value = true;
  error.value = false;
  disasm.value = null;
  try {
    const data = await contractService.getSmartContract(props.address, { net: getNeoxNet() });
    if (current !== reqId) return;
    contract.value = data;
  } catch (_err) {
    if (current === reqId) error.value = true;
  } finally {
    if (current === reqId) loading.value = false;
  }
}

const additionalSources = computed(() =>
  Array.isArray(contract.value?.additional_sources) ? contract.value.additional_sources : []
);

const abiJson = computed(() => {
  const abi = contract.value?.abi;
  if (!abi) return "";
  try {
    return JSON.stringify(abi, null, 2);
  } catch (_err) {
    return "";
  }
});

const verifiedAtDisplay = computed(() => {
  const raw = contract.value?.verified_at;
  if (!raw) return "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleDateString() : "";
});

watch(
  () => props.address,
  () => load()
);

onMounted(load);
useNetworkChange(load);
</script>
