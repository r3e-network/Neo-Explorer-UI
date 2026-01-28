<template>
  <div class="address-detail-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-gray-500 mb-4">
        <router-link to="/" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/account/1" class="hover:text-primary-500">Addresses</router-link>
        <span class="mx-2">/</span>
        <span class="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{{ truncateAddr }}</span>
      </nav>

      <!-- Page Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
          <svg class="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Address</h1>
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm text-gray-600 dark:text-gray-400">{{ address }}</span>
            <button @click="copyAddress" class="text-gray-400 hover:text-primary-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Balance Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500 mb-1">NEO Balance</p>
          <p class="text-xl font-bold text-gray-800 dark:text-white">{{ neoBalance }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500 mb-1">GAS Balance</p>
          <p class="text-xl font-bold text-gray-800 dark:text-white">{{ gasBalance }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500 mb-1">Transactions</p>
          <p class="text-xl font-bold text-gray-800 dark:text-white">{{ txCount }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p class="text-sm text-gray-500 mb-1">Tokens</p>
          <p class="text-xl font-bold text-gray-800 dark:text-white">{{ tokenCount }}</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div class="border-b border-gray-200 dark:border-gray-700">
          <nav class="flex -mb-px">
            <button v-for="tab in tabs" :key="tab.key"
              @click="activeTab = tab.key"
              :class="['px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700']">
              {{ tab.label }}
            </button>
          </nav>
        </div>
        <div class="p-4">
          <div v-if="activeTab === 'transactions'" class="text-gray-500 text-center py-8">
            Transaction history coming soon...
          </div>
          <div v-else-if="activeTab === 'tokens'" class="text-gray-500 text-center py-8">
            Token holdings coming soon...
          </div>
          <div v-else class="text-gray-500 text-center py-8">
            NFT collection coming soon...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { accountService } from '@/services'

export default {
  name: 'AddressDetailNew',
  data() {
    return {
      neoBalance: '0',
      gasBalance: '0',
      txCount: 0,
      tokenCount: 0,
      loading: false,
      activeTab: 'transactions',
      tabs: [
        { key: 'transactions', label: 'Transactions' },
        { key: 'tokens', label: 'Token Holdings' },
        { key: 'nfts', label: 'NFTs' }
      ]
    }
  },
  computed: {
    address() { return this.$route.params.accountAddress },
    truncateAddr() {
      const a = this.address
      return a ? `${a.slice(0, 8)}...${a.slice(-6)}` : ''
    }
  },
  watch: {
    address: { immediate: true, handler(addr) { if (addr) this.loadData(addr) } }
  },
  methods: {
    async loadData(addr) {
      this.loading = true
      try {
        const data = await accountService.getByAddress(addr)
        this.neoBalance = data?.neoBalance || '0'
        this.gasBalance = data?.gasBalance || '0'
        this.txCount = data?.txCount || 0
        this.tokenCount = data?.tokenCount || 0
      } catch (e) {
        console.error('Failed to load address:', e)
      } finally {
        this.loading = false
      }
    },
    copyAddress() {
      if (this.address) navigator.clipboard.writeText(this.address)
    }
  }
}
</script>
