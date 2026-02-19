<template>
  <span :class="badgeClass">
    <span class="inline-block h-1.5 w-1.5 rounded-full" :class="dotClass"></span>
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from "vue";

const BADGE_BASE = "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold";

const STATUS_MAP = {
  success: {
    label: "Success",
    badge:
      BADGE_BASE +
      " border-emerald-200 bg-emerald-50 text-success dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    dot: "bg-success dark:bg-emerald-400",
  },
  failed: {
    label: "Failed",
    badge:
      BADGE_BASE + " border-red-200 bg-red-50 text-error dark:border-red-800 dark:bg-red-900/30 dark:text-red-300",
    dot: "bg-error dark:bg-red-400",
  },
  pending: {
    label: "Pending",
    badge:
      BADGE_BASE +
      " border-amber-200 bg-amber-50 text-warning dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    dot: "bg-warning dark:bg-amber-400",
  },
};

const props = defineProps({
  status: {
    type: String,
    default: "success",
    validator: (v) => ["success", "failed", "pending"].includes(v.toLowerCase()),
  },
});

const normalizedStatus = computed(() => String(props.status || "success").toLowerCase());
const config = computed(() => STATUS_MAP[normalizedStatus.value] || STATUS_MAP.success);
const label = computed(() => config.value.label);
const badgeClass = computed(() => config.value.badge);
const dotClass = computed(() => config.value.dot);
</script>
