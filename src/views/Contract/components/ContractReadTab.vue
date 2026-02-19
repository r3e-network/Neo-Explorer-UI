<template>
  <div class="space-y-4">
    <div v-if="!manifest" class="panel-muted text-mid px-4 py-8 text-center text-sm">
      Loading contract manifest...
    </div>
    <div v-else-if="!readMethods.length" class="panel-muted text-mid px-4 py-8 text-center text-sm">
      No read-only (Safe) methods found in this contract.
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="(method, mIdx) in readMethods"
        :key="'rm-' + method.name"
        class="surface-panel overflow-hidden rounded-xl"
      >
        <button
          type="button"
          class="list-row flex w-full items-center justify-between p-4 text-left transition-colors"
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
            <span class="text-high font-mono text-sm font-medium">
              {{ method.name }}
            </span>
          </div>
          <svg
            class="text-low h-4 w-4 transition-transform"
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
          class="border-t px-4 pb-4 soft-divider"
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
          <div v-else class="text-mid mt-3 text-xs">No parameters required.</div>
          <!-- Query button -->
          <button
            type="button"
            class="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="readMethodState[mIdx]?.loading"
            :aria-label="`Query ${method.name}`"
            @click="emit('invokeMethod', mIdx, method)"
          >
            <svg
              v-if="readMethodState[mIdx]?.loading"
              aria-hidden="true"
              class="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span v-if="readMethodState[mIdx]?.loading" class="sr-only">Loading</span>
            Query
          </button>
          <!-- Result -->
          <div
            v-if="readMethodState[mIdx]?.result !== undefined"
            class="panel-muted mt-3 p-3"
            role="status"
            aria-live="polite"
          >
            <div class="mb-2 flex items-center justify-between">
              <h5 class="text-mid text-xs font-semibold">Result:</h5>
              <button
                type="button"
                class="rounded px-2 py-0.5 text-[10px] font-medium transition-colors"
                :aria-pressed="!!showRaw[mIdx]"
                :class="
                  showRaw[mIdx]
                    ? 'badge-soft text-high'
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
              class="text-high max-h-48 overflow-auto font-mono text-xs"
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
                <span class="text-high break-all font-mono text-xs">
                  {{ formatDecodedValue(item) }}
                </span>
              </div>
              <p
                v-if="getDecoded(readMethodState[mIdx].result).stack.length === 0"
                class="text-mid text-xs"
              >
                (empty result)
              </p>
            </div>
          </div>
          <!-- Error -->
          <div
            v-if="readMethodState[mIdx]?.error"
            class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
            role="alert"
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
