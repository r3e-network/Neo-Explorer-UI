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

<script>
import CopyButton from "./CopyButton.vue";

export default {
  name: "InfoRow",
  components: { CopyButton },
  props: {
    label: String,
    value: [String, Number],
    tooltip: { type: String, default: "" },
    copyable: { type: Boolean, default: false },
    copyValue: { type: String, default: "" },
  },
};
</script>

<style scoped>
.tooltip-trigger {
  @apply ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-gray-200 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400;
}
</style>
