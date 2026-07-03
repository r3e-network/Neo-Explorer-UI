<script setup>
import { computed } from "vue";
import { formatNumber } from "@/utils/explorerFormat";

const props = defineProps({
  block: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  latestBlockHeight: { type: Number, default: Infinity },
  timeAgo: { type: String, default: "" },
});

const emit = defineEmits(["navigate"]);

const confirmations = computed(() => {
  if (props.block.index == null || !Number.isFinite(props.latestBlockHeight)) return 0;
  return Math.max(0, props.latestBlockHeight - props.block.index + 1);
});
</script>

<template>
  <div class="detail-hero detail-hero-circuit detail-hero-enhanced">
    <!-- Circuit particles -->
    <span class="circuit-particle"></span>
    <span class="circuit-particle"></span>
    <span class="circuit-particle"></span>
    <span class="circuit-particle"></span>
    <span class="circuit-particle"></span>
    <span class="circuit-particle"></span>

    <!-- Data pulse nodes -->
    <span class="data-pulse-node" style="top: 15%; right: 20%;"></span>
    <span class="data-pulse-node" style="bottom: 25%; right: 40%;"></span>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-start gap-3">
        <div class="page-header-icon bg-icon-primary relative">
          <svg class="h-6 w-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
          </svg>
          <span
            v-if="!loading"
            class="glow-dot absolute -right-0.5 -bottom-0.5"
            :title="$t('blockDetail.rowFinalityValue')"
          ></span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="page-title neon-glow-text">
              {{
                block.index != null
                  ? $t("blockDetail.breadcrumbBlockN", { n: formatNumber(block.index) })
                  : $t("blockDetail.breadcrumbBlock")
              }}
            </h1>
            <span
              v-if="!loading && confirmations > 0"
              class="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-600 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60"
            >
              <span class="data-node" style="width:6px;height:6px;"></span>
              {{ formatNumber(confirmations) }} {{ $t("blockDetail.rowConfirmationsLabel") }}
            </span>
          </div>
          <p v-if="!loading" class="page-subtitle flex items-center gap-3 flex-wrap mt-1">
            <span>{{ timeAgo }}</span>
            <span v-if="block.hash" class="font-hash text-xs text-low truncate max-w-[180px] sm:max-w-xs">
              {{ block.hash.substring(0, 14) }}...{{ block.hash.substring(block.hash.length - 10) }}
            </span>
          </p>
        </div>
      </div>

      <!-- Prev / Next Navigation -->
      <div class="flex items-center gap-2 mt-2 sm:mt-0" role="group" :aria-label="$t('blockDetail.navAria')">
        <button
          type="button"
          :disabled="block.index == null || block.index <= 0"
          class="panel-muted list-row inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-mid transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-40 hover:text-primary-500 hover:border-primary-300 dark:hover:border-primary-800"
          :aria-label="$t('blockDetail.navPrev')"
          @click="emit('navigate', (block.index ?? 0) - 1)"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {{ $t("blockDetail.navPrevShort") }}
        </button>
        <button
          type="button"
          :disabled="block.index == null || block.index >= latestBlockHeight"
          class="panel-muted list-row inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-mid transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-40 hover:text-primary-500 hover:border-primary-300 dark:hover:border-primary-800"
          :aria-label="$t('blockDetail.navNext')"
          @click="emit('navigate', (block.index ?? 0) + 1)"
        >
          {{ $t("blockDetail.navNextShort") }}
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
