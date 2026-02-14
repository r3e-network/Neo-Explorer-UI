<template>
  <div class="etherscan-card mb-6 p-5">
    <h2 class="mb-3 text-base font-semibold text-text-primary dark:text-gray-200">Latest Fee Summary</h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
        <p class="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">Latest System Fee</p>
        <p class="mt-1 text-lg font-semibold text-text-primary dark:text-gray-200">
          {{ formatGas(gasData.latestSystemFee) }} GAS
        </p>
      </div>
      <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
        <p class="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">Latest Network Fee</p>
        <p class="mt-1 text-lg font-semibold text-text-primary dark:text-gray-200">
          {{ formatGas(gasData.latestNetworkFee) }} GAS
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatGas } from "@/utils/explorerFormat";

defineProps({
  gasData: {
    type: Object,
    required: true,
  },
});
</script>
