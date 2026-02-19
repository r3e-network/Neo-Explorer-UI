<template>
  <div class="error-state py-12 px-4 text-center">
    <div
      class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/25"
    >
      <svg class="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
    <p class="mb-1 font-semibold text-text-primary dark:text-gray-200">
      {{ title }}
    </p>
    <p class="mb-4 text-sm text-text-secondary dark:text-gray-400">{{ message }}</p>
    <button
      v-if="showRetry"
      @click="$emit('retry')"
      aria-label="Retry"
      class="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
    >
      Try Again
    </button>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: "Something went wrong" },
  message: {
    type: String,
    default: "Failed to load data. Please try again.",
  },
  showRetry: { type: Boolean, default: true },
});

defineEmits(["retry"]);
</script>
