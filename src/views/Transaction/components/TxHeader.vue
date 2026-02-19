<template>
  <div class="detail-hero">
    <div class="flex items-start gap-3">
      <div
        class="page-header-icon"
        :class="
          isSuccess === true
            ? 'bg-green-100 dark:bg-green-900/40'
            : isSuccess === false
            ? 'bg-red-100 dark:bg-red-900/40'
            : 'bg-gray-100 dark:bg-gray-700'
        "
      >
        <svg
          class="h-6 w-6"
          :class="
            isSuccess === true
              ? 'text-green-500'
              : isSuccess === false
              ? 'text-red-500'
              : 'text-gray-400 dark:text-gray-500'
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
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="page-title">Transaction Details</h1>
          <StatusBadge :status="txStatus" />
        </div>
        <p class="page-subtitle">Execution status, traceability, and asset movement for this transaction.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import StatusBadge from "@/components/common/StatusBadge.vue";

defineProps({
  isSuccess: { type: [Boolean, null], default: null },
  txStatus: { type: String, default: "pending" },
});
</script>
