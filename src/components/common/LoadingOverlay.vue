<template>
  <transition name="fade">
    <div v-if="show" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <p v-if="message" class="loading-message">{{ message }}</p>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'LoadingOverlay',
  props: {
    show: { type: Boolean, default: false },
    message: { type: String, default: '' }
  }
}
</script>

<style scoped>
.loading-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
}
.dark .loading-overlay {
  background: rgba(17, 24, 39, 0.9);
}
.loading-content {
  @apply text-center;
}
.spinner {
  @apply w-12 h-12 mx-auto mb-4 border-4 rounded-full;
  border-color: #e5e7eb;
  border-top-color: #00e599;
  animation: spin 1s linear infinite;
}
.loading-message {
  @apply text-gray-600 dark:text-gray-300 font-medium;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
