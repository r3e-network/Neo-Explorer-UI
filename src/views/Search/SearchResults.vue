<template>
  <div class="search-results-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Search Results</h1>
        <p class="text-gray-500">Results for: <span class="font-mono">{{ query }}</span></p>
      </div>

      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
      </div>

      <div v-else-if="!results.length" class="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
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
export default {
  name: 'SearchResults',
  data() {
    return { results: [], loading: false }
  },
  computed: {
    query() {
      return this.$route.query.q || ''
    }
  }
}
</script>
