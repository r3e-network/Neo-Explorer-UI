<template>
  <div class="error-state text-center py-12 px-4">
    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
      <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    </div>
    <p class="text-gray-700 dark:text-gray-300 font-semibold mb-1">{{ title }}</p>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ message }}</p>
    <button v-if="showRetry" @click="$emit('retry')"
      class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors">
      Try Again
    </button>
  </div>
</template>

<script>
export default {
  name: 'ErrorState',
  props: {
    title: { type: String, default: 'Something went wrong' },
    message: { type: String, default: 'Failed to load data. Please try again.' },
    showRetry: { type: Boolean, default: true }
  },
  emits: ['retry']
}
</script>
