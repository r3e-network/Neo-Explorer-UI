<template>
  <div class="error-page min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div class="text-center px-4">
      <div class="mb-8">
        <svg class="w-24 h-24 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </div>
      <h1 class="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">500</h1>
      <h2 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Server Error</h2>
      <p class="text-gray-500 mb-8 max-w-md mx-auto">
        Something went wrong on our end. Please try again later.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <router-link to="/" 
          class="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors">
          Go Home
        </router-link>
        <button @click="reload" 
          class="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors">
          Try Again
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ErrorPage',
  methods: {
    reload() {
      window.location.reload()
    }
  }
}
</script>
