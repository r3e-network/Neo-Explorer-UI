<template>
  <section class="mx-auto -mt-8 max-w-[1400px] px-4 relative z-20">
    <div class="etherscan-card p-4 md:p-5">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <!-- NEO Price -->
        <div class="stat-block">
          <div class="flex items-center gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-icon-primary">
              <svg
                class="h-4 w-4 text-primary-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <div class="stat-label">NEO Price</div>
              <div class="stat-value">
                <Skeleton v-if="loading && !neoPrice" width="80px" height="28px" class="mt-1 inline-block" />
                <span v-else>${{ formatPrice(neoPrice) }}</span>
              </div>
            </div>
          </div>
          <div
            class="mt-1 text-xs"
            :class="priceChangeClass(neoPriceChange)"
            :aria-label="`NEO 24h change ${describePriceChange(neoPriceChange)}`"
          >
            {{ formatPriceChange(neoPriceChange) }} <span class="text-low">(24h)</span>
          </div>
        </div>

        <!-- GAS Price -->
        <div class="stat-block">
          <div class="flex items-center gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-icon-green">
              <svg
                class="h-4 w-4 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div class="stat-label">GAS Price</div>
              <div class="stat-value">
                <Skeleton v-if="loading && !gasPrice" width="80px" height="28px" class="mt-1 inline-block" />
                <span v-else>${{ formatPrice(gasPrice) }}</span>
              </div>
            </div>
          </div>
          <div
            class="mt-1 text-xs"
            :class="priceChangeClass(gasPriceChange)"
            :aria-label="`GAS 24h change ${describePriceChange(gasPriceChange)}`"
          >
            {{ formatPriceChange(gasPriceChange) }} <span class="text-low">(24h)</span>
          </div>
        </div>

        <!-- Transactions -->
        <div class="stat-block">
          <div class="flex items-center gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-icon-orange">
              <svg
                class="h-4 w-4 text-warning"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <div class="stat-label">Transactions</div>
              <div class="stat-value">
                <Skeleton v-if="loading && !txCount" width="80px" height="28px" class="mt-1 inline-block" />
                <span v-else>{{ formatNumber(txCount) }}</span>
              </div>
            </div>
          </div>
          <div class="mt-1 text-xs text-mid">{{ tps.toFixed(2) }} TPS</div>
        </div>

        <!-- Block Height -->
        <div class="stat-block">
          <div class="flex items-center gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-icon-purple">
              <svg
                class="h-4 w-4 text-violet-500 dark:text-violet-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div>
              <div class="stat-label">Block Height</div>
              <div class="stat-value">
                <Skeleton v-if="loading && !blockCount" width="80px" height="28px" class="mt-1 inline-block" />
                <span v-else>{{ formatNumber(blockCount) }}</span>
              </div>
            </div>
          </div>
          <div class="mt-1 flex items-center justify-between text-xs text-mid">
            <span>~{{ targetTime }}s block time</span>
            <span
              v-if="nextBlockCountdown !== null"
              class="font-medium whitespace-nowrap"
              :class="nextBlockCountdown > 0 ? 'text-status-success' : 'text-warning'"
            >
              <span v-if="nextBlockCountdown > 0">Next in {{ nextBlockCountdown }}s</span>
              <span v-else>Refreshing...</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Secondary stats row -->
      <div class="mt-4 border-t pt-4" style="border-color: var(--line-soft)">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="mini-stat">
            <span class="mini-label">Market Cap</span>
            <span class="mini-value">${{ formatLargeNumber(marketCap) }}</span>
          </div>
          <div class="mini-stat">
            <span class="mini-label">Last Finalized Block</span>
            <router-link to="/blocks/1" class="mini-value-link etherscan-link">{{
              formatNumber(blockCount)
            }}</router-link>
          </div>
          <div class="mini-stat">
            <span class="mini-label">Network Fee</span>
            <span class="mini-value">{{ networkFeeDisplay }} GAS</span>
          </div>
          <div class="mini-stat">
            <span class="mini-label">Est. Fee Cost</span>
            <span class="mini-value">~${{ gasCostUsd }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from "vue";
import {
  formatNumber,
  formatPrice,
  formatPriceChange,
  priceChangeClass,
  formatLargeNumber,
} from "@/utils/explorerFormat";
import Skeleton from "@/components/common/Skeleton.vue";

const props = defineProps({
  neoPrice: { type: Number, default: 0 },
  gasPrice: { type: Number, default: 0 },
  neoPriceChange: { type: Number, default: 0 },
  gasPriceChange: { type: Number, default: 0 },
  marketCap: { type: Number, default: 0 },
  txCount: { type: Number, default: 0 },
  blockCount: { type: Number, default: 0 },
  tps: { type: Number, default: 0 },
  latestBlockTimestamp: { type: Number, default: null },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(["fetch-latest"]);

const nextBlockCountdown = ref(null);
const targetTime = ref(15);
const lastFetchRequestedForTimestamp = ref(null);
let countdownTimer = null;

import { getCurrentEnv, NET_ENV } from '@/utils/env';

function updateCountdown() {
  const network = getCurrentEnv();
  targetTime.value = network === NET_ENV.TestT5 ? 3 : 15;

  if (!props.latestBlockTimestamp) {
    nextBlockCountdown.value = null;
    lastFetchRequestedForTimestamp.value = null;
    return;
  }
  // Convert timestamp to ms if needed
  const tsMs = props.latestBlockTimestamp > 1e12 ? props.latestBlockTimestamp : props.latestBlockTimestamp * 1000;
  
  const delayOffset = network === NET_ENV.TestT5 ? 2 : 10;
  const ageSecs = Math.max(0, Math.floor((Date.now() - tsMs) / 1000) - delayOffset);
  nextBlockCountdown.value = Math.max(0, targetTime.value - ageSecs);

  // If block is overdue, emit fetch-latest. HomePage will throttle this to once every 3 seconds.
  if (nextBlockCountdown.value <= 0) {
    emit("fetch-latest");
  }
}

watch(() => props.latestBlockTimestamp, updateCountdown);

onMounted(() => {
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
});

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});

const networkFeeDisplay = computed(() => {
  return "0.003"; // Standard base network fee for simple transfer
});

const gasCostUsd = computed(() => {
  return "0.01";
});

function describePriceChange(value) {
  const change = Number(value) || 0;
  if (change > 0) return `up ${Math.abs(change).toFixed(2)} percent`;
  if (change < 0) return `down ${Math.abs(change).toFixed(2)} percent`;
  return "unchanged";
}
</script>

<style scoped>
.stat-block {
  @apply rounded-lg border p-3;
  border-color: var(--line-soft);
}

.mini-stat {
  @apply flex items-center justify-between;
}

.mini-label {
  @apply text-sm;
  color: var(--text-mid);
}

.mini-value {
  @apply text-sm font-semibold;
  color: var(--text-high);
}

.mini-value-link {
  @apply text-sm font-semibold;
  color: var(--text-high);
}
.mini-value-link:hover {
  color: var(--link-hover);
}
</style>
