<template>
  <div class="token-detail-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-gray-500 mb-4">
        <router-link to="/" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/tokens/nep17/1" class="hover:text-primary-500">Tokens</router-link>
        <span class="mx-2">/</span>
        <span class="text-gray-700 dark:text-gray-300">{{ token.symbol }}</span>
      </nav>

      <!-- Page Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <span class="text-blue-600 font-bold">{{ token.symbol?.charAt(0) }}</span>
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
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-card">
          <p class="text-sm text-gray-500 mb-1">Total Supply</p>
          <p class="text-lg font-bold text-gray-800 dark:text-white">{{ formatSupply }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-card">
          <p class="text-sm text-gray-500 mb-1">Holders</p>
          <p class="text-lg font-bold text-gray-800 dark:text-white">{{ token.holders || 0 }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-card">
          <p class="text-sm text-gray-500 mb-1">Transfers</p>
          <p class="text-lg font-bold text-gray-800 dark:text-white">{{ token.transfers || 0 }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-card">
          <p class="text-sm text-gray-500 mb-1">Decimals</p>
          <p class="text-lg font-bold text-gray-800 dark:text-white">{{ token.decimals }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { tokenService } from '@/services'

export default {
  name: 'TokenDetailNew',
  data() {
    return { token: {}, loading: false }
  },
  computed: {
    formatSupply() {
      const s = this.token?.totalsupply
      if (!s) return '0'
      const d = this.token?.decimals || 0
      return (s / Math.pow(10, d)).toLocaleString()
    }
  },
  watch: {
    '$route.params.hash': {
      immediate: true,
      handler(hash) { if (hash) this.loadToken(hash) }
    }
  },
  methods: {
    async loadToken(hash) {
      this.loading = true
      try {
        this.token = await tokenService.getByHash(hash) || {}
      } catch (e) {
        console.error('Failed to load token:', e)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
