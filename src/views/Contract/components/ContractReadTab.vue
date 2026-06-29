<template>
  <div class="space-y-4">
    <div v-if="!manifest" class="panel-muted text-mid px-4 py-8 text-center text-sm">
      {{ $t("contractDetail.readLoadingManifest") }}
    </div>
    <div v-else-if="!readMethods.length" class="panel-muted text-mid px-4 py-8 text-center text-sm">
      {{ $t("contractDetail.readNoMethods") }}
    </div>
    <div v-else class="space-y-3">
      <section v-if="autoReadableMethods.length" class="surface-panel overflow-hidden rounded-xl">
        <header class="soft-divider border-b px-4 py-3">
          <h4 class="text-high text-sm font-semibold">{{ $t("contractDetail.readCurrentValuesTitle") }}</h4>
          <p class="text-mid mt-1 text-xs">{{ $t("contractDetail.readCurrentValuesDescription") }}</p>
        </header>
        <div class="divide-y soft-divider">
          <div
            v-for="method in autoReadableMethods"
            :key="'auto-' + method.name"
            data-test="auto-read-row"
            class="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-high font-mono text-sm font-medium">{{ method.name }}</span>
                <span class="badge-soft rounded px-2 py-0.5 text-[10px] font-semibold">
                  {{ method.returntype || "Any" }}
                </span>
              </div>
              <div class="mt-1 min-h-[1.25rem]">
                <span v-if="autoReadState[method.name]?.loading" class="text-mid text-xs">
                  {{ $t("contractDetail.readCurrentValueLoading") }}
                </span>
                <span v-else-if="autoReadState[method.name]?.error" class="text-xs text-red-600 dark:text-red-400">
                  {{ autoReadState[method.name].error }}
                </span>
                <span v-else-if="autoReadState[method.name]?.result" class="text-high break-all font-mono text-xs">
                  {{ formatAutoReadValue(autoReadState[method.name].result) }}
                </span>
                <span v-else class="text-mid text-xs">{{ $t("contractDetail.readCurrentValuePending") }}</span>
              </div>
            </div>
            <button
              type="button"
              data-test="refresh-auto-read"
              class="btn-outline inline-flex h-8 w-8 shrink-0 items-center justify-center p-0"
              :disabled="autoReadState[method.name]?.loading"
              :aria-label="$t('contractDetail.readRefreshValueAria', { name: method.name })"
              @click="emit('refreshAutoRead', method.name)"
            >
              <svg
                aria-hidden="true"
                class="h-4 w-4"
                :class="{ 'animate-spin': autoReadState[method.name]?.loading }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 006.3 4.7L4 10m16 4l-2.3 5.3A8 8 0 014 15" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <div
        v-for="(method, mIdx) in readMethods"
        :key="'rm-' + method.name"
        class="surface-panel overflow-hidden rounded-xl"
      >
        <button
          type="button"
          class="list-row flex w-full items-center justify-between p-4 text-left transition-colors"
          :aria-label="$t('contractDetail.readToggleAria', { name: method.name })"
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
        <div v-if="readMethodState[mIdx]?.open" class="border-t px-4 pb-4 soft-divider">
          <!-- Parameters -->
          <div v-if="method.parameters && method.parameters.length" class="mt-3 space-y-2">
            <ParamInput
              v-for="(param, pIdx) in method.parameters"
              :key="'rp-' + param.name"
              :type="param.type"
              :name="param.name"
              :model-value="readMethodState[mIdx].params[pIdx] || ''"
              @update:model-value="emit('updateParam', mIdx, pIdx, $event)"
            />
          </div>
          <div v-else class="text-mid mt-3 text-xs">{{ $t("contractDetail.readNoParams") }}</div>
          <!-- Query button -->
          <button
            type="button"
            class="btn-primary mt-3 gap-2"
            :disabled="readMethodState[mIdx]?.loading"
            :aria-label="$t('contractDetail.readQueryAria', { name: method.name })"
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
            <span v-if="readMethodState[mIdx]?.loading" class="sr-only">{{ $t("contractDetail.readLoading") }}</span>
            {{ $t("contractDetail.readQueryButton") }}
          </button>
          <!-- Result -->
          <div
            v-if="readMethodState[mIdx]?.result !== undefined"
            class="panel-muted mt-3 p-3"
            role="status"
            aria-live="polite"
          >
            <div class="mb-2 flex items-center justify-between">
              <h5 class="text-mid text-xs font-semibold">{{ $t("contractDetail.readResultLabel") }}</h5>
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
                {{ showRaw[mIdx] ? $t("contractDetail.readToggleDecoded") : $t("contractDetail.readToggleRaw") }}
              </button>
            </div>
            <!-- Raw view -->
            <pre v-if="showRaw[mIdx]" class="text-high max-h-48 overflow-auto font-mono text-xs">{{
              formatRaw(readMethodState[mIdx].result)
            }}</pre>
            <!-- Decoded view -->
            <div v-else class="space-y-1">
              <div
                v-for="(item, sIdx) in getDecoded(readMethodState[mIdx].result).stack"
                :key="'stack-' + sIdx + '-' + (item.type || '')"
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
              <p v-if="getDecoded(readMethodState[mIdx].result).stack.length === 0" class="text-mid text-xs">
                {{ $t("contractDetail.readEmptyResult") }}
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
import { computed, ref } from "vue";
import { decodeInvokeResult } from "@/utils/resultDecoder";
import ParamInput from "@/components/contract/ContractParamInput.vue";

const props = defineProps({
  readMethods: { type: Array, required: true },
  readMethodState: { type: Array, required: true },
  manifest: { type: Object, default: null },
  autoReadState: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["toggleMethod", "invokeMethod", "updateParam", "refreshAutoRead"]);
const showRaw = ref({});

const autoReadableMethods = computed(() =>
  props.readMethods.filter((method) => Array.isArray(method.parameters) ? method.parameters.length === 0 : true),
);

function getDecoded(result) {
  return decodeInvokeResult(result);
}

function formatDecodedValue(item) {
  if (item.type === "Array")
    return JSON.stringify(
      item.value.map((i) => i.value),
      null,
      2,
    );
  if (item.type === "Map")
    return JSON.stringify(
      item.value.map((e) => [e.key.value, e.value.value]),
      null,
      2,
    );
  return String(item.value ?? "null");
}

function formatAutoReadValue(result) {
  const decoded = getDecoded(result);
  const first = decoded.stack[0];
  if (!first) return decoded.state || "—";
  return formatDecodedValue(first);
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
