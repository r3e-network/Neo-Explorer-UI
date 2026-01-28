<template>
  <div
    class="page-not-found min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
  >
    <div class="text-center px-4">
      <h1 class="text-8xl font-bold text-gray-200 dark:text-gray-700 mb-4">
        404
      </h1>
      <h2 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Page Not Found
      </h2>
      <p class="text-gray-500 mb-8">
        Sorry, the page you're looking for doesn't exist.
      </p>
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
  name: "PageNotFound",
};
</script>
