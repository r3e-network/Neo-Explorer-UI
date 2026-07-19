<template>
  <div class="list-row border-b px-4 py-3">
    <div class="flex items-center justify-between gap-4">
      <!-- Height + live age -->
      <div class="flex w-1/4 min-w-0 items-center gap-3">
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

      <!-- Validator identity (hidden on mobile) -->
      <div class="hidden min-w-0 flex-1 text-center md:block">
        <p class="text-xs text-mid">{{ tf("neoX.validator", "Validator") }}</p>
        <div class="truncate text-sm font-medium">
          <XHashLink v-if="block.miner" type="address" :hash="block.miner" />
          <span v-else class="text-low">--</span>
        </div>
      </div>

      <!-- Gas used + utilization (hidden below lg) -->
      <div class="hidden min-w-0 flex-1 text-right lg:block">
        <p class="text-xs text-mid">{{ tf("neoX.gasUsed", "Gas Used") }}</p>
        <p class="truncate text-sm font-medium text-high">
          {{ formatInt(block.gasUsed) }}
          <span v-if="block.gasUsedPercentage != null" class="text-xs text-mid">
            ({{ block.gasUsedPercentage.toFixed(2) }}%)
          </span>
        </p>
      </div>

      <!-- Txn count + size -->
      <div class="w-20 flex-shrink-0 text-right">
        <p class="text-sm text-high">
          <span class="font-medium">{{ formatInt(block.txCount) }}</span>
          {{ tf("neoX.txns", "Txns").toLowerCase() }}
        </p>
        <p class="hidden text-[10px] text-mid md:block">{{ formatInt(block.size) }} B</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useNow } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import XHashLink from "@/components/common/XHashLink.vue";
import { formatInt, timeAgo } from "@/utils/neoxFormat";

// N3 BlockListItem's row anatomy with EVM data: height, live age, validator
// identity (registry-labeled), gas used + utilization, txn count and size.
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
</script>
