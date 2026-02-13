<template>
  <div ref="sentinelRef" class="infinite-scroll-sentinel">
    <div v-if="loading" class="flex items-center justify-center py-4">
      <svg
        class="h-6 w-6 animate-spin text-primary-500"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span class="ml-2 text-sm text-gray-500">Loading more...</span>
    </div>
    <div
      v-else-if="!hasMore && items.length > 0"
      class="py-4 text-center text-sm text-gray-400"
    >
      No more items to load
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";

const props = defineProps({
  loading: { type: Boolean, default: false },
  hasMore: { type: Boolean, default: true },
  threshold: { type: Number, default: 200 },
});

const emit = defineEmits(["load-more"]);

const sentinelRef = ref(null);
let observer = null;

function onIntersect(entries) {
  const entry = entries[0];
  if (entry.isIntersecting && !props.loading && props.hasMore) {
    emit("load-more");
  }
}

onMounted(() => {
  if (sentinelRef.value && "IntersectionObserver" in window) {
    observer = new IntersectionObserver(onIntersect, {
      rootMargin: `${props.threshold}px`,
      threshold: 0,
    });
    observer.observe(sentinelRef.value);
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});

watch(
  () => props.hasMore,
  (newVal) => {
    if (!newVal && observer) {
      observer.disconnect();
    }
  }
);
</script>

<style scoped>
.infinite-scroll-sentinel {
  @apply w-full;
}
</style>
