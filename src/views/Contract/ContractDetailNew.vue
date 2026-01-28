<template>
  <div class="contract-detail-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-gray-500 mb-4">
        <router-link to="/" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/contracts/1" class="hover:text-primary-500">Contracts</router-link>
        <span class="mx-2">/</span>
        <span class="text-gray-700 dark:text-gray-300">{{ contract.name || 'Contract' }}</span>
      </nav>

      <!-- Page Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
          <svg class="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ contract.name }}</h1>
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm text-gray-500">{{ truncateHash }}</span>
            <button @click="copyHash" class="text-gray-400 hover:text-primary-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Overview Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
        <div class="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 class="font-semibold text-gray-800 dark:text-white">Overview</h2>
        </div>
        <div class="p-4 md:p-6 grid md:grid-cols-2 gap-4">
          <div>
            <span class="text-gray-500 text-sm">Contract Hash</span>
            <p class="font-mono text-sm break-all">{{ contract.hash }}</p>
          </div>
          <div>
            <span class="text-gray-500 text-sm">Name</span>
            <p class="font-medium">{{ contract.name || '-' }}</p>
          </div>
          <div>
            <span class="text-gray-500 text-sm">Creator</span>
            <router-link v-if="contract.creator" :to="`/accountprofile/${contract.creator}`" 
                         class="text-primary-500 font-mono text-sm block">{{ contract.creator }}</router-link>
            <span v-else>-</span>
          </div>
          <div>
            <span class="text-gray-500 text-sm">Invocations</span>
            <p class="font-medium">{{ formatNumber(contract.invocations) }}</p>
          </div>
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
            Contract transactions coming soon...
          </div>
          <div v-else-if="activeTab === 'code'" class="text-gray-500 text-center py-8">
            Contract code coming soon...
          </div>
          <div v-else class="text-gray-500 text-center py-8">
            Contract events coming soon...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { contractService } from '@/services'

export default {
  name: 'ContractDetailNew',
  data() {
    return {
      contract: {},
      loading: false,
      activeTab: 'transactions',
      tabs: [
        { key: 'transactions', label: 'Transactions' },
        { key: 'code', label: 'Code' },
        { key: 'events', label: 'Events' }
      ]
    }
  },
  computed: {
    truncateHash() {
      const h = this.contract?.hash
      return h ? `${h.slice(0, 10)}...${h.slice(-6)}` : ''
    }
  },
  watch: {
    '$route.params.hash': {
      immediate: true,
      handler(hash) { if (hash) this.loadContract(hash) }
    }
  },
  methods: {
    async loadContract(hash) {
      this.loading = true
      try {
        this.contract = await contractService.getByHash(hash) || {}
      } catch (e) {
        console.error('Failed to load contract:', e)
      } finally {
        this.loading = false
      }
    },
    copyHash() {
      if (this.contract?.hash) navigator.clipboard.writeText(this.contract.hash)
    },
    formatNumber(n) {
      return n ? n.toLocaleString() : '0'
    }
  }
}
</script>
