<template>
  <header class="app-header bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
    <div class="container mx-auto px-4 flex items-center h-16">
      <!-- Logo -->
      <router-link to="/" class="flex items-center gap-2">
        <div class="w-8 h-8 bg-neo-green rounded-lg flex items-center justify-center">
          <span class="text-white font-bold">N</span>
        </div>
        <span class="font-bold text-gray-800 dark:text-white hidden sm:block">Neo Explorer</span>
      </router-link>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-6 ml-8">
        <router-link to="/blocks/1" class="nav-link">Blocks</router-link>
        <router-link to="/Transactions/1" class="nav-link">Transactions</router-link>
        <router-link to="/tokens/nep17/1" class="nav-link">Tokens</router-link>
        <router-link to="/contracts/1" class="nav-link">Contracts</router-link>
        <router-link to="/account/1" class="nav-link">Addresses</router-link>
      </nav>

      <!-- Right Side -->
      <div class="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <!-- Mobile Menu Button -->
        <button @click="mobileMenuOpen = !mobileMenuOpen" class="md:hidden p-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script>
import ThemeToggle from '@/components/common/ThemeToggle.vue'

export default {
  name: 'AppHeader',
  components: { ThemeToggle },
  data() {
    return { mobileMenuOpen: false }
  }
}
</script>

<style scoped>
.nav-link {
  @apply text-gray-600 dark:text-gray-300 hover:text-primary-500 text-sm font-medium transition-colors;
}
.nav-link.router-link-active {
  @apply text-primary-500;
}
</style>
