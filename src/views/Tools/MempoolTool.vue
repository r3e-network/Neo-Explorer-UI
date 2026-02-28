<template>
  <div class="mempool-tool max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-high">Mempool Search</h1>
      <p class="mt-2 text-mid">View and search the current in-memory pending transactions on the Neo network.</p>
    </div>

    <div class="etherscan-card mb-6">
      <div class="p-4 flex items-center justify-between border-b">
        <h2 class="text-lg font-semibold text-high">Pending Transactions</h2>
        <div class="flex items-center gap-2">
          <span class="text-sm text-mid">Network:</span>
          <span class="px-2 py-1 bg-surface-muted rounded text-sm text-high font-medium">{{ currentNetwork }}</span>
          <button @click="fetchMempool" class="btn-primary py-1 px-3 ml-2 text-sm" :disabled="loading">
            {{ loading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>
      </div>

      <div class="p-4 border-b">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search by transaction hash or sender address..." 
          class="w-full form-input"
        />
      </div>

      <div v-if="loading && !transactions.length" class="p-8 text-center text-mid">
        <svg class="animate-spin h-8 w-8 mx-auto text-primary-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading mempool transactions...
      </div>
      <div v-else-if="filteredTransactions.length === 0" class="p-8 text-center text-mid">
        No pending transactions found in the mempool.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="etherscan-table">
          <thead>
            <tr>
              <th>Tx Hash</th>
              <th>Time in Mempool</th>
              <th>Sender</th>
              <th>Fee (GAS)</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in filteredTransactions" :key="tx.hash">
              <td>
                <router-link :to="'/transaction/' + tx.hash" class="text-primary-500 hover:text-primary-600 font-medium">
                  {{ truncate(tx.hash) }}
                </router-link>
              </td>
              <td>{{ formatAge(tx.timestamp) }}</td>
              <td>
                <router-link v-if="tx.sender" :to="'/address/' + tx.sender" class="text-primary-500 hover:text-primary-600 font-mono text-sm">
                  {{ tx.sender }}
                </router-link>
                <span v-else class="text-mid">—</span>
              </td>
              <td>{{ formatFee(tx) }}</td>
              <td>{{ tx.size }} bytes</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
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
