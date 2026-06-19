<template>
  <div class="error-state py-12 px-4 text-center">
    <div
      class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-status-error-bg border border-status-error"
    >
      <svg class="w-8 h-8 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
    <p class="mb-1 font-semibold text-high">
      {{ title }}
    </p>
    <p class="mb-4 text-sm text-mid">{{ message }}</p>
    <button v-if="showRetry" type="button" @click="$emit('retry')" :aria-label="$t('aria.retry')" class="btn-primary mt-2">
      {{ $t('aria.tryAgainButton') }}
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
