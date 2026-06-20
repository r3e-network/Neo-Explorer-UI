<template>
  <div id="app">
    <a href="#main-content" class="skip-to-content">{{ $t("a11y.skipToContent") }}</a>
    <main id="main-content">
      <router-view v-slot="{ Component, route }">
        <!-- A render/setup throw in any view used to unmount the whole subtree
             (blank page, no recovery, no telemetry). The boundary catches it,
             reports it, and shows a recoverable fallback. Keying by route path
             resets the boundary automatically on navigation. -->
        <ErrorBoundary :key="route.path" boundary="router-view">
          <component :is="Component" />
        </ErrorBoundary>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import ErrorBoundary from "@/components/common/ErrorBoundary.vue";
</script>
