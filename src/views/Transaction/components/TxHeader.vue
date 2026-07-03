<template>
  <div class="detail-hero detail-hero-enhanced detail-hero-circuit">
    <!-- Circuit particles -->
    <span class="circuit-particle"></span>
    <span class="circuit-particle"></span>
    <span class="circuit-particle"></span>
    <span class="circuit-particle"></span>
    <span class="circuit-particle"></span>

    <div class="flex items-start gap-3">
      <div
        class="page-header-icon relative"
        :class="
          isSuccess === true
            ? 'bg-status-success-bg'
            : isSuccess === false
            ? 'bg-status-error-bg'
            : 'bg-gray-100 dark:bg-gray-800'
        "
      >
        <svg
          class="h-6 w-6"
          :class="
            isSuccess === true
              ? 'text-status-success'
              : isSuccess === false
              ? 'text-status-error'
              : 'text-mid'
          "
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            v-if="isSuccess === true"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <path
            v-else-if="isSuccess === false"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span
          v-if="isSuccess !== null"
          class="glow-dot absolute -right-0.5 -bottom-0.5"
          :style="{ background: isSuccess ? 'var(--status-success)' : 'var(--status-error)' }"
        ></span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="page-title neon-glow-text">{{ $t("txDetail.headerTitle") }}</h1>
          <StatusBadge :status="txStatus" />
        </div>
        <p class="page-subtitle">{{ $t("txDetail.headerSubtitle") }}</p>
        <p
          v-if="isSuccess === false"
          class="mt-2 rounded-lg border border-red-300 border-status-error/30 bg-red-50 bg-status-error-bg px-3 py-2 text-xs text-red-700 text-status-error break-all dark:border-status-error/30 dark:bg-status-error-bg dark:text-red-300"
        >
          <span class="font-semibold">{{ $t("txDetail.headerFailurePrefix") }}</span>
          {{ failureReason || $t("txDetail.rowFailureReasonEmpty") }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import StatusBadge from "@/components/common/StatusBadge.vue";

defineProps({
  isSuccess: { type: [Boolean, null], default: null },
  txStatus: { type: String, default: "pending" },
  failureReason: { type: String, default: "" },
});
</script>
