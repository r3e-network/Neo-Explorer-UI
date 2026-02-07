<template>
  <span :class="badgeClass">
    <span class="inline-block h-1.5 w-1.5 rounded-full" :class="dotClass"></span>
    {{ label }}
  </span>
</template>

<script>
const BADGE_BASE = "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border";

const STATUS_MAP = {
  success: {
    label: "Success",
    badge: `${BADGE_BASE} bg-emerald-50 text-success border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800`,
    dot: "bg-success",
  },
  failed: {
    label: "Failed",
    badge: `${BADGE_BASE} bg-red-50 text-error border-red-200 dark:bg-red-900/30 dark:border-red-800`,
    dot: "bg-error",
  },
  pending: {
    label: "Pending",
    badge: `${BADGE_BASE} bg-amber-50 text-warning border-amber-200 dark:bg-amber-900/30 dark:border-amber-800`,
    dot: "bg-warning",
  },
};

export default {
  name: "StatusBadge",
  props: {
    status: { type: String, default: "success", validator: (v) => Object.keys(STATUS_MAP).includes(v) },
  },
  computed: {
    config() {
      return STATUS_MAP[this.status] || STATUS_MAP.success;
    },
    label() {
      return this.config.label;
    },
    badgeClass() {
      return this.config.badge;
    },
    dotClass() {
      return this.config.dot;
    },
  },
};
</script>
