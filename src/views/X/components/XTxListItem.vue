<template>
  <div class="list-row h-full min-h-[64px] border-b px-4 py-3">
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
            <XAntiMevBadge :anti-mev="tx.antiMev" />
            <span
              v-if="tx.method && !tx.antiMev"
              class="badge-soft hidden max-w-[150px] truncate text-[10px] sm:inline-block"
              :title="methodBadgeLabel"
            >
              {{ methodBadgeLabel }}
            </span>
          </div>
          <p class="mt-0.5 truncate text-xs text-mid">{{ age }}<span v-if="blockMeta"> · {{ blockMeta }}</span></p>
        </div>
      </div>

      <!-- From -> To (hidden on mobile); per-slot flex-1 min-w-0 keeps two
           long addresses truncating instead of overflowing. -->
      <div class="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
        <div class="min-w-0 flex-1 basis-0 text-right">
          <p class="text-xs text-mid">{{ tf("neoX.from", "From") }}</p>
          <div class="truncate text-sm">
            <XHashLink v-if="tx.sender" type="address" :hash="tx.sender" :name="tx.fromInfo?.name || ''" />
            <span v-else class="text-low">--</span>
          </div>
        </div>
        <svg class="h-4 w-4 flex-shrink-0 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
        <div class="min-w-0 flex-1 basis-0 text-left">
          <p class="text-xs text-mid">{{ tf("neoX.to", "To") }}</p>
          <div class="truncate text-sm">
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

      <!-- Status + explicit value and fee -->
      <div class="w-32 flex-shrink-0 text-right">
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          :class="statusClass"
        >
          {{ statusText }}
        </span>
        <p class="mt-1 truncate text-xs text-high">
          <span class="text-mid">{{ tf("neoX.value", "Value") }}</span> {{ valueLabel }}
        </p>
        <p class="truncate text-[10px] text-mid">
          {{ tf("neoX.fee", "Fee") }} {{ feeLabel }}
        </p>
      </div>
    </div>

    <!-- Mobile detail grid -->
    <dl class="soft-divider mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 md:hidden">
      <div class="min-w-0">
        <dt class="text-[10px] uppercase text-low">{{ tf("neoX.from", "From") }}</dt>
        <dd class="mt-1 min-w-0 text-sm font-medium">
          <XHashLink v-if="tx.sender" type="address" :hash="tx.sender" :name="tx.fromInfo?.name || ''" />
          <span v-else class="text-low">--</span>
        </dd>
      </div>
      <div class="min-w-0">
        <dt class="text-[10px] uppercase text-low">{{ tf("neoX.to", "To") }}</dt>
        <dd class="mt-1 min-w-0 text-sm font-medium">
          <XHashLink v-if="tx.to" type="address" :hash="tx.to" :name="tx.toInfo?.name || ''" />
          <XHashLink
            v-else-if="tx.createdContract?.hash"
            type="address"
            :hash="tx.createdContract.hash"
            :name="tx.createdContract.name || tf('neoX.contractCreation', 'Contract creation')"
          />
          <span v-else class="text-low">--</span>
        </dd>
      </div>
      <div class="min-w-0">
        <dt class="text-[10px] uppercase text-low">
          {{ tx.antiMev ? "Protocol" : (isMethodSelector ? tf("neoX.selector", "Selector") : tf("neoX.method", "Method")) }}
        </dt>
        <dd class="mt-1 truncate text-sm font-medium text-high" :title="tx.method || ''">
          {{ tx.antiMev ? "Anti-MEV Envelope" : (tx.method || "--") }}
        </dd>
      </div>
      <div class="min-w-0 text-right">
        <dt class="text-[10px] uppercase text-low">{{ tf("neoX.block", "Block") }}</dt>
        <dd class="mt-1 truncate text-sm font-medium text-high">{{ blockMeta || "--" }}</dd>
      </div>
      <div class="min-w-0">
        <dt class="text-[10px] uppercase text-low">{{ tf("neoX.value", "Value") }}</dt>
        <dd class="mt-1 truncate text-sm font-medium text-high">{{ valueLabel }}</dd>
      </div>
      <div class="min-w-0 text-right">
        <dt class="text-[10px] uppercase text-low">{{ tf("neoX.fee", "Fee") }}</dt>
        <dd class="mt-1 truncate text-sm font-medium text-high">{{ feeLabel }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useNow } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import XHashLink from "@/components/common/XHashLink.vue";
import XAntiMevBadge from "./XAntiMevBadge.vue";
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
const isMethodSelector = computed(() => /^0x[0-9a-f]{8}$/i.test(String(props.tx.method || "")));
const methodBadgeLabel = computed(() =>
  isMethodSelector.value ? `${tf("neoX.selector", "Selector")} ${props.tx.method}` : props.tx.method,
);

const gasAmountLabel = (value) => (value == null || value === "" ? "--" : `${formatGas(value)} GAS`);
const valueLabel = computed(() => gasAmountLabel(props.tx.value));
const feeLabel = computed(() => gasAmountLabel(props.tx.fee));
const blockMeta = computed(() => {
  if (props.tx.blockIndex == null) return "";
  const height = `#${Number(props.tx.blockIndex).toLocaleString("en-US")}`;
  return props.tx.confirmations > 0 ? `${height} · ${props.tx.confirmations.toLocaleString("en-US")} conf` : height;
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
