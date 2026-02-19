<template>
  <div class="list-row border-b px-4 py-3">
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <!-- Block circle icon -->
        <div
          class="bg-icon-primary text-primary-500 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
        >
          Bk
        </div>
        <div class="min-w-0">
          <router-link
            :to="`/block-info/${block.hash}`"
            :title="block.hash"
            class="etherscan-link font-medium transition-colors"
          >
            #{{ formatNumber(block.index || 0) }}
          </router-link>
          <p class="mt-0.5 text-xs text-mid">
            {{ formatAge(block.timestamp) }}
          </p>
        </div>
      </div>

      <!-- Validator / Fee Recipient (hidden on mobile) -->
      <div class="hidden min-w-0 flex-1 text-center md:block">
        <p class="text-xs text-mid">Fee Recipient</p>
        <HashLink v-if="block.speaker" :hash="block.speaker" type="address" :copyable="false" />
        <span v-else class="text-sm text-low">-</span>
      </div>

      <!-- Tx count + reward -->
      <div class="flex-shrink-0 text-right">
        <p class="text-sm text-high">
          <span class="font-medium">{{ block.txcount || 0 }}</span>
          txns
        </p>
        <p class="mt-0.5 text-xs text-mid">{{ formatGas(block.netfee, 4) }} GAS</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatAge, formatGas, formatNumber } from "@/utils/explorerFormat";
import HashLink from "./HashLink.vue";

defineProps({
  block: { type: Object, default: () => ({}) },
});
</script>
