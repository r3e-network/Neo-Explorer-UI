<template>
  <footer class="app-footer">
    <div class="container mx-auto px-4 py-8">
      <div class="text-center text-gray-500 text-sm">
        <p>© 2024 Neo Explorer. {{ $t('bottomBar.description') }}</p>
      </div>
    </div>
  </footer>
</template>

<script>
export default { name: 'AppFooter' }
</script>

<style scoped>
.app-footer {
  @apply bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto;
}
</style>
