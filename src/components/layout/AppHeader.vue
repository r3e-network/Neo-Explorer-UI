<template>
  <header class="app-header">
    <div class="container mx-auto px-4 flex items-center h-16">
      <router-link to="/" class="logo">
        <img src="@/assets/logo.svg" alt="Neo Explorer" class="h-8" />
      </router-link>
      <nav class="nav-menu">
        <router-link to="/blocks/1">{{ $t('authLayout.blocks') }}</router-link>
        <router-link to="/transactions/1">{{ $t('authLayout.txs') }}</router-link>
        <router-link to="/tokens/Nep17/1">{{ $t('authLayout.tokens') }}</router-link>
        <router-link to="/contracts/1">{{ $t('authLayout.contracts') }}</router-link>
      </nav>
      <div class="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>

<script>
import ThemeToggle from '@/components/common/ThemeToggle.vue'
export default {
  name: 'AppHeader',
  components: { ThemeToggle }
}
</script>

<style scoped>
.app-header {
  @apply bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50;
}
.nav-menu {
  @apply hidden md:flex items-center gap-6 ml-8;
}
.nav-menu a {
  @apply text-gray-600 dark:text-gray-300 hover:text-primary-500 text-sm font-medium;
}
</style>
