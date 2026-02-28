<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Mempool Search' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </div>
          <div>
            <h1 class="page-title">Mempool Search</h1>
            <p class="page-subtitle">View and search the current in-memory pending transactions on the Neo network.</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card mb-6">
        <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-line-soft gap-4">
          <h2 class="text-lg font-semibold text-high">Pending Transactions</h2>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-mid">Network:</span>
            <span class="badge-soft px-2.5 py-1 text-xs font-semibold uppercase tracking-wider">{{ currentNetwork }}</span>
            <button @click="fetchMempool" class="btn-primary py-1.5 px-3 ml-2 text-sm h-8" :disabled="loading">
              <span v-if="loading" class="flex items-center gap-1.5">
                <svg class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Refreshing
              </span>
              <span v-else>Refresh</span>
            </button>
          </div>
        </div>

        <div class="p-4 border-b border-line-soft">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search by transaction hash or sender address..." 
              class="form-input w-full pl-10 h-11"
            />
          </div>
        </div>

        <div v-if="loading && !transactions.length" class="p-12 text-center text-mid">
          <svg class="animate-spin h-8 w-8 mx-auto text-primary-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading mempool transactions...
        </div>
        <div v-else-if="filteredTransactions.length === 0" class="p-12 text-center text-mid flex flex-col items-center">
          <div class="h-16 w-16 bg-surface-muted rounded-full flex items-center justify-center mb-4">
             <svg class="w-8 h-8 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4M12 20V4"></path></svg>
          </div>
          <p class="text-base font-medium text-high mb-1">Mempool is Empty</p>
          <p class="text-sm">No pending transactions found matching your criteria.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="etherscan-table min-w-full">
            <thead>
              <tr>
                <th class="w-1/4">Tx Hash</th>
                <th>Time in Mempool</th>
                <th>Sender</th>
                <th class="text-right">Fee (GAS)</th>
                <th class="text-right">Size</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in filteredTransactions" :key="tx.hash" class="group">
                <td>
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse"></span>
                    <router-link :to="'/transaction/' + tx.hash" class="etherscan-link font-mono font-medium">
                      {{ truncate(tx.hash) }}
                    </router-link>
                  </div>
                </td>
                <td class="text-amber-600 dark:text-amber-400 font-medium text-sm">
                  {{ formatAge(tx.timestamp) }}
                </td>
                <td>
                  <router-link v-if="tx.sender" :to="'/address/' + tx.sender" class="etherscan-link font-mono text-sm">
                    {{ tx.sender }}
                  </router-link>
                  <span v-else class="text-mid">—</span>
                </td>
                <td class="text-right text-sm">
                  <span class="badge-soft px-2 py-0.5">{{ formatFee(tx) }}</span>
                </td>
                <td class="text-right text-sm font-medium text-low">
                  {{ tx.size }} bytes
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { supabaseService } from '@/services/supabaseService';
import { getCurrentEnv, getNetworkRefreshIntervalMs } from '@/utils/env';
import { useNow } from '@vueuse/core';
import { formatAge as _formatAge, formatGas } from '@/utils/explorerFormat';

const transactions = ref([]);
const loading = ref(false);
const searchQuery = ref('');
let pollInterval = null;

const currentNetwork = computed(() => {
  const env = getCurrentEnv()?.toLowerCase() || 'mainnet';
  return env.includes('test') || env.includes('t5') ? 'testnet' : 'mainnet';
});

const now = useNow({ interval: 1000 });
const formatAge = (ts) => _formatAge(ts, now.value.getTime());

const truncate = (hash) => hash ? `\${hash.slice(0, 10)}...\${hash.slice(-8)}` : '';

const formatFee = (tx) => {
  const total = Number(tx.netfee || 0) + Number(tx.sysfee || 0);
  return formatGas(total, 5);
};

const fetchMempool = async () => {
  loading.value = true;
  try {
    const data = await supabaseService.getMempoolTransactions(currentNetwork.value, 1000);
    transactions.value = data || [];
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load mempool:", err);
  } finally {
    loading.value = false;
  }
};

const filteredTransactions = computed(() => {
  if (!searchQuery.value) return transactions.value;
  const q = searchQuery.value.toLowerCase();
  return transactions.value.filter(tx => 
    (tx.hash && tx.hash.toLowerCase().includes(q)) || 
    (tx.sender && tx.sender.toLowerCase().includes(q))
  );
});

onMounted(() => {
  fetchMempool();
  pollInterval = setInterval(fetchMempool, getNetworkRefreshIntervalMs());
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>
