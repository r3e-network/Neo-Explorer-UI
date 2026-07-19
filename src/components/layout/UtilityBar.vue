<template>
  <section class="utility-bar border-b border-white/10">
    <div class="mx-auto flex h-8 max-w-[1400px] items-center justify-between px-4 text-xs">
      <div class="flex items-center gap-3 text-white/70">
        <span>NEO:</span>
        <span class="font-semibold text-white">{{ formatPriceLabel(neoPrice) }}</span>
        <span :class="priceUnavailable ? 'text-white/50' : Number(neoPriceChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'">({{ formatChangeLabel(neoPriceChange) }})</span>
        <span class="hidden text-white/30 sm:inline">|</span>
        <span class="hidden sm:inline">GAS:</span>
        <span class="hidden font-semibold text-white sm:inline">{{ formatPriceLabel(gasPrice) }}</span>
      </div>
      <div class="flex items-center gap-2">
        <div ref="networkDropdown" class="relative">
          <button
            class="h-6 rounded-md border border-white/25 bg-white/10 px-2 text-xs text-white transition hover:bg-white/20"
            :aria-label="t('utilityBar.selectNetwork')"
            aria-haspopup="true"
            :aria-expanded="networkDropdownOpen"
            @click="$emit('toggle-network-dropdown')"
          >
            {{ currentNetworkLabel }}
          </button>
          <div
            v-show="networkDropdownOpen"
            class="absolute right-0 mt-1 z-[100] w-44 rounded-lg border border-white/20 bg-header-bg p-1.5 shadow-dropdown"
          >
            <button
              v-for="net in networks"
              :key="net.id"
              :class="[
                'block w-full rounded px-2 py-1.5 text-left text-xs transition-colors',
                net.id === currentNetwork
                  ? 'bg-white/15 text-primary-300'
                  : 'text-white/80 hover:bg-white/10 hover:text-white',
              ]"
              :aria-label="t('utilityBar.switchTo', { name: net.name })"
              @click="$emit('select-network', net)"
            >
              {{ net.name }}
            </button>
          </div>
        </div>
        <LanguageSelector />
        <ThemeToggle />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import ThemeToggle from "@/components/common/ThemeToggle.vue";
import LanguageSelector from "@/components/common/LanguageSelector.vue";
import { formatPrice, formatPriceChange } from "@/utils/explorerFormat";

const { t } = useI18n();

const props = defineProps({
  neoPrice: { type: Number, default: 0 },
  gasPrice: { type: Number, default: 0 },
  neoPriceChange: { type: Number, default: 0 },
  priceUnavailable: { type: Boolean, default: false },
  currentNetworkLabel: { type: String, default: "" },
  currentNetwork: { type: String, default: "" },
  networks: { type: Array, default: () => [] },
  networkDropdownOpen: { type: Boolean, default: false },
});

defineEmits(["select-network", "toggle-network-dropdown"]);

const networkDropdown = ref(null);

function formatPriceLabel(value) {
  return props.priceUnavailable ? "N/A" : `$${formatPrice(value)}`;
}

function formatChangeLabel(value) {
  return props.priceUnavailable ? "N/A" : formatPriceChange(value);
}

defineExpose({ networkDropdown });
</script>

<style scoped>
.utility-bar {
  @apply relative z-[60] bg-header-bg/95 backdrop-blur-md dark:bg-header-bg-dark/95;
}
</style>
