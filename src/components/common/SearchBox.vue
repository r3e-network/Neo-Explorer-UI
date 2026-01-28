<template>
  <div class="search-box relative">
    <div class="relative">
      <input
        v-model="query"
        type="text"
        :placeholder="placeholder"
        class="search-input w-full px-5 py-4 pl-12 pr-24 rounded-xl bg-white dark:bg-gray-800 
               border border-gray-200 dark:border-gray-700 
               text-gray-800 dark:text-white placeholder-gray-400
               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
               shadow-lg transition-all duration-200"
        @keyup.enter="handleSearch"
        @input="handleInput"
      />
      <div class="absolute left-4 top-1/2 -translate-y-1/2">
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>
      <button
        @click="handleSearch"
        :disabled="loading || !query.trim()"
        class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 
               bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 
               text-white rounded-lg font-medium text-sm
               transition-colors duration-200 flex items-center gap-2"
      >
        <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span>Search</span>
      </button>
    </div>
    
    <!-- Search Suggestions -->
    <div v-if="showSuggestions && suggestions.length" 
         class="suggestions absolute w-full mt-2 bg-white dark:bg-gray-800 
                rounded-xl shadow-dropdown border border-gray-100 dark:border-gray-700 
                overflow-hidden z-50">
      <div v-for="(item, index) in suggestions" :key="index"
           class="suggestion-item px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 
                  cursor-pointer flex items-center gap-3 transition-colors"
           @click="selectSuggestion(item)">
        <span :class="getTypeIcon(item.type)" class="w-8 h-8 rounded-lg flex items-center justify-center text-sm">
          {{ getTypeLabel(item.type) }}
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 dark:text-white truncate">{{ item.label }}</p>
          <p class="text-xs text-gray-500 truncate">{{ item.value }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SearchBox',
  props: {
    placeholder: { type: String, default: 'Search...' },
    loading: { type: Boolean, default: false }
  },
  emits: ['search'],
  data() {
    return {
      query: '',
      suggestions: [],
      showSuggestions: false
    }
  },
  methods: {
    handleSearch() {
      if (this.query.trim()) {
        this.showSuggestions = false
        this.$emit('search', this.query.trim())
      }
    },
    handleInput() {
      // Could implement auto-suggestions here
      this.showSuggestions = false
    },
    selectSuggestion(item) {
      this.query = item.value
      this.showSuggestions = false
      this.$emit('search', item.value)
    },
    getTypeIcon(type) {
      const icons = {
        block: 'bg-primary-100 text-primary-600',
        transaction: 'bg-green-100 text-green-600',
        address: 'bg-orange-100 text-orange-600',
        contract: 'bg-purple-100 text-purple-600',
        token: 'bg-blue-100 text-blue-600'
      }
      return icons[type] || icons.block
    },
    getTypeLabel(type) {
      const labels = { block: 'Bk', transaction: 'Tx', address: 'Ad', contract: 'Ct', token: 'Tk' }
      return labels[type] || '?'
    }
  }
}
</script>
