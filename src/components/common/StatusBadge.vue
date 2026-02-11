<template>
  <span :class="badgeClass">
    <span class="inline-block h-1.5 w-1.5 rounded-full" :class="dotClass"></span>
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from "vue";

const BADGE_BASE = "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border";

const STATUS_MAP = {
  success: {
    label: "Success",
    badge: BADGE_BASE + " bg-emerald-50 text-success border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800",
    dot: "bg-success",
  },
  failed: {
    label: "Failed",
    badge: BADGE_BASE + " bg-red-50 text-error border-red-200 dark:bg-red-900/30 dark:border-red-800",
    dot: "bg-error",
  },
  pending: {
    label: "Pending",
    badge: BADGE_BASE + " bg-amber-50 text-warning border-amber-200 dark:bg-amber-900/30 dark:border-amber-800",
    dot: "bg-warning",
  },
};

const props = defineProps({
  status: {
    type: String,
    default: "success",
    validator: (v) => ["success", "failed", "pending"].includes(v),
  },
});

const config = computed(() => STATUS_MAP[props.status] || STATUS_MAP.success);
const label = computed(() => config.value.label);
const badgeClass = computed(() => config.value.badge);
const dotClass = computed(() => config.value.dot);
</script>
