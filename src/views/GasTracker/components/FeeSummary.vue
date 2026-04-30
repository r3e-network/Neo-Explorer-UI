<template>
  <div class="etherscan-card mb-6 p-5">
    <h2 class="text-high mb-3 text-base font-semibold">{{ $t("gasTracker.summaryTitle") }}</h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="panel-muted p-4">
        <p class="text-low text-xs font-medium uppercase tracking-wide">{{ $t("gasTracker.latestSystemFee") }}</p>
        <p class="text-high mt-1 text-lg font-semibold">
          {{ formatGas(gasData.latestSystemFee) }} GAS
        </p>
      </div>
      <div class="panel-muted p-4">
        <p class="text-low text-xs font-medium uppercase tracking-wide">{{ $t("gasTracker.latestNetworkFee") }}</p>
        <p class="text-high mt-1 text-lg font-semibold">
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
