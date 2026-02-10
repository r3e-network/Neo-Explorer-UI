<template>
  <div class="min-h-screen bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
    <div class="flex min-h-screen flex-col">
      <AppHeader />
      <main class="w-full flex-1">
        <router-view />
      </main>
      <AppFooter />
    </div>

    <!-- Back to Top floating button -->
    <transition name="fade">
      <button
        v-show="showBackToTop"
        @click="scrollToTop"
        class="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-colors hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500"
        aria-label="Back to top"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </transition>
  </div>
</template>

<script>
import AppHeader from "./AppHeader.vue";
import AppFooter from "./AppFooter.vue";

export default {
  name: "MainLayout",
  components: { AppHeader, AppFooter },

  data() {
    return {
      showBackToTop: false,
    };
  },

  mounted() {
    window.addEventListener("scroll", this.handleScroll, { passive: true });
  },

  beforeUnmount() {
    window.removeEventListener("scroll", this.handleScroll);
  },

  methods: {
    handleScroll() {
      this.showBackToTop = window.scrollY > 300;
    },
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  },
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
