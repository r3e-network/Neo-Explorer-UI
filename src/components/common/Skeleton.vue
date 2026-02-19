<template>
  <div class="flex flex-col" :class="count > 1 ? 'gap-2' : ''">
    <div v-for="i in count" :key="i" :class="skeletonClass" :style="customStyle" />
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  width: { type: String, default: "100%" },
  height: { type: String, default: "20px" },
  variant: {
    type: String,
    default: "text",
    validator: (v) => ["text", "rounded", "circle"].includes(v),
  },
  count: { type: Number, default: 1 },
});

const variantClass = computed(() => {
  const map = {
    text: "rounded",
    rounded: "rounded-lg",
    circle: "rounded-full",
  };
  return map[props.variant] || "rounded";
});

const skeletonClass = computed(() => ["animate-pulse", "skeleton-shimmer", variantClass.value]);

const customStyle = computed(() => ({
  width: props.variant === "circle" ? props.height : props.width,
  height: props.height,
}));
</script>

<style scoped>
.skeleton-shimmer {
  background: linear-gradient(90deg, var(--surface-hover) 0%, var(--surface-elevated) 50%, var(--surface-hover) 100%);
}
</style>
