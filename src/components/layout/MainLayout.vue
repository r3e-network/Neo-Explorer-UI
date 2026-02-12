<template>
  <div class="min-h-screen bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
    <div class="flex min-h-screen flex-col">
      <AppHeader />
      <main class="w-full flex-1">
        <router-view :key="routerViewKey" />
      </main>
      <AppFooter />
    </div>

    <transition name="fade">
      <div v-show="isNetworkSwitching" class="fixed left-0 right-0 top-0 z-[70] h-0.5 bg-primary-500/70"></div>
    </transition>

    <transition name="network-toast">
      <div
        v-show="networkToastVisible"
        class="fixed right-4 top-[72px] z-[70] rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        role="status"
        aria-live="polite"
      >
        <div class="flex items-center gap-2 text-xs font-medium text-text-primary dark:text-gray-100">
          <svg
            v-if="isNetworkSwitching"
            class="h-3.5 w-3.5 animate-spin text-primary-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <svg v-else class="h-3.5 w-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{{ networkToastMessage }}</span>
        </div>
      </div>
    </transition>

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

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import AppHeader from "./AppHeader.vue";
import AppFooter from "./AppFooter.vue";
import { NETWORK_CHANGE_EVENT, getCurrentEnv, getNetworkLabel } from "@/utils/env";

const route = useRoute();
const showBackToTop = ref(false);
const activeNetwork = ref(getCurrentEnv());

const isNetworkSwitching = ref(false);
const networkToastVisible = ref(false);
const networkToastMessage = ref("");

let switchTimer = null;
let toastTimer = null;

const routerViewKey = computed(() => `${route.fullPath}:${activeNetwork.value}`);

function clearSwitchTimers() {
  if (switchTimer) {
    clearTimeout(switchTimer);
    switchTimer = null;
  }
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
}

function handleScroll() {
  showBackToTop.value = window.scrollY > 300;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleNetworkChange(event) {
  const nextEnv = event?.detail?.env || getCurrentEnv();
  const nextLabel = getNetworkLabel(nextEnv);

  clearSwitchTimers();

  isNetworkSwitching.value = true;
  networkToastVisible.value = true;
  networkToastMessage.value = `Switching to ${nextLabel}...`;

  activeNetwork.value = nextEnv;

  switchTimer = setTimeout(() => {
    isNetworkSwitching.value = false;
    networkToastMessage.value = `Now on ${nextLabel}`;

    toastTimer = setTimeout(() => {
      networkToastVisible.value = false;
    }, 1400);
  }, 700);
}

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
  clearSwitchTimers();
});
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

.network-toast-enter-active,
.network-toast-leave-active {
  transition: all 0.2s ease;
}
.network-toast-enter-from,
.network-toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
