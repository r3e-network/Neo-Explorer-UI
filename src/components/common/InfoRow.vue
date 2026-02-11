<template>
  <div class="info-row">
    <div class="info-row-label">
      <span>{{ label }}</span>
      <span v-if="tooltip" class="tooltip-trigger" :title="tooltip">?</span>
    </div>
    <div class="info-row-value">
      <slot>{{ value }}</slot>
      <CopyButton v-if="copyable && copyValue" :text="copyValue" class="ml-1.5 inline-flex" />
    </div>
  </div>
</template>

<script setup>
import CopyButton from "./CopyButton.vue";

defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: "" },
  tooltip: { type: String, default: "" },
  copyable: { type: Boolean, default: false },
  copyValue: { type: String, default: "" },
});
</script>

<style scoped>
.info-row {
  @apply flex flex-col gap-1 border-b border-card-border py-3 dark:border-card-border-dark
         sm:flex-row sm:items-start sm:gap-0;
}

.info-row-label {
  @apply flex items-center text-sm text-text-secondary dark:text-gray-400
         sm:w-1/3 sm:flex-shrink-0;
}

.info-row-value {
  @apply flex flex-wrap items-center text-sm text-text-primary dark:text-gray-200
         sm:w-2/3;
}

.tooltip-trigger {
  @apply ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full
         bg-gray-200 text-[10px] text-gray-500 transition-colors
         hover:bg-gray-300 hover:text-gray-600
         dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-300;
}
</style>
