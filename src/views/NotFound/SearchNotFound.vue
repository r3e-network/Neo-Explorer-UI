<template>
  <div
    class="search-not-found min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
  >
    <div class="text-center px-4">
      <div class="text-8xl mb-6">🔍</div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        No Results Found
      </h1>
      <p class="text-gray-500 mb-6 max-w-md mx-auto">
        We couldn't find what you're looking for. Try searching for:
      </p>
      <div
        class="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 text-left max-w-sm mx-auto"
      >
        <ul class="space-y-2 text-gray-600 dark:text-gray-400">
          <li class="flex items-center gap-2">
            <span class="w-2 h-2 bg-primary-500 rounded-full"></span>
            Block height or hash
          </li>
          <li class="flex items-center gap-2">
            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
            Transaction hash
          </li>
          <li class="flex items-center gap-2">
            <span class="w-2 h-2 bg-orange-500 rounded-full"></span>
            Neo address (N...)
          </li>
          <li class="flex items-center gap-2">
            <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
            Contract hash
          </li>
        </ul>
      </div>
      <router-link
        to="/"
        class="inline-block px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
      >
        Back to Home
      </router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: "SearchNotFound",
};
</script>
