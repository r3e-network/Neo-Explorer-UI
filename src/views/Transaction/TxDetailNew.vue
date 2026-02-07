<template>
  <div class="tx-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-gray-500 mb-4">
        <router-link to="/" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/Transactions/1" class="hover:text-primary-500">Transactions</router-link>
        <span class="mx-2">/</span>
        <span class="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{{ truncateHash }}</span>
      </nav>

      <!-- Page Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="statusBgClass">
          <svg class="w-6 h-6" :class="statusIconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              v-if="isSuccess"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Transaction Details</h1>
          <StatusBadge :status="txStatus" />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-4">
        <div class="etherscan-card p-6">
          <div class="animate-pulse space-y-3">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" v-for="i in 6" :key="i"></div>
          </div>
        </div>
      </div>

      <!-- Transaction Content -->
      <div v-else class="space-y-6">
        <!-- Overview Card -->
        <div class="etherscan-card">
          <div class="p-4 border-b border-card-border dark:border-card-border-dark">
            <h2 class="font-semibold text-gray-800 dark:text-white">Overview</h2>
          </div>
          <div class="divide-y divide-card-border dark:divide-card-border-dark">
            <InfoRow
              label="Transaction Hash"
              tooltip="A unique identifier for this transaction"
              :value="tx.hash"
              :copyable="!!tx.hash"
              :copy-value="tx.hash"
            />
            <InfoRow label="Status" tooltip="The execution status of the transaction">
              <StatusBadge :status="txStatus" />
            </InfoRow>
            <InfoRow label="Block">
              <router-link :to="`/blockinfo/${tx.blockhash}`" class="etherscan-link">
                #{{ tx.blockIndex }}
              </router-link>
            </InfoRow>
            <InfoRow label="Timestamp" :value="formatTime(tx.blocktime)" />
          </div>
        </div>

        <!-- Sender & Fees Card -->
        <div class="etherscan-card">
          <div class="p-4 border-b border-card-border dark:border-card-border-dark">
            <h2 class="font-semibold text-gray-800 dark:text-white">Transaction Action</h2>
          </div>
          <div class="divide-y divide-card-border dark:divide-card-border-dark">
            <InfoRow label="From" tooltip="The sending address of this transaction">
              <router-link
                v-if="tx.sender"
                :to="`/accountprofile/${tx.sender}`"
                class="font-mono text-sm etherscan-link"
              >
                {{ tx.sender }}
              </router-link>
              <span v-else class="text-text-secondary">-</span>
            </InfoRow>
            <InfoRow label="Network Fee" :value="`${formatGas(tx.netfee)} GAS`" />
            <InfoRow label="System Fee" :value="`${formatGas(tx.sysfee)} GAS`" />
            <InfoRow label="Size" :value="`${tx.size || 0} bytes`" />
          </div>
        </div>

        <!-- More Details (collapsible) -->
        <div class="etherscan-card">
          <button
            class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
            @click="showMore = !showMore"
          >
            <span class="text-sm font-medium text-primary-500"> Click to {{ showMore ? "hide" : "show" }} more </span>
            <svg
              class="h-4 w-4 text-primary-500 transition-transform duration-200"
              :class="{ 'rotate-180': showMore }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <transition name="expand">
            <div v-show="showMore" class="border-t border-card-border dark:border-card-border-dark">
              <div class="divide-y divide-card-border dark:divide-card-border-dark">
                <InfoRow label="Nonce" :value="tx.nonce != null ? String(tx.nonce) : '-'" />
                <InfoRow label="Version" :value="tx.version != null ? String(tx.version) : '-'" />
                <InfoRow label="Script">
                  <pre
                    v-if="tx.script"
                    class="max-h-40 overflow-auto rounded bg-gray-50 p-2 font-mono text-xs text-text-primary dark:bg-gray-800 dark:text-gray-300"
                    >{{ tx.script }}</pre
                  >
                  <span v-else class="text-text-secondary">-</span>
                </InfoRow>
                <InfoRow label="Witnesses">
                  <div v-if="tx.witnesses && tx.witnesses.length">
                    <div v-for="(w, i) in tx.witnesses" :key="i" class="mb-2 rounded bg-gray-50 p-2 dark:bg-gray-800">
                      <p class="text-xs text-text-secondary">Witness {{ i + 1 }}</p>
                      <p class="mt-1 break-all font-mono text-xs text-text-primary dark:text-gray-300">
                        {{ w.invocation || w }}
                      </p>
                    </div>
                  </div>
                  <span v-else class="text-text-secondary">-</span>
                </InfoRow>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { transactionService } from "@/services";
import StatusBadge from "@/components/common/StatusBadge.vue";
import InfoRow from "@/components/common/InfoRow.vue";

export default {
  name: "TxDetailNew",
  components: { StatusBadge, InfoRow },
  data() {
    return { tx: {}, loading: false, showMore: false };
  },
  computed: {
    truncateHash() {
      const h = this.tx?.hash;
      return h ? `${h.slice(0, 10)}...${h.slice(-6)}` : "";
    },
    isSuccess() {
      return this.tx?.vmstate === "HALT" || !this.tx?.vmstate;
    },
    statusBgClass() {
      return this.isSuccess ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900";
    },
    statusIconClass() {
      return this.isSuccess ? "text-green-500" : "text-red-500";
    },
    txStatus() {
      return this.isSuccess ? "success" : "failed";
    },
  },
  watch: {
    "$route.params.txhash": {
      immediate: true,
      handler(hash) {
        if (hash) this.loadTx(hash);
      },
    },
  },
  methods: {
    async loadTx(hash) {
      this.loading = true;
      try {
        this.tx = (await transactionService.getByHash(hash)) || {};
      } catch {
        // Service layer handles error logging
      } finally {
        this.loading = false;
      }
    },
    formatTime(ts) {
      if (!ts) return "-";
      // neo3fura returns millisecond timestamps (13+ digits); handle both formats
      const ms = ts > 1e12 ? ts : ts * 1000;
      return new Date(ms).toLocaleString();
    },
    formatGas(value) {
      if (!value) return "0";
      return (value / 100000000).toFixed(8);
    },
  },
};
</script>
