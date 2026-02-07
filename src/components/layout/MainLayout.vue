<template>
  <div class="min-h-screen bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
    <div class="flex min-h-screen flex-col">
      <AppHeader />
      <main class="w-full flex-1">
        <router-view />
      </main>
      <AppFooter />
    </div>
  </div>
</template>

<script>
import AppHeader from "./AppHeader.vue";
import AppFooter from "./AppFooter.vue";

export default {
  name: "MainLayout",
  components: { AppHeader, AppFooter },
};
</script>
