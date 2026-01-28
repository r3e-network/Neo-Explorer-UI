<template>
  <div class="not-found min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div class="text-center px-4">
      <div class="mb-8">
        <svg class="w-32 h-32 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <h1 class="text-7xl font-bold text-gray-300 dark:text-gray-600 mb-4">404</h1>
      <h2 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Page Not Found</h2>
      <p class="text-gray-500 mb-8 max-w-md mx-auto">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <router-link to="/" 
          class="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors">
          Go Home
        </router-link>
        <button @click="$router.back()" 
          class="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors">
          Go Back
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'NotFoundNew' }
</script>
