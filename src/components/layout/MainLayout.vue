<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <AppHeader />
    <main class="flex-1">
      <router-view />
    </main>
    <AppFooter />
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
