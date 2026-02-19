<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold"
    :style="badgeStyle"
  >
    <span class="inline-block h-1.5 w-1.5 rounded-full" :style="{ background: statusColor }"></span>
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from "vue";

const STATUS_MAP = {
  success: { label: "Success", color: "var(--status-success)", bg: "var(--status-success-bg)" },
  failed: { label: "Failed", color: "var(--status-error)", bg: "var(--status-error-bg)" },
  pending: { label: "Pending", color: "var(--status-warning)", bg: "var(--status-warning-bg)" },
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
const statusColor = computed(() => config.value.color);
const badgeStyle = computed(() => ({
  borderColor: config.value.color,
  background: config.value.bg,
  color: config.value.color,
}));
</script>
