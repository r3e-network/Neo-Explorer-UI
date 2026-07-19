<template>
  <div class="list-row min-h-[64px] border-b px-4 py-3">
    <div class="flex items-center justify-between gap-4">
      <!-- Hash + live age -->
      <div class="flex min-w-0 items-center gap-3">
        <div
          class="bg-icon-primary text-primary-500 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
        >
          Tx
        </div>
        <div class="min-w-0">
          <div class="flex min-w-0 items-center gap-1.5">
            <XHashLink type="tx" :hash="tx.hash" />
            <span v-if="tx.method" class="badge-soft hidden max-w-[110px] truncate text-[10px] sm:inline-block" :title="tx.method">
              {{ tx.method }}
            </span>
          </div>
          <p class="mt-0.5 text-xs text-mid">{{ age }}</p>
        </div>
      </div>

      <!-- From -> To (hidden on mobile); per-slot flex-1 min-w-0 keeps two
           long addresses truncating instead of overflowing. -->
      <div class="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
        <div class="min-w-0 flex-1 basis-0 text-right">
          <p class="text-xs text-mid">{{ tf("neoX.from", "From") }}</p>
          <XHashLink v-if="tx.sender" type="address" :hash="tx.sender" :name="tx.fromInfo?.name || ''" />
          <span v-else class="text-sm text-low">--</span>
        </div>
        <svg class="h-4 w-4 flex-shrink-0 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
        <div class="min-w-0 flex-1 basis-0 text-left">
          <p class="text-xs text-mid">{{ tf("neoX.to", "To") }}</p>
          <XHashLink v-if="tx.to" type="address" :hash="tx.to" :name="tx.toInfo?.name || ''" />
          <XHashLink
            v-else-if="tx.createdContract?.hash"
            type="address"
            :hash="tx.createdContract.hash"
            :name="tx.createdContract.name || tf('neoX.contractCreation', 'Contract creation')"
          />
          <span v-else class="text-sm text-low">--</span>
        </div>
      </div>

      <!-- Status + value/fee -->
      <div class="flex-shrink-0 text-right">
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          :class="statusClass"
        >
          {{ statusText }}
        </span>
        <p class="mt-1 text-xs text-mid">
          <template v-if="hasValue">{{ formatGas(tx.value) }} GAS</template>
          <template v-else>{{ formatGas(tx.fee) }} GAS</template>
        </p>
      </div>
    </div>

    <!-- Mobile detail grid -->
    <div class="mt-3 grid grid-cols-2 gap-2 md:hidden">
      <div class="min-w-0 rounded bg-surface-glass px-3 py-2">
        <p class="text-[10px] uppercase text-low">{{ tf("neoX.from", "From") }}</p>
        <div class="mt-1 min-w-0 text-sm font-medium">
          <XHashLink v-if="tx.sender" type="address" :hash="tx.sender" :name="tx.fromInfo?.name || ''" />
          <span v-else class="text-low">--</span>
        </div>
      </div>
      <div class="min-w-0 rounded bg-surface-glass px-3 py-2">
        <p class="text-[10px] uppercase text-low">{{ tf("neoX.to", "To") }}</p>
        <div class="mt-1 min-w-0 text-sm font-medium">
          <XHashLink v-if="tx.to" type="address" :hash="tx.to" :name="tx.toInfo?.name || ''" />
          <XHashLink
            v-else-if="tx.createdContract?.hash"
            type="address"
            :hash="tx.createdContract.hash"
            :name="tx.createdContract.name || tf('neoX.contractCreation', 'Contract creation')"
          />
          <span v-else class="text-low">--</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useNow } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import XHashLink from "@/components/common/XHashLink.vue";
import { formatGas, timeAgo } from "@/utils/neoxFormat";

// N3 TxListItem's row anatomy with EVM data: hash + method badge, live age,
// identity-aware From → To, status pill and value/fee.
const props = defineProps({
  tx: { type: Object, default: () => ({}) },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const now = useNow({ interval: 1000 });
const age = computed(() => timeAgo(props.tx.timestampMs, now.value.getTime()));

const hasValue = computed(() => {
  try {
    return BigInt(String(props.tx.value ?? "0")) > 0n;
  } catch (_err) {
    return false;
  }
});

const statusText = computed(() => {
  if (props.tx.status === "ok") return tf("status.success", "Success");
  if (props.tx.status === "error") return tf("status.failed", "Failed");
  return tf("status.pending", "Pending");
});

const statusClass = computed(() => {
  if (props.tx.status === "ok") return "bg-status-success-bg text-status-success";
  if (props.tx.status === "error") return "bg-status-error-bg text-status-error";
  return "bg-status-warning-bg text-status-warning";
});
</script>
