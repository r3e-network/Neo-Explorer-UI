<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.tools'), to: '/tools' }, { label: $t('breadcrumb.mempool') }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </div>
          <div>
            <h1 class="page-title">{{ $t('tools.mempool.title') }}</h1>
            <p class="page-subtitle">{{ $t('tools.mempool.pageSubtitle') }}</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card mb-6">
        <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-line-soft gap-4">
          <h2 class="text-lg font-semibold text-high">{{ $t('tools.mempool.pendingHeading') }}</h2>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-mid">{{ $t('tools.mempool.networkLabel') }}</span>
            <span class="badge-soft px-2.5 py-1 text-xs font-semibold uppercase tracking-wider">{{ currentNetwork }}</span>
            <button @click="fetchMempool" class="py-1.5 px-3 ml-2 h-8 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95" :disabled="loading">
              <span v-if="loading" class="flex items-center gap-1.5">
                <svg class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {{ $t('tools.mempool.refreshing') }}
              </span>
              <span v-else>{{ $t('tools.mempool.refresh') }}</span>
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
              :placeholder="$t('common.searchByHash')"
              :aria-label="$t('tools.mempool.searchAriaLabel')"
              class="form-input w-full pl-10 h-11 rounded-xl shadow-inner focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-400 focus:border-emerald-400 transition-all outline-none"
            />
          </div>
        </div>

        <div v-if="loading && !transactions.length" class="p-12 text-center text-mid">
          <svg class="animate-spin h-8 w-8 mx-auto text-primary-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ $t('tools.mempool.loading') }}
        </div>
        <div v-else-if="error" class="p-12 text-center text-mid flex flex-col items-center">
          <div class="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
          </div>
          <p class="text-base font-medium text-high mb-1">{{ $t('tools.mempool.failedToLoad') }}</p>
          <p class="text-sm mb-4">{{ $t('tools.mempool.failedToLoadHelp') }}</p>
          <button @click="fetchMempool" class="btn-primary px-4 py-2 text-sm">{{ $t('common.retry') }}</button>
        </div>
        <div v-else-if="filteredTransactions.length === 0" class="p-12 text-center text-mid flex flex-col items-center">
          <div class="h-16 w-16 bg-surface-muted rounded-full flex items-center justify-center mb-4">
             <svg class="w-8 h-8 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4M12 20V4"></path></svg>
          </div>
          <p class="text-base font-medium text-high mb-1">{{ $t('tools.mempool.empty') }}</p>
          <p class="text-sm">{{ $t('tools.mempool.emptyHelp') }}</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="etherscan-table min-w-full" :aria-label="$t('tools.mempool.tableAriaLabel')">
            <thead>
              <tr>
                <th class="w-1/4">{{ $t('tools.mempool.tableHash') }}</th>
                <th>{{ $t('tools.mempool.tableTime') }}</th>
                <th>{{ $t('tools.mempool.tableSender') }}</th>
                <th class="text-right">{{ $t('tools.mempool.tableFee') }}</th>
                <th class="text-right">{{ $t('tools.mempool.tableSize') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in filteredTransactions" :key="tx.hash" class="group">
                <td>
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse"></span>
                    <router-link :to="'/transaction-info/' + tx.hash" class="etherscan-link font-mono font-medium">
                      {{ truncate(tx.hash) }}
                    </router-link>
                  </div>
                </td>
                <td class="text-amber-600 dark:text-amber-400 font-medium text-sm">
                  {{ formatAge(tx.timestamp) }}
                </td>
                <td>
                  <router-link v-if="tx.sender" :to="'/account-profile/' + tx.sender" class="etherscan-link font-mono text-sm">
                    {{ tx.sender }}
                  </router-link>
                  <span v-else class="text-mid">—</span>
                </td>
                <td class="text-right text-sm">
                  <span class="badge-soft px-2 py-0.5">{{ formatFee(tx) }}</span>
                </td>
                <td class="text-right text-sm font-medium text-low">
                  {{ $t('tools.mempool.sizeBytes', { count: tx.size }) }}
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { supabaseService } from '@/services/supabaseService';
import { getCurrentEnv, NETWORK_CHANGE_EVENT } from '@/utils/env';
import { useAutoRefresh } from '@/composables/useAutoRefresh';
import { useNow } from '@vueuse/core';
import { formatAge as _formatAge, formatGas } from '@/utils/explorerFormat';

const transactions = ref([]);
const loading = ref(false);
const error = ref(false);
const searchQuery = ref('');

const resolveCurrentNetwork = () => {
  const env = getCurrentEnv()?.toLowerCase() || 'mainnet';
  return env.includes('test') || env.includes('t5') ? 'testnet' : 'mainnet';
};

const currentNetwork = ref(resolveCurrentNetwork());

const now = useNow({ interval: 1000 });
const formatAge = (ts) => _formatAge(ts, now.value.getTime());

const truncate = (hash) => (hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : "");

const formatFee = (tx) => {
  const total = Number(tx.netfee || 0) + Number(tx.sysfee || 0);
  return formatGas(total, 5);
};

const fetchMempool = async () => {
  loading.value = true;
  error.value = false;
  try {
    const data = await supabaseService.getMempoolTransactions(currentNetwork.value, 1000);
    transactions.value = data || [];
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load mempool:", err);
    error.value = true;
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

function handleNetworkChange() {
  currentNetwork.value = resolveCurrentNetwork();
}

// Register the network-change listener synchronously and BEFORE
// useAutoRefresh so the cached `currentNetwork.value` is updated before
// auto-refresh fires its own network-driven retick. (useNetworkChange's
// onMounted-deferred registration would otherwise race and the immediate
// post-switch fetch would go out with the stale network.)
if (typeof window !== "undefined") {
  window.addEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
  onBeforeUnmount(() => {
    window.removeEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
  });
}

// useAutoRefresh handles visibility pause and re-ticks on network change,
// replacing the prior raw setInterval which kept polling the indexer in
// hidden tabs.
const { start: startAutoRefresh } = useAutoRefresh(fetchMempool);

onMounted(() => {
  fetchMempool();
  startAutoRefresh();
});
</script>
