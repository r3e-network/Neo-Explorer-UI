<template>
  <div class="treasury-page bg-surface-base">
    <!-- Hero Section -->
    <section class="hero-section relative border-b border-white/10 bg-header-bg/95">
      <div class="hero-overlay"></div>
      <div class="page-container relative z-30 py-10 md:py-14">
        <div class="mx-auto max-w-4xl">
          <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Treasury' }]" class="mb-6 !text-white/70" />
          <h1 class="text-balance text-3xl font-extrabold tracking-tight text-white md:text-4xl mb-4">
            Neo Treasury Holdings
          </h1>
          <p class="max-w-2xl text-base text-white/70">
            Real-time, transparent tracking of the Neo Foundation's digital assets. View the distribution of NEO and GAS across operational and reserve accounts.
          </p>
        </div>
      </div>
    </section>

    <section class="page-container py-8 -mt-12 relative z-40">
      <!-- Data Source Notification -->
      <div class="mb-6 flex items-center gap-3 p-4 rounded-xl bg-blue-50/80 backdrop-blur-sm border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 shadow-sm">
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-sm font-medium">
          Data for Neo Treasury is provided by <a href="https://neo-treasury.pages.dev/" target="_blank" class="underline hover:text-blue-600 dark:hover:text-blue-200 font-bold decoration-2 underline-offset-2">neo-treasury.pages.dev</a>. 
          Visit the site for more detailed information and historical analytics.
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        <!-- Global Stats Card -->
        <div class="etherscan-card p-6 lg:col-span-7 bg-surface/95 backdrop-blur-xl border-t-4 border-t-primary-500 shadow-xl">
          <h2 class="text-sm font-bold text-high uppercase tracking-wider mb-6 flex items-center gap-2">
            <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Total Foundation Assets
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent p-5 border border-green-500/20">
              <div class="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
              <p class="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wide">Total NEO</p>
              <div v-if="loading" class="animate-pulse h-8 w-32 bg-green-500/20 rounded mt-1 mb-2"></div>
              <p v-else class="text-3xl font-extrabold text-high font-mono tracking-tight">{{ formatNumber(totalNeo) }}</p>
              <p v-if="neoPrice && !loading" class="text-sm font-medium text-green-600 dark:text-green-400 mt-2">
                ≈ ${{ formatLargeNumber(totalNeo * neoPrice) }}
              </p>
            </div>
            
            <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent p-5 border border-cyan-500/20">
              <div class="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
              <p class="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2 uppercase tracking-wide">Total GAS</p>
              <div v-if="loading" class="animate-pulse h-8 w-32 bg-cyan-500/20 rounded mt-1 mb-2"></div>
              <p v-else class="text-3xl font-extrabold text-high font-mono tracking-tight">{{ formatNumber(totalGas) }}</p>
              <p v-if="gasPrice && !loading" class="text-sm font-medium text-cyan-600 dark:text-cyan-400 mt-2">
                ≈ ${{ formatLargeNumber(totalGas * gasPrice) }}
              </p>
            </div>
          </div>
          
          <div class="mt-6 pt-5 border-t soft-divider flex items-center justify-between">
            <span class="text-sm text-mid font-medium">Estimated Total USD Value</span>
            <span v-if="loading" class="animate-pulse h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></span>
            <span v-else class="text-lg font-bold text-high">${{ formatLargeNumber((totalNeo * neoPrice) + (totalGas * gasPrice)) }}</span>
          </div>
        </div>

        <!-- Group Distribution -->
        <div class="etherscan-card p-6 lg:col-span-5 flex flex-col justify-center bg-surface">
          <h2 class="text-sm font-bold text-high uppercase tracking-wider mb-6">Asset Distribution</h2>
          
          <div v-if="loading" class="space-y-4">
             <Skeleton v-for="i in 3" :key="i" height="40px" />
          </div>
          <div v-else class="space-y-5">
            <div v-for="group in groups" :key="group.name" class="group">
              <div class="flex justify-between items-end mb-2">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 dark:ring-offset-gray-900" :class="group.color"></span>
                  <span class="text-sm font-semibold text-high">{{ group.name }}</span>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold font-mono text-high">{{ formatLargeNumber(group.neo) }} <span class="text-xs font-normal text-mid">NEO</span></p>
                </div>
              </div>
              <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div class="h-1.5 rounded-full transition-all duration-500 ease-out" :class="group.color" :style="{ width: `${(group.neo / totalNeo) * 100}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Treasury Table -->
      <div class="etherscan-card overflow-hidden">
        <div class="card-header flex items-center justify-between bg-surface-muted/50 border-b soft-divider py-4 px-5">
          <h3 class="text-base font-bold text-high flex items-center gap-2">
            <svg class="w-5 h-5 text-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Treasury Wallets
          </h3>
          <button @click="loadTreasuryData(true)" class="btn-outline px-3 py-1.5 text-xs font-semibold gap-1.5" :disabled="loading">
            <svg :class="{'animate-spin': loading}" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {{ loading ? 'Syncing...' : 'Refresh' }}
          </button>
        </div>

        <div v-if="loading && balances.length === 0" class="p-5 space-y-3">
          <Skeleton v-for="i in 8" :key="i" height="56px" />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm whitespace-nowrap">
            <thead class="bg-surface-muted border-b soft-divider text-xs uppercase tracking-wider text-mid">
              <tr>
                <th class="px-5 py-3.5 text-left font-semibold">Owner Group</th>
                <th class="px-5 py-3.5 text-left font-semibold">Wallet Address</th>
                <th class="px-5 py-3.5 text-right font-semibold">NEO Balance</th>
                <th class="px-5 py-3.5 text-right font-semibold">GAS Balance</th>
                <th class="px-5 py-3.5 text-right font-semibold">Est. Value (USD)</th>
              </tr>
            </thead>
            <tbody class="divide-y soft-divider bg-surface">
              <tr v-for="(item, index) in balances" :key="item.address" class="hover:bg-surface-muted/50 transition-colors" :class="{'bg-gray-50/30 dark:bg-gray-800/20': index % 2 === 0}">
                <td class="px-5 py-4 font-medium text-high">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full shadow-sm flex-shrink-0" :class="getGroupColor(item.name).replace('ring-', '').replace('bg-', 'bg-')"></span>
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
import { ref, computed, onMounted } from 'vue';
import { usePriceCache } from '@/composables/usePriceCache';
import { formatNumber, formatLargeNumber } from '@/utils/explorerFormat';
import { KNOWN_ADDRESSES } from '@/constants/knownAddresses';
import Breadcrumb from '@/components/common/Breadcrumb.vue';
import HashLink from '@/components/common/HashLink.vue';
import Skeleton from '@/components/common/Skeleton.vue';
import { cachedRequest, CACHE_TTL } from '@/services/cache';
import { rpc } from '@cityofzion/neon-js';
import { getRpcClientUrl, getCurrentEnv } from '@/utils/env';

const { fetchPrices } = usePriceCache();
const loading = ref(true);
const neoPrice = ref(0);
const gasPrice = ref(0);
const balances = ref([]);

const totalNeo = computed(() => balances.value.reduce((sum, item) => sum + item.neo, 0));
const totalGas = computed(() => balances.value.reduce((sum, item) => sum + item.gas, 0));

const groups = computed(() => {
  const da = { name: "Neo Foundation (Da Hongfei)", neo: 0, gas: 0, color: "bg-blue-500 ring-blue-500" };
  const erik = { name: "Neo Foundation (Erik Zhang)", neo: 0, gas: 0, color: "bg-purple-500 ring-purple-500" };
  const ops = { name: "Operations & Other", neo: 0, gas: 0, color: "bg-amber-500 ring-amber-500" };
  
  balances.value.forEach(item => {
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
  return [da, erik, ops].sort((a,b) => b.neo - a.neo);
});

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
  const treasuryAddresses = Object.entries(KNOWN_ADDRESSES)
    .filter(([_, name]) => name.includes("Neo Foundation") || name.includes("Neo Bond") || name.includes("NF Binance Deposit"))
    .map(([addr, name]) => ({ address: addr, name }));

  const rpcClient = new rpc.RPCClient(getRpcClientUrl());
  const BATCH_SIZE = 5;
  const results = [];
  
  const NEO_HASH = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
  const GAS_HASH = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
  
  for (let i = 0; i < treasuryAddresses.length; i += BATCH_SIZE) {
    const batch = treasuryAddresses.slice(i, i + BATCH_SIZE);
    const responses = await Promise.allSettled(
      batch.map(item => rpcClient.execute(new rpc.Query({ method: "getnep17balances", params: [item.address] })))
    );
    
    batch.forEach((item, index) => {
      const res = responses[index];
      let neo = 0;
      let gas = 0;

      if (res.status === 'fulfilled' && res.value && Array.isArray(res.value.balance)) {
        const balances = res.value.balance;
        const neoToken = balances.find(b => b.assethash === NEO_HASH);
        const gasToken = balances.find(b => b.assethash === GAS_HASH);
        
        neo = neoToken ? Number(neoToken.amount) : 0;
        gas = gasToken ? Number(gasToken.amount) / 100000000 : 0;
      }
      
      results.push({
        ...item,
        neo: Number.isFinite(neo) ? neo : 0,
        gas: Number.isFinite(gas) ? gas : 0,
        usdValue: 0
      });
    });
  }
  
  return results;
}

async function loadTreasuryData(forceRefresh = false) {
  loading.value = true;
  try {
    const network = getCurrentEnv();
    const cacheKey = `${network}:treasury_data`;
    
    const results = await cachedRequest(
      cacheKey,
      fetchTreasuryDataFromRpc,
      CACHE_TTL.chart,
      { forceRefresh }
    );
    
    const withUsd = results.map(item => ({
      ...item,
      usdValue: (item.neo * neoPrice.value) + (item.gas * gasPrice.value)
    }));
    
    balances.value = withUsd.sort((a, b) => b.usdValue - a.usdValue);
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load treasury data", err);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadPrices();
  await loadTreasuryData();
});
</script>

<style scoped>
.hero-section {
  background-image: radial-gradient(circle at 15% 20%, rgba(74, 180, 238, 0.26), transparent 36%),
    radial-gradient(circle at 78% 8%, rgba(0, 229, 153, 0.16), transparent 28%),
    linear-gradient(180deg, #0f1f3d 0%, #162a4b 100%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 26px 26px;
  opacity: 0.28;
}
</style>
