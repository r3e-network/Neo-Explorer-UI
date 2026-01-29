<template>
  <button :class="['btn', variant, size]" :disabled="loading">
    <span v-if="loading" class="spinner"></span>
    <slot></slot>
  </button>
</template>

<script>
export default {
  name: "NeoButton",
  props: {
    variant: { type: String, default: "primary" },
    size: { type: String, default: "md" },
    loading: Boolean,
  },
};
</script>

<style scoped>
.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-all;
}
.btn.primary {
  @apply bg-primary-500 text-white hover:bg-primary-600;
}
.btn.secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}
.btn.sm {
  @apply px-3 py-1 text-sm;
}
.spinner {
  @apply w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2;
}
</style>
