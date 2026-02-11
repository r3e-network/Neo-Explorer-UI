<template>
  <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
    <!-- Event header -->
    <div
      class="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600"
    >
      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold" :class="eventBadgeClass">
        {{ notification.eventName ?? "Unknown" }}
      </span>
      <HashLink
        v-if="notification.contract && notification.contract !== 'unknown'"
        :hash="notification.contract"
        type="contract"
      />
      <span v-if="contractName" class="text-xs text-gray-500 dark:text-gray-400">({{ contractName }})</span>
      <!-- Raw / Decoded toggle -->
      <button
        v-if="notification.rawState || decodedParams.length > 0"
        class="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
        :class="
          viewMode === 'raw'
            ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
        "
        @click="viewMode = viewMode === 'decoded' ? 'raw' : 'decoded'"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
        {{ viewMode === "raw" ? "Raw" : "Decoded" }}
      </button>
    </div>

    <div class="p-4">
      <!-- Raw JSON view -->
      <pre
        v-if="viewMode === 'raw' && notification.rawState"
        class="max-h-48 overflow-auto rounded bg-gray-50 dark:bg-gray-900 p-3 font-mono text-xs text-gray-600 dark:text-gray-400"
        >{{ formatRaw(notification.rawState) }}</pre
      >

      <!-- ABI-decoded parameter table -->
      <div v-else-if="decodedParams.length > 0" class="overflow-x-auto">
        <!-- TokenId badge for NEP-11 transfers -->
        <div
          v-if="notification.tokenId"
          class="mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
        >
          <span class="text-xs font-medium text-purple-700 dark:text-purple-300">Token ID:</span>
          <span class="text-xs font-mono text-purple-600 dark:text-purple-400" :title="notification.tokenId">
            {{ notification.tokenId.length > 32 ? notification.tokenId.slice(0, 32) + "…" : notification.tokenId }}
          </span>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-700">
              <th class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-8">#</th>
              <th
                v-if="hasParamNames"
                class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Name
              </th>
              <th class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
              <th class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Decoded Value</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-for="param in decodedParams" :key="param.index">
              <td class="px-2 py-2 text-xs text-gray-400">{{ param.index }}</td>
              <td v-if="hasParamNames" class="px-2 py-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                {{ param.name ?? "-" }}
              </td>
              <td class="px-2 py-2">
                <span class="inline-flex px-1.5 py-0.5 rounded text-xs" :class="typeBadgeClass(param.type)">
                  {{ param.type }}
                </span>
              </td>
              <td class="px-2 py-2 font-mono text-xs text-gray-700 dark:text-gray-300 max-w-xs">
                <!-- Hash160 as clickable address link with copy -->
                <span
                  v-if="param.type === 'Hash160' && param.decoded.decodedValue"
                  class="inline-flex items-center gap-1"
                >
                  <HashLink :hash="param.decoded.decodedValue" type="address" />
                  <CopyButton :text="param.decoded.decodedValue" size="sm" />
                </span>
                <!-- Integer with locale formatting -->
                <span v-else-if="param.type === 'Integer'" :title="param.decoded.rawValue">
                  {{ formatInteger(param.decoded.decodedValue) }}
                </span>
                <!-- ByteString with hex toggle -->
                <span v-else-if="param.type === 'ByteString'" class="inline-flex items-center gap-1.5">
                  <span class="truncate max-w-[200px]">{{
                    showHex[param.index]
                      ? toHexDisplay(param.decoded.rawValue) || param.decoded.displayValue
                      : param.decoded.displayValue
                  }}</span>
                  <button
                    v-if="param.decoded.rawValue"
                    class="text-primary-500 hover:text-primary-600 text-xs flex-shrink-0"
                    :title="showHex[param.index] ? 'Show decoded' : 'Show hex'"
                    @click="toggleHex(param.index)"
                  >
                    {{ showHex[param.index] ? "abc" : "0x" }}
                  </button>
                </span>
                <!-- Default -->
                <span v-else class="truncate block max-w-[200px]" :title="param.decoded.displayValue">
                  {{ param.decoded.displayValue }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div v-else class="text-sm text-gray-500 dark:text-gray-400 italic">No parameters</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from "vue";
import HashLink from "@/components/common/HashLink.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { base64ToHex } from "@/utils/neoCodec";

import { getContractDisplayName } from "@/utils/explorerFormat";

const props = defineProps({
  notification: { type: Object, required: true },
  eventDef: { type: Object, default: null },
});

const viewMode = ref("decoded");
const showHex = reactive({});

const decodedParams = computed(() => props.notification.decodedParams ?? []);
const hasParamNames = computed(() => decodedParams.value.some((p) => p.name));

const contractName = computed(() =>
  getContractDisplayName(props.notification.contract, props.notification.contractName)
);

const eventBadgeClass = computed(() => {
  const name = props.notification.eventName?.toLowerCase();
  if (name === "transfer") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (name === "approval") return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  if (name === "deploy") return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300";
  return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
});

function typeBadgeClass(type) {
  const map = {
    Integer: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    ByteString: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    Boolean: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    Hash160: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    Array: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
    Map: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  };
  return map[type] ?? "bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
}

function formatInteger(val) {
  const num = Number(val);
  if (Number.isFinite(num) && Math.abs(num) < Number.MAX_SAFE_INTEGER) {
    return num.toLocaleString();
  }
  return val;
}

function toHexDisplay(val) {
  if (!val) return null;
  return base64ToHex(val);
}

function toggleHex(index) {
  showHex[index] = !showHex[index];
}

function formatRaw(state) {
  try {
    return JSON.stringify(state, null, 2);
  } catch {
    return String(state);
  }
}
</script>
