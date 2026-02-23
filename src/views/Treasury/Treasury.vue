<template>
  <div class="treasury-page">
    <section class="max-w-[1400px] mx-auto px-4 py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Treasury' }]" />

      <div class="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div class="flex items-center gap-3">
          <div class="page-header-icon bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 class="page-title">Neo Treasury</h1>
            <p class="page-subtitle">Track the transparent holdings of the Neo Foundation</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Global Stats -->
        <div class="etherscan-card p-5">
          <h2 class="text-sm font-semibold text-mid uppercase tracking-wide mb-4">Total Treasury Holdings</h2>
          <div class="flex flex-col sm:flex-row gap-6">
            <div class="flex-1">
              <p class="text-xs text-mid mb-1">Total NEO</p>
              <p class="text-2xl font-bold text-high">{{ loading ? '...' : formatNumber(totalNeo) }}</p>
              <p v-if="neoPrice" class="text-xs text-mid mt-1">~${{ formatLargeNumber(totalNeo * neoPrice) }}</p>
            </div>
            <div class="flex-1">
              <p class="text-xs text-mid mb-1">Total GAS</p>
              <p class="text-2xl font-bold text-high">{{ loading ? '...' : formatNumber(totalGas) }}</p>
              <p v-if="gasPrice" class="text-xs text-mid mt-1">~${{ formatLargeNumber(totalGas * gasPrice) }}</p>
            </div>
          </div>
        </div>
        <!-- Group Stats -->
        <div class="etherscan-card p-5 flex flex-col gap-4 justify-center">
          <div v-for="group in groups" :key="group.name" class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" :class="group.color"></span>
              <span class="text-sm font-medium text-high">{{ group.name }}</span>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold text-high">{{ loading ? '...' : formatNumber(group.neo) }} NEO</p>
              <p class="text-xs text-mid">{{ loading ? '...' : formatNumber(group.gas) }} GAS</p>
            </div>
          </div>
        </div>
      </div>

      <div class="etherscan-card overflow-hidden">
        <div class="card-header flex items-center justify-between">
          <p class="text-mid text-sm">Treasury Addresses</p>
          <button @click="loadTreasuryData" class="btn-mini text-xs px-3 py-1.5" :disabled="loading">
            {{ loading ? 'Updating...' : 'Refresh' }}
          </button>
        </div>

        <div v-if="loading && balances.length === 0" class="p-4 space-y-2">
          <Skeleton v-for="i in 10" :key="i" height="44px" />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[900px]">
            <thead class="table-head">
              <tr>
                <th class="table-header-cell">Owner</th>
                <th class="table-header-cell">Address</th>
                <th class="table-header-cell-right">NEO Balance</th>
                <th class="table-header-cell-right">GAS Balance</th>
                <th class="table-header-cell-right">Value (USD)</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="item in balances" :key="item.address" class="list-row group">
                <td class="table-cell font-medium">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="getGroupColor(item.name)"></span>
                    {{ item.name }}
                  </div>
                </td>
                <td class="table-cell">
                  <HashLink :hash="item.address" type="address" :truncated="false" />
                </td>
                <td class="table-cell-right font-medium">
                  {{ formatNumber(item.neo) }}
                </td>
                <td class="table-cell-right text-mid">
                  {{ formatNumber(item.gas) }}
                </td>
                <td class="table-cell-right font-medium text-status-success">
                  ${{ formatLargeNumber(item.usdValue) }}
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
import { accountService } from '@/services';
import { formatNumber, formatLargeNumber } from '@/utils/explorerFormat';
import { KNOWN_ADDRESSES } from '@/constants/knownAddresses';
import Breadcrumb from '@/components/common/Breadcrumb.vue';
import HashLink from '@/components/common/HashLink.vue';
import Skeleton from '@/components/common/Skeleton.vue';

const { fetchPrices } = usePriceCache();
const loading = ref(true);
const neoPrice = ref(0);
const gasPrice = ref(0);
const balances = ref([]);

const totalNeo = computed(() => balances.value.reduce((sum, item) => sum + item.neo, 0));
const totalGas = computed(() => balances.value.reduce((sum, item) => sum + item.gas, 0));

const groups = computed(() => {
  const da = { name: "Neo Foundation (Da Hongfei)", neo: 0, gas: 0, color: "bg-blue-500" };
  const erik = { name: "Neo Foundation (Erik Zhang)", neo: 0, gas: 0, color: "bg-purple-500" };
  const ops = { name: "Operations & Other", neo: 0, gas: 0, color: "bg-amber-500" };
  
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
  return [da, erik, ops];
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

async function loadTreasuryData() {
  loading.value = true;
  try {
    const treasuryAddresses = Object.entries(KNOWN_ADDRESSES)
      .filter(([_, name]) => name.includes("Neo Foundation") || name.includes("Neo Bond") || name.includes("NF Binance Deposit"))
      .map(([addr, name]) => ({ address: addr, name }));

    const BATCH_SIZE = 10;
    const results = [];
    
    for (let i = 0; i < treasuryAddresses.length; i += BATCH_SIZE) {
      const batch = treasuryAddresses.slice(i, i + BATCH_SIZE);
      const responses = await Promise.allSettled(
        batch.map(item => accountService.getByAddress(item.address).catch(() => null))
      );
      
      batch.forEach((item, index) => {
        const res = responses[index];
        const data = res.status === 'fulfilled' && res.value ? res.value : {};
        
        const neoStr = data.neoBalance ?? data.neo ?? data.NEO ?? data.neo_balance ?? "0";
        const gasStr = data.gasBalance ?? data.gas ?? data.GAS ?? data.gas_balance ?? "0";
        
        const neo = Number(neoStr);
        const gas = Number(gasStr);
        const usdValue = (neo * neoPrice.value) + (gas * gasPrice.value);
        
        results.push({
          ...item,
          neo: Number.isFinite(neo) ? neo : 0,
          gas: Number.isFinite(gas) ? gas : 0,
          usdValue: Number.isFinite(usdValue) ? usdValue : 0
        });
      });
    }
    
    balances.value = results.sort((a, b) => b.usdValue - a.usdValue);
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
