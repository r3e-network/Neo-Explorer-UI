<template>
  <div class="info-row">
    <div class="info-row-label">
      <span>{{ label }}</span>
      <button v-if="tooltip" type="button" class="tooltip-trigger" :title="tooltip" aria-label="More info">?</button>
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
.tooltip-trigger {
  @apply ml-1.5 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-[10px] transition-colors;
  color: var(--text-mid);
  background: color-mix(in srgb, var(--surface-hover) 80%, transparent);
}

.tooltip-trigger:hover {
  color: var(--text-high);
  background: color-mix(in srgb, var(--surface-hover) 100%, transparent);
}
</style>
