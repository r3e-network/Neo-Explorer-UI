<template>
  <div ref="sentinelRef" class="infinite-scroll-sentinel">
    <div v-if="loading" class="flex items-center justify-center py-4" role="status" aria-live="polite">
      <svg
        class="h-6 w-6 animate-spin text-primary-500"
        fill="none"
        viewBox="0 0 24 24"
        :aria-label="$t('aria.loadingMoreContent')"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span class="ml-2 text-sm text-gray-500">{{ t("common.loadingMore") }}</span>
    </div>
    <div v-else-if="hasMore" class="flex justify-center py-3">
      <button type="button" class="btn-outline px-4 py-2 text-xs" @click="requestManualLoadMore">
        {{ t("common.loadMore") }}
      </button>
    </div>
    <div v-else-if="!hasMore" class="py-4 text-center text-sm text-gray-400">{{ t("common.noMoreItems") }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps({
  loading: { type: Boolean, default: false },
  hasMore: { type: Boolean, default: true },
  threshold: { type: Number, default: 200 },
  auto: { type: Boolean, default: true },
});

const emit = defineEmits(["load-more"]);
const INTERSECTION_REARM_DELAY_MS = 600;

const sentinelRef = ref(null);
let observer = null;
let intersectionArmed = true;
let rearmTimer = null;

function emitLoadMore() {
  if (props.loading || !props.hasMore) return;
  emit("load-more");
}

function requestManualLoadMore() {
  // A click is always an explicit request. Disarm the observer so browser
  // scroll anchoring cannot turn this one click into a burst of extra pages.
  intersectionArmed = false;
  emitLoadMore();
}

function onIntersect(entries) {
  const entry = entries[0];
  if (!entry?.isIntersecting) {
    if (rearmTimer) clearTimeout(rearmTimer);
    // Layout shifts can briefly move the sentinel out and straight back into
    // view. Only re-arm after it has stayed out long enough to represent an
    // intentional scroll away from the boundary.
    rearmTimer = setTimeout(() => {
      intersectionArmed = true;
      rearmTimer = null;
    }, INTERSECTION_REARM_DELAY_MS);
    return;
  }
  if (rearmTimer) {
    clearTimeout(rearmTimer);
    rearmTimer = null;
  }
  if (intersectionArmed && !props.loading && props.hasMore) {
    intersectionArmed = false;
    emitLoadMore();
  }
}

function disconnectObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (rearmTimer) {
    clearTimeout(rearmTimer);
    rearmTimer = null;
  }
}

function ensureObserver() {
  if (typeof window === "undefined") return;
  if (!props.auto) {
    disconnectObserver();
    return;
  }
  if (!("IntersectionObserver" in window)) return;
  if (!sentinelRef.value) {
    disconnectObserver();
    return;
  }
  if (!props.hasMore) {
    disconnectObserver();
    return;
  }

  disconnectObserver();

  observer = new IntersectionObserver(onIntersect, {
    rootMargin: `${props.threshold}px`,
    threshold: 0,
  });
  observer.observe(sentinelRef.value);
}

onMounted(() => {
  ensureObserver();
});

onUnmounted(() => {
  disconnectObserver();
});

watch(
  [() => props.auto, () => props.hasMore, () => props.threshold, sentinelRef],
  () => {
    ensureObserver();
  },
  { immediate: true },
);
</script>

<style scoped>
.infinite-scroll-sentinel {
  @apply w-full;
  overflow-anchor: none;
}
</style>
