<template>
  <div class="detail-hero">
    <div class="flex items-start gap-3">
      <div class="page-header-icon bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
        <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="page-title">
            {{ contract.name || "Unknown Contract" }}
          </h1>
          <span
            v-if="isVerified"
            class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-success dark:border-emerald-800 dark:bg-emerald-900/30"
          >
            <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            Verified
          </span>
          <span
            v-for="std in supportedStandards"
            :key="std"
            class="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold"
            :class="nepBadgeClass(std)"
            :title="nepTooltip(std)"
          >
            {{ std }}
          </span>
        </div>
        <div class="detail-metadata">
          <span class="detail-chip font-mono">
            {{ truncateHash(contract.hash, 12, 8) }}
          </span>
          <button
            aria-label="Copy contract hash"
            class="detail-chip hover:text-primary-600 dark:hover:text-primary-300"
            @click="emit('copyHash')"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy Hash
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { truncateHash } from "@/utils/explorerFormat";
import { nepBadgeClass, nepTooltip } from "@/utils/nepBadges";

defineProps({
  contract: { type: Object, required: true },
  isVerified: { type: Boolean, default: false },
  supportedStandards: { type: Array, default: () => [] },
});

const emit = defineEmits(["copyHash"]);
</script>
