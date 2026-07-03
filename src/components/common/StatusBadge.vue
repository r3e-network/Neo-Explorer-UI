<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold"
    :style="badgeStyle"
  >
    <span class="inline-block h-2 w-2 rounded-full" :style="{ background: statusColor }"></span>
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const STATUS_MAP = {
  success: { key: "status.success", color: "var(--status-success)", bg: "var(--status-success-bg)" },
  failed: { key: "status.failed", color: "var(--status-error)", bg: "var(--status-error-bg)" },
  pending: { key: "status.pending", color: "var(--status-warning)", bg: "var(--status-warning-bg)" },
};

const props = defineProps({
  status: {
    type: String,
    default: "success",
    validator: (v) => ["success", "failed", "pending"].includes(v.toLowerCase()),
  },
  text: {
    type: String,
    default: "",
  },
});

const normalizedStatus = computed(() => String(props.status || "success").toLowerCase());
const config = computed(() => STATUS_MAP[normalizedStatus.value] || STATUS_MAP.success);
const label = computed(() => props.text || t(config.value.key));
const statusColor = computed(() => config.value.color);
const badgeStyle = computed(() => ({
  borderColor: config.value.color,
  background: config.value.bg,
  color: config.value.color,
}));
</script>
