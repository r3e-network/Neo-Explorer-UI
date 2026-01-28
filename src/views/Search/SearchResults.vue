<template>
  <div class="search-results-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Search Results</h1>
        <p class="text-gray-500">Results for: <span class="font-mono">{{ query }}</span></p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
        <p class="text-gray-500 mt-4">Searching...</p>
      </div>

      <!-- Result Found -->
      <div v-else-if="result.type" class="bg-white dark:bg-gray-800 rounded-xl p-6">
        <div class="flex items-center gap-3 mb-4">
          <span :class="typeClass" class="px-3 py-1 rounded-full text-sm font-medium">
            {{ result.type }}
          </span>
          <span class="text-gray-500">Found 1 result</span>
        </div>
        <div class="border-t pt-4">
          <router-link :to="resultLink" class="text-primary-500 hover:underline font-mono">
            {{ query }}
          </router-link>
        </div>
      </div>

      <!-- No Results -->
      <div v-else class="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <h3 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No results found</h3>
        <p class="text-gray-500 mb-4">Try searching for blocks, transactions, addresses, or contracts</p>
        <router-link to="/" class="text-primary-500">← Back to Home</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { searchService } from '@/services'

export default {
  name: 'SearchResults',
  data() {
    return { result: {}, loading: false }
  },
  computed: {
    query() { return this.$route.query.q || '' },
    typeClass() {
      const classes = {
        block: 'bg-blue-100 text-blue-700',
        transaction: 'bg-green-100 text-green-700',
        address: 'bg-orange-100 text-orange-700',
        contract: 'bg-purple-100 text-purple-700'
      }
      return classes[this.result.type] || 'bg-gray-100 text-gray-700'
    },
    resultLink() {
      const links = {
        block: `/blockinfo/${this.query}`,
        transaction: `/transactionInfo/${this.query}`,
        address: `/accountprofile/${this.query}`,
        contract: `/contractinfo/${this.query}`
      }
      return links[this.result.type] || '/'
    }
  },
  watch: {
    query: { immediate: true, handler(q) { if (q) this.search(q) } }
  },
  methods: {
    async search(q) {
      this.loading = true
      try {
        this.result = await searchService.search(q) || {}
      } catch (e) {
        console.error('Search error:', e)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
