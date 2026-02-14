<template>
  <section class="utility-bar border-b border-gray-200 dark:border-gray-800">
    <div class="mx-auto flex h-8 max-w-[1400px] items-center justify-between px-4 text-xs">
      <div class="flex items-center gap-3 text-text-secondary dark:text-gray-400">
        <span>NEO:</span>
        <span class="font-medium text-text-primary dark:text-gray-100">${{ formatPrice(neoPrice) }}</span>
        <span :class="priceChangeClass(neoPriceChange)">({{ formatPriceChange(neoPriceChange) }})</span>
        <span class="hidden text-gray-300 dark:text-gray-600 sm:inline">|</span>
        <span class="hidden sm:inline">GAS:</span>
        <span class="hidden font-medium text-text-primary dark:text-gray-100 sm:inline"
          >${{ formatPrice(gasPrice) }}</span
        >
        <span class="hidden text-gray-300 dark:text-gray-600 md:inline">|</span>
        <span class="hidden md:inline">Net Fee:</span>
        <span class="hidden font-medium text-text-primary dark:text-gray-100 md:inline"
          >{{ formatGasValue(networkFee) }} GAS</span
        >
      </div>
      <div class="flex items-center gap-2">
        <div ref="networkDropdown" class="relative">
          <button
            class="h-6 rounded border border-gray-200 bg-white px-2 text-xs text-text-secondary transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Select network"
            @click="$emit('toggle-network-dropdown')"
          >
            {{ currentNetworkLabel }}
          </button>
          <div
            v-show="networkDropdownOpen"
            class="absolute right-0 mt-1 w-36 rounded border border-gray-200 bg-white p-1 shadow-dropdown dark:border-gray-700 dark:bg-gray-800"
          >
            <button
              v-for="net in networks"
              :key="net.id"
              :class="[
                'block w-full rounded px-2 py-1.5 text-left text-xs transition-colors',
                net.id === currentNetwork
                  ? 'bg-gray-100 text-primary-600 dark:bg-gray-700 dark:text-primary-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700',
              ]"
              :aria-label="`Switch to ${net.name}`"
              @click="$emit('select-network', net)"
            >
              {{ net.name }}
            </button>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";
import ThemeToggle from "@/components/common/ThemeToggle.vue";
import { formatPrice, formatPriceChange, priceChangeClass } from "@/utils/explorerFormat";

defineProps({
  neoPrice: { type: Number, default: 0 },
  gasPrice: { type: Number, default: 0 },
  neoPriceChange: { type: Number, default: 0 },
  networkFee: { type: Number, default: 0 },
  currentNetworkLabel: { type: String, default: "" },
  currentNetwork: { type: String, default: "" },
  networks: { type: Array, default: () => [] },
  networkDropdownOpen: { type: Boolean, default: false },
});

defineEmits(["select-network", "toggle-network-dropdown"]);

const networkDropdown = ref(null);

defineExpose({ networkDropdown });

function formatGasValue(value) {
  return Number(value || 0).toFixed(3);
}
</script>

<style scoped>
.utility-bar {
  @apply bg-gray-50 dark:bg-gray-900;
}
</style>
