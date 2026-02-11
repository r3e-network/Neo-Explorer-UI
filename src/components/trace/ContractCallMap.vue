<template>
  <div class="contract-call-map">
    <div v-if="!callTree || callTree.length === 0" class="text-sm text-gray-500 dark:text-gray-400 italic py-4">
      No contract calls to display
    </div>

    <div v-else class="space-y-6">
      <div v-for="(exec, ei) in callTree" :key="ei" class="execution-group">
        <!-- Execution header -->
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border"
            :class="vmStateClass(exec.vmState)"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="vmStateDot(exec.vmState)"></span>
            {{ exec.vmState }}
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400">Trigger: {{ exec.trigger }}</span>
          <span class="text-xs font-mono text-gray-500 dark:text-gray-400"
            >{{ formatGasDecimal(exec.gasConsumed) }} GAS</span
          >
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
                <div class="flex items-center gap-2">
                  <HashLink :hash="node.contract" type="contract" />
                  <span
                    v-if="node.contractName || getNodeName(node.contract)"
                    class="text-xs text-gray-500 dark:text-gray-400"
                  >
                    ({{ node.contractName || getNodeName(node.contract) }})
                  </span>
                  <span
                    v-if="node.events && node.events.length > 0"
                    class="ml-auto px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                  >
                    {{ node.events.length }} {{ node.events.length === 1 ? "event" : "events" }}
                  </span>
                </div>
              </div>

              <!-- Events list -->
              <div class="p-2 space-y-1.5">
                <div
                  v-for="(evt, evi) in node.events"
                  :key="evi"
                  class="event-badge flex items-center gap-1.5 px-2 py-1.5 rounded bg-gray-50 dark:bg-gray-700/30 text-xs"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    :class="evt.eventName?.toLowerCase() === 'transfer' ? 'bg-emerald-400' : 'bg-primary-400'"
                  ></span>
                  <span class="font-medium text-gray-700 dark:text-gray-300">
                    {{ evt.eventName }}
                  </span>
                  <!-- Compact transfer summary -->
                  <span
                    v-if="evt.eventName?.toLowerCase() === 'transfer' && getTransferSummary(evt)"
                    class="text-gray-500 dark:text-gray-400 truncate"
                  >
                    {{ getTransferSummary(evt) }}
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
import { scriptHashToAddress, isScriptHash } from "@/utils/neoCodec";
import {
  vmStateClass,
  vmStateDot,
  getContractDisplayName,
  truncateHash,
  formatGasDecimal,
} from "@/utils/explorerFormat";

const props = defineProps({
  callTree: {
    type: Array,
    required: true,
  },
  contractMetadata: {
    type: [Map, Object],
    default: null,
  },
});

function getNodeName(hash) {
  if (!props.contractMetadata) return null;
  const meta = props.contractMetadata instanceof Map ? props.contractMetadata.get(hash) : props.contractMetadata[hash];
  if (!meta) return getContractDisplayName(hash, null);
  return meta.name || null;
}

function getTransferSummary(evt) {
  // Enriched operation objects have from/to/amount directly
  if (evt.from !== undefined || evt.to !== undefined) {
    const from = evt.from ? truncateHash(evt.from, 6, 4) : "Mint";
    const to = evt.to ? truncateHash(evt.to, 6, 4) : "Burn";
    const amount = evt.amount ?? "?";
    const symbol = evt.tokenSymbol ? ` ${evt.tokenSymbol}` : "";
    return `${from} → ${amount}${symbol} → ${to}`;
  }
  // Fallback for raw notification objects (buildCallTree format)
  const state = evt.state;
  if (!state) return null;
  const params = state.value ?? (Array.isArray(state) ? state : []);
  if (params.length < 3) return null;
  const from = decodeCompact(params[0]);
  const to = decodeCompact(params[1]);
  const amount = params[2]?.value ?? "?";
  return `${from} → ${amount} → ${to}`;
}

function decodeCompact(param) {
  if (!param || !param.value) return "Mint";
  if (param.type === "ByteString") {
    if (isScriptHash(param.value)) {
      const addr = scriptHashToAddress(param.value);
      if (addr) return truncateHash(addr, 6, 4);
    }
    return truncateHash(param.value, 6, 4);
  }
  return String(param.value);
}
</script>
