<template>
  <div class="list-row h-full border-b px-4 py-3">
    <div
      class="flex items-center justify-between gap-4 md:grid md:grid-cols-[minmax(128px,0.9fr)_minmax(166px,1.15fr)_minmax(124px,0.9fr)_60px] md:gap-3"
    >
      <!-- Height + live age -->
      <div class="flex min-w-0 items-center gap-3">
        <div
          class="bg-icon-primary text-primary-500 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
        >
          Bk
        </div>
        <div class="min-w-0">
          <XHashLink
            type="block"
            :hash="String(block.index)"
            :label="`#${formatInt(block.index)}`"
            :truncate="false"
          />
          <p class="mt-0.5 text-xs text-mid">{{ age }}</p>
        </div>
      </div>

      <!-- Actual dBFT primary identity (hidden on mobile) -->
      <div class="hidden min-w-0 flex-1 text-center md:block">
        <p class="text-xs text-mid">{{ tf("neoX.primaryValidator", "Primary Validator") }}</p>
        <div class="flex min-w-0 items-center justify-center gap-1.5 truncate text-sm font-medium">
          <XHashLink v-if="block.primaryValidator" type="address" :hash="block.primaryValidator" />
          <span v-else-if="block.primaryPosition != null" class="truncate text-mid">
            {{ tf("neoX.consensusPosition", "Consensus Position") }} {{ primaryPositionLabel }}
          </span>
          <span v-else class="text-low">--</span>
          <span v-if="block.primaryValidator && block.primaryPosition != null" class="badge-soft flex-shrink-0 text-[10px]">
            {{ primaryPositionLabel }}
          </span>
        </div>
      </div>

      <!-- Fee economics + gas utilization -->
      <div class="hidden min-w-0 text-right md:block">
        <p class="text-xs text-mid">{{ tf("neoX.transactionFees", "Transaction Fees") }}</p>
        <p class="truncate text-sm font-medium text-high">{{ transactionFeesLabel }}</p>
        <p class="truncate text-[10px] text-mid">{{ baseFeeLabel }} · {{ gasUtilizationLabel }}</p>
      </div>

      <!-- Txn count + size -->
      <div class="w-20 flex-shrink-0 text-right md:w-auto">
        <p class="text-sm text-high">
          <span class="font-medium">{{ formatInt(block.txCount) }}</span>
          {{ tf("neoX.txns", "Txns").toLowerCase() }}
        </p>
        <p class="hidden text-[10px] text-mid md:block">{{ formatInt(block.size) }} B</p>
      </div>
    </div>

    <dl class="soft-divider mt-3 grid grid-cols-2 gap-x-4 border-t pt-3 md:hidden">
      <div class="min-w-0">
        <dt class="text-[10px] uppercase text-low">{{ tf("neoX.primaryValidator", "Primary Validator") }}</dt>
        <dd class="mt-1 flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-high">
          <XHashLink v-if="block.primaryValidator" type="address" :hash="block.primaryValidator" />
          <span v-else-if="block.primaryPosition != null" class="truncate text-mid">
            {{ tf("neoX.consensusPosition", "Consensus Position") }} {{ primaryPositionLabel }}
          </span>
          <span v-else class="text-low">--</span>
          <span v-if="block.primaryValidator && block.primaryPosition != null" class="badge-soft flex-shrink-0 text-[10px]">
            {{ primaryPositionLabel }}
          </span>
        </dd>
      </div>
      <div class="min-w-0 text-right">
        <dt class="text-[10px] uppercase text-low">{{ tf("neoX.transactionFees", "Transaction Fees") }}</dt>
        <dd class="mt-1 truncate text-sm font-medium text-high">{{ transactionFeesLabel }}</dd>
        <dd class="truncate text-[10px] text-mid">{{ baseFeeLabel }} · {{ gasUtilizationLabel }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useNow } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import XHashLink from "@/components/common/XHashLink.vue";
import { formatGas, formatGwei, formatInt, timeAgo } from "@/utils/neoxFormat";

// N3 BlockListItem's row anatomy with EVM data: height, live age, dBFT primary
// identity, fee economics, gas utilization, transaction count and size.
const props = defineProps({
  block: { type: Object, default: () => ({}) },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const now = useNow({ interval: 1000 });
const age = computed(() => timeAgo(props.block.timestampMs, now.value.getTime()));
const primaryPositionLabel = computed(() => {
  if (props.block.primaryPosition == null) return "--";
  return props.block.consensusSize
    ? `#${props.block.primaryPosition}/${props.block.consensusSize}`
    : `#${props.block.primaryPosition}`;
});
const transactionFeesLabel = computed(() =>
  props.block.transactionFees == null ? "--" : `${formatGas(props.block.transactionFees)} GAS`,
);
const baseFeeLabel = computed(() =>
  props.block.baseFeePerGas == null
    ? `${tf("neoX.baseFee", "Base Fee")} --`
    : `${tf("neoX.baseFee", "Base Fee")} ${formatGwei(props.block.baseFeePerGas)} Gwei`,
);
const gasUtilizationLabel = computed(() =>
  props.block.gasUsedPercentage == null
    ? `${tf("neoX.gasUsed", "Gas Used")} --`
    : `${tf("neoX.gasUsed", "Gas Used")} ${props.block.gasUsedPercentage.toFixed(2)}%`,
);
</script>
