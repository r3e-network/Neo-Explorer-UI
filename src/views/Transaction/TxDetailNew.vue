<template>
  <div class="tx-detail-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-gray-500 mb-4">
        <router-link to="/" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/Transactions/1" class="hover:text-primary-500"
          >Transactions</router-link
        >
        <span class="mx-2">/</span>
        <span class="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{{
          truncateHash
        }}</span>
      </nav>

      <!-- Page Header -->
      <div class="flex items-center gap-3 mb-6">
        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center"
          :class="statusBgClass"
        >
          <svg
            class="w-6 h-6"
            :class="statusIconClass"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Transaction Details
          </h1>
          <span
            :class="statusBadgeClass"
            class="text-xs px-2 py-0.5 rounded-full"
          >
            {{ isSuccess ? "Success" : "Failed" }}
          </span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6">
          <div class="animate-pulse space-y-3">
            <div
              class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"
              v-for="i in 6"
              :key="i"
            ></div>
          </div>
        </div>
      </div>

      <!-- Transaction Content -->
      <div v-else class="space-y-6">
        <!-- Overview Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <div class="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 class="font-semibold text-gray-800 dark:text-white">
              Overview
            </h2>
          </div>
          <div class="p-4 md:p-6 space-y-4">
            <div
              class="flex flex-col md:flex-row md:items-center py-2 border-b border-gray-50 dark:border-gray-700"
            >
              <span class="text-gray-500 w-40 mb-1 md:mb-0"
                >Transaction Hash:</span
              >
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="font-mono text-sm break-all">{{ tx.hash }}</span>
                <button
                  @click="copyHash"
                  class="text-gray-400 hover:text-primary-500"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div
              class="flex flex-col md:flex-row md:items-center py-2 border-b border-gray-50 dark:border-gray-700"
            >
              <span class="text-gray-500 w-40 mb-1 md:mb-0">Status:</span>
              <span
                :class="statusBadgeClass"
                class="px-2 py-1 rounded text-sm w-fit"
              >
                {{ tx.vmstate || "HALT" }}
              </span>
            </div>
            <div
              class="flex flex-col md:flex-row md:items-center py-2 border-b border-gray-50 dark:border-gray-700"
            >
              <span class="text-gray-500 w-40 mb-1 md:mb-0">Block:</span>
              <router-link
                :to="`/blockinfo/${tx.blockhash}`"
                class="text-primary-500 hover:underline"
              >
                #{{ tx.blockindex }}
              </router-link>
            </div>
            <div
              class="flex flex-col md:flex-row md:items-center py-2 border-b border-gray-50 dark:border-gray-700"
            >
              <span class="text-gray-500 w-40 mb-1 md:mb-0">Timestamp:</span>
              <span>{{ formatTime(tx.blocktime) }}</span>
            </div>
          </div>
        </div>

        <!-- Sender & Fees Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <div class="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 class="font-semibold text-gray-800 dark:text-white">
              Transaction Action
            </h2>
          </div>
          <div class="p-4 md:p-6 space-y-4">
            <div
              class="flex flex-col md:flex-row md:items-center py-2 border-b border-gray-50 dark:border-gray-700"
            >
              <span class="text-gray-500 w-40 mb-1 md:mb-0">From:</span>
              <router-link
                v-if="tx.sender"
                :to="`/accountprofile/${tx.sender}`"
                class="text-primary-500 font-mono text-sm hover:underline"
              >
                {{ tx.sender }}
              </router-link>
              <span v-else class="text-gray-400">-</span>
            </div>
            <div
              class="flex flex-col md:flex-row md:items-center py-2 border-b border-gray-50 dark:border-gray-700"
            >
              <span class="text-gray-500 w-40 mb-1 md:mb-0">Network Fee:</span>
              <span>{{ formatGas(tx.netfee) }} GAS</span>
            </div>
            <div
              class="flex flex-col md:flex-row md:items-center py-2 border-b border-gray-50 dark:border-gray-700"
            >
              <span class="text-gray-500 w-40 mb-1 md:mb-0">System Fee:</span>
              <span>{{ formatGas(tx.sysfee) }} GAS</span>
            </div>
            <div class="flex flex-col md:flex-row md:items-center py-2">
              <span class="text-gray-500 w-40 mb-1 md:mb-0">Size:</span>
              <span>{{ tx.size || 0 }} bytes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { transactionService } from "@/services";

export default {
  name: "TxDetailNew",
  data() {
    return { tx: {}, loading: false };
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
      return this.isSuccess
        ? "bg-green-100 dark:bg-green-900"
        : "bg-red-100 dark:bg-red-900";
    },
    statusIconClass() {
      return this.isSuccess ? "text-green-500" : "text-red-500";
    },
    statusBadgeClass() {
      return this.isSuccess
        ? "bg-green-100 text-green-600"
        : "bg-red-100 text-red-600";
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
      } catch (e) {
        console.error("Failed to load tx:", e);
      } finally {
        this.loading = false;
      }
    },
    formatTime(ts) {
      return ts ? new Date(ts * 1000).toLocaleString() : "-";
    },
    formatGas(value) {
      if (!value) return "0";
      return (value / 100000000).toFixed(8);
    },
    copyHash() {
      if (this.tx?.hash) {
        navigator.clipboard.writeText(this.tx.hash);
      }
    },
  },
};
</script>
