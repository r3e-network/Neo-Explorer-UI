<template>
  <div class="info-row">
    <div class="info-row-label">
      <span>{{ label }}</span>
      <button v-if="tooltip" type="button" class="tooltip-trigger" :title="tooltip" :aria-label="$t('aria.moreInfo')">?</button>
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
  @apply ml-1 inline-flex h-[18px] w-[18px] cursor-help items-center justify-center rounded-full text-[11px] font-semibold leading-none transition-colors;
  color: var(--text-low);
  background: var(--line-soft);
}

.tooltip-trigger:hover {
  color: var(--text-high);
  background: color-mix(in srgb, var(--link) 30%, var(--line-soft));
}
</style>
