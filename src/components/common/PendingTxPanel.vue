<template>
  <div class="pending-tx-panel" v-if="isOpen">
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
      <div class="flex items-center gap-2">
        <span class="flex h-2 w-2">
          <span class="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
        </span>
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ t("pendingTx.title") }}</h3>
        <span
          class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
        >
          {{ pendingTxs.length }}
        </span>
      </div>
      <button
        @click="$emit('close')"
        aria-label="Close pending transaction panel"
        class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="max-h-[400px] overflow-y-auto">
      <div v-if="pendingTxs.length === 0" class="p-6 text-center text-sm text-gray-500">{{ t("pendingTx.empty") }}</div>
      <div
        v-else
        v-for="tx in pendingTxs"
        :key="tx.hash"
        class="flex items-center justify-between border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
      >
        <div class="min-w-0 flex-1">
          <router-link
            :to="`/transaction-info/${tx.hash}`"
            class="block truncate font-mono text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            @click="$emit('close')"
          >
            {{ truncateHash(tx.hash, 10, 8) }}
          </router-link>
          <div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span v-if="tx.from"> From: {{ truncateHash(tx.from, 6, 4) }} </span>
            <span v-if="tx.to" class="text-gray-400">→</span>
            <span v-if="tx.to"> To: {{ truncateHash(tx.to, 6, 4) }} </span>
          </div>
        </div>
        <div class="ml-4 flex-shrink-0 text-right">
          <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ formatGas(tx.netfee || tx.sysfee || 0) }} GAS
          </div>
          <div class="text-xs text-gray-500">
            {{ formatAge(tx.timestamp || Date.now() / 1000) }}
          </div>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
      <button
        @click="refresh"
        :disabled="loading"
        class="flex w-full items-center justify-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <svg class="h-4 w-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {{ loading ? t("pendingTx.refreshing") : t("pendingTx.refresh") }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { truncateHash, formatGas, formatAge } from "@/utils/explorerFormat";
import { PENDING_TX_POLL_INTERVAL } from "@/constants";
import { transactionService } from "@/services";

const { t } = useI18n();

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});

defineEmits(["close"]);

const pendingTxs = ref([]);
const loading = ref(false);
let pollInterval = null;

async function fetchPendingTransactions() {
  loading.value = true;
  try {
    pendingTxs.value = await transactionService.getPendingTransactions(20);
  } catch (error) {
    if (import.meta.env.DEV) console.warn("Failed to fetch pending transactions:", error);
  } finally {
    loading.value = false;
  }
}

function startPolling() {
  stopPolling();
  fetchPendingTransactions();
  pollInterval = setInterval(fetchPendingTransactions, PENDING_TX_POLL_INTERVAL);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function refresh() {
  fetchPendingTransactions();
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopPolling();
  } else if (props.isOpen) {
    startPolling();
  }
}

onMounted(() => {
  if (props.isOpen) {
    startPolling();
  }
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      startPolling();
    } else {
      stopPolling();
    }
  }
);

onUnmounted(() => {
  stopPolling();
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});

defineExpose({ startPolling, stopPolling, refresh });
</script>

<style scoped>
.pending-tx-panel {
  @apply absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900;
}
</style>
