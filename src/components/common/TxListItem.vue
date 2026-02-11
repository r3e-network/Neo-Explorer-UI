<template>
  <div
    class="border-b border-card-border px-4 py-3 transition-colors hover:bg-gray-50 dark:border-card-border-dark dark:hover:bg-gray-800/60"
  >
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <!-- Tx circle icon -->
        <div
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
          :class="iconClass"
        >
          Tx
        </div>
        <div class="min-w-0">
          <HashLink :hash="tx.hash" type="tx" :copyable="false" />
          <p class="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
            {{ formatAge(tx.blocktime) }}
          </p>
        </div>
      </div>

      <!-- From -> To (hidden on mobile) -->
      <div class="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
        <div class="min-w-0 text-right">
          <p class="text-xs text-text-secondary dark:text-gray-400">From</p>
          <HashLink v-if="tx.sender" :hash="tx.sender" type="address" :copyable="false" />
        </div>
        <svg class="h-4 w-4 flex-shrink-0 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
        <div class="min-w-0 text-left">
          <p class="text-xs text-text-secondary dark:text-gray-400">To</p>
          <HashLink v-if="toAddress" :hash="toAddress" type="address" :copyable="false" />
          <span v-else class="text-sm text-text-muted">Contract Call</span>
        </div>
      </div>

      <!-- Status + Fee -->
      <div class="flex-shrink-0 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <span
            v-if="isComplex"
            class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Complex
          </span>
          <span :class="statusBadgeClass" class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
            {{ statusText }}
          </span>
        </div>
        <p class="mt-1 text-xs text-text-secondary dark:text-gray-400">{{ txFee }} GAS</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { formatAge, formatGas } from "@/utils/explorerFormat";
import HashLink from "./HashLink.vue";

const props = defineProps({
  tx: { type: Object, default: () => ({}) },
  isComplex: { type: Boolean, default: false },
});

const isSuccess = computed(() => {
  const state = props.tx?.vmstate;
  return state === "HALT" || state === undefined || state === null;
});

const iconClass = computed(() =>
  isSuccess.value
    ? "bg-green-100 text-success dark:bg-green-900/30 dark:text-green-300"
    : "bg-red-100 text-error dark:bg-red-900/30 dark:text-red-300"
);

const statusBadgeClass = computed(() =>
  isSuccess.value
    ? "bg-green-100 text-success dark:bg-green-900/30 dark:text-green-300"
    : "bg-red-100 text-error dark:bg-red-900/30 dark:text-red-300"
);

const statusText = computed(() => (isSuccess.value ? "Success" : "Failed"));

const toAddress = computed(() => props.tx?.contractHash || props.tx?.to || "");

const txFee = computed(() => {
  const fee = props.tx?.netfee || props.tx?.sysfee || 0;
  return formatGas(fee, 4);
});
</script>
