<template>
  <div class="treasury-page bg-surface-base">
    <!-- Hero Section -->
    <section class="hero-section relative border-b border-white/10 bg-header-bg/95">
      <div class="hero-overlay"></div>
      <div class="page-container relative z-30 py-10 md:py-14">
        <div class="mx-auto max-w-4xl">
          <Breadcrumb
            :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.treasury') }]"
            class="mb-6 !text-white/70"
          />
          <h1 class="text-balance text-3xl font-extrabold tracking-tight text-white md:text-4xl mb-4">
            {{ $t('treasuryPage.pageTitle') }}
          </h1>
          <p class="max-w-2xl text-base text-white/70">
            {{ $t('treasuryPage.pageSubtitle') }}
          </p>
        </div>
      </div>
    </section>

    <section class="page-container py-8 -mt-12 relative z-40">
      <!-- Data Source Notification -->
      <div
        class="mb-6 flex items-center gap-3 p-4 rounded-xl bg-blue-50/80 backdrop-blur-sm border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 shadow-sm"
      >
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="text-sm font-medium">
          {{ $t('treasuryPage.dataSourcePrefix') }}
          <a
            href="https://neo-treasury.pages.dev/"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-blue-600 dark:hover:text-blue-200 font-bold decoration-2 underline-offset-2"
            >neo-treasury.pages.dev</a
          >{{ $t('treasuryPage.dataSourceSuffix') }}
        </div>
      </div>

      <div
        v-if="!isTreasuryNetworkSupported"
        class="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 shadow-sm dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200"
      >
        <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
          />
        </svg>
        <div class="text-sm font-medium">
          {{ $t('treasuryPage.mainnetOnlyNotice') }}
        </div>
      </div>

      <!-- Error State -->
      <div v-if="error && !loading" class="mb-6">
        <div class="etherscan-card overflow-hidden">
          <ErrorState :title="$t('treasuryPage.failedToLoad')" :message="error" @retry="loadTreasuryData(true)" />
        </div>
      </div>

      <div v-if="!error" class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <!-- Global Stats Card -->
        <div
          class="etherscan-card p-6 lg:col-span-7 bg-surface/95 backdrop-blur-xl border-t-4 border-t-primary-500 shadow-xl"
        >
          <h2 class="text-sm font-bold text-high uppercase tracking-wider mb-6 flex items-center gap-2">
            <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {{ $t('treasuryPage.totalFoundationAssets') }}
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div
              class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent p-5 border border-green-500/20"
            >
              <div class="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
              <p class="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wide">
                {{ $t('treasuryPage.totalNeoLabel') }}
              </p>
              <div v-if="loading" class="animate-pulse h-8 w-32 bg-green-500/20 rounded mt-1 mb-2"></div>
              <p v-else-if="!isTreasuryNetworkSupported" class="text-2xl font-extrabold text-high tracking-tight">
                {{ $t('treasuryPage.mainnetOnlyShort') }}
              </p>
              <p v-else class="text-3xl font-extrabold text-high font-mono tracking-tight">
                {{ formatNumber(totalNeo) }}
              </p>
              <p
                v-if="isTreasuryNetworkSupported && neoPrice && !loading"
                class="text-sm font-medium text-green-600 dark:text-green-400 mt-2"
              >
                ≈ ${{ formatLargeNumber(totalNeo * neoPrice) }}
              </p>
            </div>

            <div
              class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent p-5 border border-cyan-500/20"
            >
              <div class="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
              <p class="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2 uppercase tracking-wide">
                {{ $t('treasuryPage.totalGasLabel') }}
              </p>
              <div v-if="loading" class="animate-pulse h-8 w-32 bg-cyan-500/20 rounded mt-1 mb-2"></div>
              <p v-else-if="!isTreasuryNetworkSupported" class="text-2xl font-extrabold text-high tracking-tight">
                {{ $t('treasuryPage.mainnetOnlyShort') }}
              </p>
              <p v-else class="text-3xl font-extrabold text-high font-mono tracking-tight">
                {{ formatNumber(totalGas) }}
              </p>
              <p
                v-if="isTreasuryNetworkSupported && gasPrice && !loading"
                class="text-sm font-medium text-cyan-600 dark:text-cyan-400 mt-2"
              >
                ≈ ${{ formatLargeNumber(totalGas * gasPrice) }}
              </p>
            </div>
          </div>

          <div class="mt-6 pt-5 border-t soft-divider flex items-center justify-between">
            <span class="text-sm text-mid font-medium">{{ $t('treasuryPage.estimatedTotalUsd') }}</span>
            <span v-if="loading" class="animate-pulse h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></span>
            <span v-else-if="!isTreasuryNetworkSupported" class="text-base font-bold text-mid">{{ $t('treasuryPage.switchToMainnet') }}</span>
            <span v-else class="text-lg font-bold text-high"
              >${{ formatLargeNumber(totalNeo * neoPrice + totalGas * gasPrice) }}</span
            >
          </div>
        </div>

        <!-- Group Distribution -->
        <div class="etherscan-card p-6 lg:col-span-5 flex flex-col justify-center bg-surface">
          <h2 class="text-sm font-bold text-high uppercase tracking-wider mb-6">{{ $t('treasuryPage.assetDistribution') }}</h2>

          <div v-if="loading" class="space-y-4">
            <Skeleton v-for="i in 3" :key="i" height="40px" />
          </div>
          <div v-else-if="!isTreasuryNetworkSupported" class="rounded-xl border border-dashed border-line-soft bg-surface-muted/40 p-4 text-sm text-mid">
            {{ $t('treasuryPage.switchForChart') }}
          </div>
          <div v-else class="space-y-5">
            <div v-for="group in groups" :key="group.name" class="group">
              <div class="flex justify-between items-end mb-2">
                <div class="flex items-center gap-2">
                  <span
                    class="w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 dark:ring-offset-gray-900"
                    :class="group.color"
                  ></span>
                  <span class="text-sm font-semibold text-high">{{ group.name }}</span>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold font-mono text-high">
                    {{ formatLargeNumber(group.neo) }} <span class="text-xs font-normal text-mid">NEO</span>
                  </p>
                </div>
              </div>
              <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  class="h-1.5 rounded-full transition-all duration-500 ease-out"
                  :class="group.color"
                  :style="groupWidthStyle(group)"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Treasury Table -->
      <div v-if="!error" class="etherscan-card overflow-hidden">
        <div class="card-header flex items-center justify-between bg-surface-muted/50 border-b soft-divider py-4 px-5">
          <h3 class="text-base font-bold text-high flex items-center gap-2">
            <svg class="w-5 h-5 text-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            {{ $t('treasuryPage.treasuryWallets') }}
          </h3>
          <button
            @click="loadTreasuryData(true)"
            class="btn-outline px-3 py-1.5 text-xs font-semibold gap-1.5"
            :disabled="loading"
          >
            <svg
              :class="{ 'animate-spin': loading }"
              class="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {{ loading ? $t('treasuryPage.syncingButton') : $t('treasuryPage.refreshButton') }}
          </button>
        </div>

        <div v-if="loading && balances.length === 0" class="p-5 space-y-3">
          <Skeleton v-for="i in 8" :key="i" height="56px" />
        </div>
        <div
          v-else-if="!isTreasuryNetworkSupported"
          class="p-8 text-center text-mid"
        >
          {{ $t('treasuryPage.switchForBalances') }}
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm whitespace-nowrap" :aria-label="$t('treasuryPage.treasuryWallets')">
            <thead class="bg-surface-muted border-b soft-divider text-xs uppercase tracking-wider text-mid">
              <tr>
                <th class="px-5 py-3.5 text-left font-semibold">{{ $t('treasuryPage.colOwnerGroup') }}</th>
                <th class="px-5 py-3.5 text-left font-semibold">{{ $t('treasuryPage.colWalletAddress') }}</th>
                <th class="px-5 py-3.5 text-right font-semibold">{{ $t('treasuryPage.colNeoBalance') }}</th>
                <th class="px-5 py-3.5 text-right font-semibold">{{ $t('treasuryPage.colGasBalance') }}</th>
                <th class="px-5 py-3.5 text-right font-semibold">{{ $t('treasuryPage.colEstUsd') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y soft-divider bg-surface">
              <tr
                v-for="(item, index) in balances"
                :key="item.address"
                class="hover:bg-surface-muted/50 transition-colors"
                :class="{ 'bg-gray-50/30 dark:bg-gray-800/20': index % 2 === 0 }"
              >
                <td class="px-5 py-4 font-medium text-high">
                  <div class="flex items-center gap-2">
                    <span
                      class="w-2 h-2 rounded-full shadow-sm flex-shrink-0"
                      :class="getGroupColor(item.name).replace('ring-', '').replace('bg-', 'bg-')"
                    ></span>
                    {{ item.name }}
                  </div>
                </td>
                <td class="px-5 py-4">
                  <HashLink :hash="item.address" type="address" :truncated="false" class="font-medium" />
                </td>
                <td class="px-5 py-4 text-right">
                  <span class="font-mono font-medium text-high">{{ formatNumber(item.neo) }}</span>
                </td>
                <td class="px-5 py-4 text-right">
                  <span class="font-mono text-mid">{{ formatNumber(item.gas) }}</span>
                </td>
                <td class="px-5 py-4 text-right">
                  <span class="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    ${{ formatLargeNumber(item.usdValue) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { usePriceCache } from "@/composables/usePriceCache";
import { formatNumber, formatLargeNumber } from "@/utils/explorerFormat";
import { getTreasuryKnownAddresses } from "@/constants/knownAddresses";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import HashLink from "@/components/common/HashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { cachedRequest, CACHE_TTL } from "@/services/cache";
import { NEO_HASH, GAS_HASH } from "@/constants";
import { loadNeonJs } from "@/utils/neonLoader";
import { getCurrentEnv } from "@/utils/env";
import { callWithRpcEndpointFallback } from "@/utils/rpcEndpoints";
import { useNetworkChange } from "@/composables/useNetworkChange";

const { t } = useI18n();
const { fetchPrices } = usePriceCache();
const loading = ref(true);
const error = ref(null);
const neoPrice = ref(0);
const gasPrice = ref(0);
const balances = ref([]);
const activeEnv = ref(getCurrentEnv());
const activeNetworkMode = computed(() =>
  String(activeEnv.value || "")
    .toLowerCase()
    .includes("test")
      ? "testnet"
      : "mainnet",
);
const isTreasuryNetworkSupported = computed(() => activeNetworkMode.value === "mainnet");

const totalNeo = computed(() => balances.value.reduce((sum, item) => sum + item.neo, 0));
const totalGas = computed(() => balances.value.reduce((sum, item) => sum + item.gas, 0));

const groups = computed(() => {
  const da = { name: "Neo Foundation (Da Hongfei)", neo: 0, gas: 0, color: "bg-blue-500 ring-blue-500" };
  const erik = { name: "Neo Foundation (Erik Zhang)", neo: 0, gas: 0, color: "bg-purple-500 ring-purple-500" };
  const ops = { name: "Operations & Other", neo: 0, gas: 0, color: "bg-amber-500 ring-amber-500" };

  balances.value.forEach((item) => {
    if (item.name.includes("Da Hongfei")) {
      da.neo += item.neo;
      da.gas += item.gas;
    } else if (item.name.includes("Erik Zhang")) {
      erik.neo += item.neo;
      erik.gas += item.gas;
    } else {
      ops.neo += item.neo;
      ops.gas += item.gas;
    }
  });
  return [da, erik, ops].sort((a, b) => b.neo - a.neo);
});

async function createRpcClient(endpoint) {
  // Match the Governance fix: don't read window.Neon directly — on a cold
  // /treasury mount the SDK chunk hasn't finished loading yet, and the
  // page fails with "Neo RPC client is not available." loadNeonJs()
  // resolves the same module the rest of the app uses.
  const sdk = await loadNeonJs();
  const RpcClient = sdk?.rpc?.RPCClient;
  if (typeof RpcClient !== "function") {
    throw new Error("Neo RPC client is not available.");
  }
  return new RpcClient(endpoint);
}

function groupWidthStyle(group) {
  if (!totalNeo.value) return { width: "0%" };
  return { width: `${(group.neo / totalNeo.value) * 100}%` };
}

function getGroupColor(name) {
  if (name.includes("Da Hongfei")) return "bg-blue-500";
  if (name.includes("Erik Zhang")) return "bg-purple-500";
  return "bg-amber-500";
}

async function loadPrices() {
  try {
    const data = await fetchPrices();
    neoPrice.value = data.neo || 0;
    gasPrice.value = data.gas || 0;
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
  }
}

async function fetchTreasuryDataFromRpc() {
  const treasuryAddresses = getTreasuryKnownAddresses();
  const BATCH_SIZE = 5;

  return callWithRpcEndpointFallback(getCurrentEnv(), async (endpoint) => {
    const rpcClient = await createRpcClient(endpoint);
    const results = [];

    for (let i = 0; i < treasuryAddresses.length; i += BATCH_SIZE) {
      const batch = treasuryAddresses.slice(i, i + BATCH_SIZE);
      const responses = await Promise.allSettled(
        // neon-js's getNep17Balances takes a positional address string,
        // not an object. The previous { account: addr } shape stringified
        // to "[object Object]" inside the call, returning empty results.
        batch.map((item) => rpcClient.getNep17Balances(item.address)),
      );

      batch.forEach((item, index) => {
        const res = responses[index];
        let neo = 0;
        let gas = 0;

        if (res.status === "fulfilled" && res.value && Array.isArray(res.value.balance)) {
          const balances = res.value.balance;
          const neoToken = balances.find((b) => b.assethash === NEO_HASH);
          const gasToken = balances.find((b) => b.assethash === GAS_HASH);

          neo = neoToken ? Number(neoToken.amount) : 0;
          gas = gasToken ? Number(gasToken.amount) / 100000000 : 0;
        }

        results.push({
          ...item,
          neo: Number.isFinite(neo) ? neo : 0,
          gas: Number.isFinite(gas) ? gas : 0,
          usdValue: 0,
        });
      });
    }

    return results;
  });
}

async function loadTreasuryData(forceRefresh = false) {
  loading.value = true;
  error.value = null;
  try {
    if (!isTreasuryNetworkSupported.value) {
      balances.value = [];
      return;
    }

    const network = activeEnv.value;
    const cacheKey = `${network}:treasury_data`;

    const results = await cachedRequest(cacheKey, fetchTreasuryDataFromRpc, CACHE_TTL.chart, { forceRefresh });

    const withUsd = results.map((item) => ({
      ...item,
      usdValue: item.neo * neoPrice.value + item.gas * gasPrice.value,
    }));

    balances.value = withUsd.sort((a, b) => b.usdValue - a.usdValue);
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load treasury data", err);
    error.value = t("treasuryPage.failedToLoadRetry");
  } finally {
    loading.value = false;
  }
}

async function handleNetworkChange() {
  activeEnv.value = getCurrentEnv();
  await loadTreasuryData(true);
}

onMounted(async () => {
  activeEnv.value = getCurrentEnv();
  await loadPrices();
  await loadTreasuryData();
});

useNetworkChange(handleNetworkChange);

onBeforeUnmount(() => {});
</script>

<style scoped>
.hero-section {
  background-image:
    radial-gradient(circle at 15% 20%, rgba(74, 180, 238, 0.26), transparent 36%),
    radial-gradient(circle at 78% 8%, rgba(0, 229, 153, 0.16), transparent 28%),
    linear-gradient(180deg, #0f1f3d 0%, #162a4b 100%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 26px 26px;
  opacity: 0.28;
}
</style>
