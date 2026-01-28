<template>
  <div class="token-detail-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-gray-500 mb-4">
        <router-link to="/" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/tokens/nep17/1" class="hover:text-primary-500"
          >Tokens</router-link
        >
        <span class="mx-2">/</span>
        <span class="text-gray-700 dark:text-gray-300">{{ token.symbol }}</span>
      </nav>

      <!-- Page Header -->
      <div class="flex items-center gap-3 mb-6">
        <div
          class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center"
        >
          <span class="text-blue-600 font-bold text-lg">{{
            token.symbol?.charAt(0)
          }}</span>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ token.name }} ({{ token.symbol }})
          </h1>
          <span class="text-sm text-gray-500">NEP-17 Token</span>
        </div>
      </div>

      <!-- Token Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500 mb-1">Total Supply</p>
          <p class="text-lg font-bold text-gray-800 dark:text-white">
            {{ formatSupply }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500 mb-1">Holders</p>
          <p class="text-lg font-bold text-gray-800 dark:text-white">
            {{ formatNumber(token.holders) }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500 mb-1">Transfers</p>
          <p class="text-lg font-bold text-gray-800 dark:text-white">
            {{ formatNumber(token.transfers) }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500 mb-1">Decimals</p>
          <p class="text-lg font-bold text-gray-800 dark:text-white">
            {{ token.decimals }}
          </p>
        </div>
      </div>

      <!-- Contract Info -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 p-4">
        <div class="flex flex-col md:flex-row md:items-center gap-2">
          <span class="text-gray-500 text-sm">Contract:</span>
          <span class="font-mono text-sm break-all">{{ token.hash }}</span>
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

      <!-- Tabs -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div class="border-b border-gray-200 dark:border-gray-700">
          <nav class="flex -mb-px">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              :class="[
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ]"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>
        <div class="p-4">
          <div
            v-if="activeTab === 'transfers'"
            class="text-gray-500 text-center py-8"
          >
            Token transfers coming soon...
          </div>
          <div v-else class="text-gray-500 text-center py-8">
            Token holders coming soon...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { tokenService } from "@/services";

export default {
  name: "TokenDetailNew",
  data() {
    return {
      token: {},
      loading: false,
      activeTab: "transfers",
      tabs: [
        { key: "transfers", label: "Transfers" },
        { key: "holders", label: "Holders" },
      ],
    };
  },
  computed: {
    formatSupply() {
      const s = this.token?.totalsupply;
      if (!s) return "0";
      const d = this.token?.decimals || 0;
      return (s / Math.pow(10, d)).toLocaleString();
    },
  },
  watch: {
    "$route.params.hash": {
      immediate: true,
      handler(hash) {
        if (hash) this.loadToken(hash);
      },
    },
  },
  methods: {
    async loadToken(hash) {
      this.loading = true;
      try {
        this.token = (await tokenService.getByHash(hash)) || {};
      } catch (e) {
        console.error("Failed to load token:", e);
      } finally {
        this.loading = false;
      }
    },
    copyHash() {
      if (this.token?.hash) navigator.clipboard.writeText(this.token.hash);
    },
    formatNumber(n) {
      return n ? n.toLocaleString() : "0";
    },
  },
};
</script>
