<template>
  <div class="space-y-4">
    <div v-if="!manifest" class="py-8 text-center text-text-secondary dark:text-gray-400">
      Loading contract manifest...
    </div>
    <div v-else-if="!readMethods.length" class="py-8 text-center text-text-secondary dark:text-gray-400">
      No read-only (Safe) methods found in this contract.
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="(method, mIdx) in readMethods"
        :key="'rm-' + method.name"
        class="rounded-lg border border-card-border dark:border-card-border-dark"
      >
        <button
          class="flex w-full items-center justify-between p-4 text-left"
          :aria-label="`Toggle ${method.name} method details`"
          :aria-expanded="readMethodState[mIdx]?.open"
          @click="emit('toggleMethod', mIdx)"
        >
          <div class="flex items-center gap-2">
            <span
              class="flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            >
              {{ mIdx + 1 }}
            </span>
            <span class="font-mono text-sm font-medium text-text-primary dark:text-gray-100">
              {{ method.name }}
            </span>
          </div>
          <svg
            class="h-4 w-4 text-gray-400 transition-transform dark:text-gray-500"
            :class="{ 'rotate-180': readMethodState[mIdx]?.open }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          v-if="readMethodState[mIdx]?.open"
          class="border-t border-card-border px-4 pb-4 dark:border-card-border-dark"
        >
          <!-- Parameters -->
          <div v-if="method.parameters && method.parameters.length" class="mt-3 space-y-2">
            <ParamInput
              v-for="(param, pIdx) in method.parameters"
              :key="'rp-' + pIdx"
              :type="param.type"
              :name="param.name"
              :model-value="readMethodState[mIdx].params[pIdx] || ''"
              @update:model-value="emit('updateParam', mIdx, pIdx, $event)"
            />
          </div>
          <div v-else class="mt-3 text-xs text-text-secondary dark:text-gray-400">No parameters required.</div>
          <!-- Query button -->
          <button
            class="mt-3 inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="readMethodState[mIdx]?.loading"
            @click="emit('invokeMethod', mIdx, method)"
          >
            <svg v-if="readMethodState[mIdx]?.loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Query
          </button>
          <!-- Result -->
          <div
            v-if="readMethodState[mIdx]?.result !== undefined"
            class="mt-3 rounded-md border border-card-border bg-gray-50 p-3 dark:border-card-border-dark dark:bg-gray-800/40"
          >
            <div class="mb-2 flex items-center justify-between">
              <h5 class="text-xs font-semibold text-text-secondary dark:text-gray-400">Result:</h5>
              <button
                class="rounded px-2 py-0.5 text-[10px] font-medium transition-colors"
                :class="
                  showRaw[mIdx]
                    ? 'bg-gray-200 dark:bg-gray-700 text-text-primary dark:text-gray-200'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                "
                @click="showRaw[mIdx] = !showRaw[mIdx]"
              >
                {{ showRaw[mIdx] ? "Decoded" : "Raw" }}
              </button>
            </div>
            <!-- Raw view -->
            <pre
              v-if="showRaw[mIdx]"
              class="max-h-48 overflow-auto font-mono text-xs text-text-primary dark:text-gray-200"
              >{{ formatRaw(readMethodState[mIdx].result) }}</pre
            >
            <!-- Decoded view -->
            <div v-else class="space-y-1">
              <div
                v-for="(item, sIdx) in getDecoded(readMethodState[mIdx].result).stack"
                :key="sIdx"
                class="flex items-start gap-2"
              >
                <span
                  class="mt-0.5 shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  {{ item.type }}
                </span>
                <span class="break-all font-mono text-xs text-text-primary dark:text-gray-200">
                  {{ formatDecodedValue(item) }}
                </span>
              </div>
              <p
                v-if="getDecoded(readMethodState[mIdx].result).stack.length === 0"
                class="text-xs text-text-secondary dark:text-gray-400"
              >
                (empty result)
              </p>
            </div>
          </div>
          <!-- Error -->
          <div
            v-if="readMethodState[mIdx]?.error"
            class="mt-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
          >
            <p class="text-xs text-red-600 dark:text-red-400">{{ readMethodState[mIdx].error }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { decodeInvokeResult } from "@/utils/resultDecoder";
import ParamInput from "@/components/contract/ContractParamInput.vue";

defineProps({
  readMethods: { type: Array, required: true },
  readMethodState: { type: Array, required: true },
  manifest: { type: Object, default: null },
});

const emit = defineEmits(["toggleMethod", "invokeMethod", "updateParam"]);
const showRaw = ref({});

function getDecoded(result) {
  return decodeInvokeResult(result);
}

function formatDecodedValue(item) {
  if (item.type === "Array")
    return JSON.stringify(
      item.value.map((i) => i.value),
      null,
      2
    );
  if (item.type === "Map")
    return JSON.stringify(
      item.value.map((e) => [e.key.value, e.value.value]),
      null,
      2
    );
  return String(item.value ?? "null");
}

function formatRaw(result) {
  if (result === null || result === undefined) return "null";
  if (typeof result === "string") return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}
</script>
