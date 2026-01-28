<template>
  <div class="api-docs min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">API Documentation</h1>
        <p class="text-gray-500">Neo Explorer API reference</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Sidebar -->
        <div class="lg:col-span-1">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sticky top-4">
            <h3 class="font-semibold text-gray-800 dark:text-white mb-3">Categories</h3>
            <nav class="space-y-1">
              <a v-for="cat in categories" :key="cat.key"
                @click="activeCategory = cat.key"
                :class="['block px-3 py-2 rounded-lg cursor-pointer transition-colors',
                  activeCategory === cat.key 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700']">
                {{ cat.label }}
              </a>
            </nav>
          </div>
        </div>

        <!-- Content -->
        <div class="lg:col-span-3 space-y-4">
          <div v-for="method in filteredMethods" :key="method.name"
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">GET</span>
              <h3 class="font-mono font-semibold">{{ method.name }}</h3>
            </div>
            <p class="text-gray-500 text-sm mb-4">{{ method.desc }}</p>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <code class="text-sm font-mono">/api/{{ method.endpoint }}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ApiDocs',
  data() {
    return {
      activeCategory: 'blocks',
      categories: [
        { key: 'blocks', label: 'Blocks' },
        { key: 'transactions', label: 'Transactions' },
        { key: 'addresses', label: 'Addresses' },
        { key: 'contracts', label: 'Contracts' }
      ],
      methods: [
        { name: 'GetBlockCount', endpoint: 'blocks/count', desc: 'Get current block height', category: 'blocks' },
        { name: 'GetBlockByHash', endpoint: 'blocks/{hash}', desc: 'Get block by hash', category: 'blocks' },
        { name: 'GetTransactionList', endpoint: 'transactions', desc: 'Get transaction list', category: 'transactions' },
        { name: 'GetTransactionByHash', endpoint: 'transactions/{hash}', desc: 'Get transaction by hash', category: 'transactions' },
        { name: 'GetAddressInfo', endpoint: 'addresses/{address}', desc: 'Get address info', category: 'addresses' },
        { name: 'GetContractInfo', endpoint: 'contracts/{hash}', desc: 'Get contract info', category: 'contracts' }
      ]
    }
  },
  computed: {
    filteredMethods() {
      return this.methods.filter(m => m.category === this.activeCategory)
    }
  }
}
</script>
