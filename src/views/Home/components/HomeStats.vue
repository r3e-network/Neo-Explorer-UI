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
              <div class="stat-label">{{ $t("homePage.statNeoPrice") }}</div>
              <div class="stat-value">
                <Skeleton v-if="loading && !neoPrice" width="80px" height="28px" class="mt-1 inline-block" />
                <span v-else>{{ formatPriceLabel(neoPrice) }}</span>
              </div>
            </div>
          </div>
          <div
            class="mt-1 text-xs"
            :class="priceUnavailable ? 'text-mid' : priceChangeClass(neoPriceChange)"
            :aria-label="$t('homePage.neo24hChangeAria', { description: describePriceChange(neoPriceChange) })"
          >
            {{ formatChangeLabel(neoPriceChange) }} <span class="text-low">{{ $t("homePage.over24h") }}</span>
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
              <div class="stat-label">{{ $t("homePage.statGasPrice") }}</div>
              <div class="stat-value">
                <Skeleton v-if="loading && !gasPrice" width="80px" height="28px" class="mt-1 inline-block" />
                <span v-else>{{ formatPriceLabel(gasPrice) }}</span>
              </div>
            </div>
          </div>
          <div
            class="mt-1 text-xs"
            :class="priceUnavailable ? 'text-mid' : priceChangeClass(gasPriceChange)"
            :aria-label="$t('homePage.gas24hChangeAria', { description: describePriceChange(gasPriceChange) })"
          >
            {{ formatChangeLabel(gasPriceChange) }} <span class="text-low">{{ $t("homePage.over24h") }}</span>
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
              <div class="stat-label">{{ $t("homePage.statTransactions") }}</div>
              <div class="stat-value">
                <Skeleton v-if="loading && !txCount" width="80px" height="28px" class="mt-1 inline-block" />
                <span v-else>{{ formatNumber(txCount) }}</span>
              </div>
            </div>
          </div>
          <div class="mt-1 text-xs text-mid">{{ tps.toFixed(2) }} {{ $t("homePage.statTps") }}</div>
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
              <div class="stat-label">{{ $t("homePage.statBlockHeight") }}</div>
              <div class="stat-value">
                <Skeleton v-if="loading && !blockCount" width="80px" height="28px" class="mt-1 inline-block" />
                <span v-else>{{ formatNumber(blockCount) }}</span>
              </div>
            </div>
          </div>
          <div class="mt-1 flex items-center justify-between text-xs text-mid">
            <span>~{{ targetTime }}s {{ $t("homePage.blockTimeSuffix") }}</span>
            <span
              v-if="nextBlockCountdown !== null"
              class="font-medium whitespace-nowrap"
              :class="nextBlockCountdown > 0 ? 'text-status-success' : 'text-warning'"
            >
              <span v-if="nextBlockCountdown > 0">{{ $t("homePage.nextBlockIn", { seconds: nextBlockCountdown }) }}</span>
              <span v-else>{{ $t("homePage.refreshing") }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Secondary stats row -->
      <div class="mt-4 border-t pt-4 soft-divider">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="mini-stat">
            <span class="mini-label">{{ $t("homePage.miniMarketCap") }}</span>
            <span class="mini-value">{{ formatLargeUsdLabel(marketCap) }}</span>
          </div>
          <div class="mini-stat">
            <span class="mini-label">{{ $t("homePage.miniLastFinalized") }}</span>
            <router-link to="/blocks/1" class="mini-value-link etherscan-link">{{
              formatNumber(blockCount)
            }}</router-link>
          </div>
          <div class="mini-stat">
            <span class="mini-label">{{ $t("homePage.miniNetworkFee") }}</span>
            <span class="mini-value">{{ networkFeeDisplay }} GAS</span>
          </div>
          <div class="mini-stat">
            <span class="mini-label">{{ $t("homePage.miniEstFeeCost") }}</span>
            <span class="mini-value">{{ gasCostUsdLabel }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
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
  priceUnavailable: { type: Boolean, default: false },
  txCount: { type: Number, default: 0 },
  blockCount: { type: Number, default: 0 },
  tps: { type: Number, default: 0 },
  latestBlockTimestamp: { type: Number, default: null },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(["fetch-latest"]);

const { t } = useI18n();

const nextBlockCountdown = ref(null);
const targetTime = ref(15);
const lastFetchRequestedForTimestamp = ref(null);
let countdownTimer = null;

function updateCountdown() {
  targetTime.value = 3;

  if (!props.latestBlockTimestamp) {
    nextBlockCountdown.value = null;
    lastFetchRequestedForTimestamp.value = null;
    return;
  }
  // Convert timestamp to ms if needed
  const tsMs = props.latestBlockTimestamp > 1e12 ? props.latestBlockTimestamp : props.latestBlockTimestamp * 1000;
  if (lastFetchRequestedForTimestamp.value !== null && lastFetchRequestedForTimestamp.value !== tsMs) {
    lastFetchRequestedForTimestamp.value = null;
  }

  const delayOffset = 0;
  const ageSecs = Math.max(0, Math.floor((Date.now() - tsMs) / 1000) - delayOffset);
  nextBlockCountdown.value = Math.max(0, targetTime.value - ageSecs);

  // Emit at most once per observed block timestamp; the page-level auto-refresh handles ongoing polling.
  if (nextBlockCountdown.value <= 0 && lastFetchRequestedForTimestamp.value !== tsMs) {
    lastFetchRequestedForTimestamp.value = tsMs;
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

const NETWORK_FEE_GAS = 0.003;

const networkFeeDisplay = computed(() => NETWORK_FEE_GAS.toFixed(3));

const gasCostUsd = computed(() => {
  const usd = NETWORK_FEE_GAS * Number(props.gasPrice || 0);
  if (!Number.isFinite(usd) || usd <= 0) return "0.00";
  return usd < 0.01 ? "<0.01" : usd.toFixed(2);
});

const gasCostUsdLabel = computed(() => (props.priceUnavailable ? "N/A" : `~$${gasCostUsd.value}`));

function formatPriceLabel(value) {
  return props.priceUnavailable ? "N/A" : `$${formatPrice(value)}`;
}

function formatChangeLabel(value) {
  return props.priceUnavailable ? "N/A" : formatPriceChange(value);
}

function formatLargeUsdLabel(value) {
  return props.priceUnavailable ? "N/A" : `$${formatLargeNumber(value)}`;
}

function describePriceChange(value) {
  if (props.priceUnavailable) return "N/A";
  const change = Number(value) || 0;
  if (change > 0) return t("homePage.priceChangeUp", { percent: Math.abs(change).toFixed(2) });
  if (change < 0) return t("homePage.priceChangeDown", { percent: Math.abs(change).toFixed(2) });
  return t("homePage.priceChangeUnchanged");
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
