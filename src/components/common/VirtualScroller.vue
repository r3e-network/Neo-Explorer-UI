<template>
  <div
    ref="containerRef"
    class="virtual-scroller"
    :style="{ height: containerHeight + 'px' }"
    @scroll="onScroll"
  >
    <div
      class="virtual-scroller-content"
      :style="{ height: totalHeight + 'px', position: 'relative' }"
    >
      <div
        v-for="item in visibleItems"
        :key="item.key"
        class="virtual-scroller-item"
        :style="{
          position: 'absolute',
          top: item.top + 'px',
          left: 0,
          right: 0,
          height: itemHeight + 'px',
        }"
      >
        <slot :item="item.data" :index="item.index"></slot>
      </div>
    </div>

    <div
      v-if="loading"
      class="absolute bottom-0 left-0 right-0 flex justify-center py-4"
    >
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] },
  itemHeight: { type: Number, default: 60 },
  containerHeight: { type: Number, default: 400 },
  buffer: { type: Number, default: 5 },
  loading: { type: Boolean, default: false },
  hasMore: { type: Boolean, default: true },
});

const emit = defineEmits(["load-more"]);

const containerRef = ref(null);
const scrollTop = ref(0);
const containerHeight = ref(props.containerHeight);

const totalHeight = computed(() => props.items.length * props.itemHeight);

const startIndex = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight) - props.buffer;
  return Math.max(0, start);
});

const endIndex = computed(() => {
  const visibleCount = Math.ceil(containerHeight.value / props.itemHeight);
  const end = startIndex.value + visibleCount + props.buffer * 2;
  return Math.min(props.items.length, end);
});

const visibleItems = computed(() => {
  const items = [];
  for (let i = startIndex.value; i < endIndex.value; i++) {
    items.push({
      index: i,
      data: props.items[i],
      key: props.items[i]?.hash || props.items[i]?.index || i,
      top: i * props.itemHeight,
    });
  }
  return items;
});

let ticking = false;

function onScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      if (containerRef.value) {
        scrollTop.value = containerRef.value.scrollTop;

        const scrollBottom = scrollTop.value + containerHeight.value;
        const threshold = totalHeight.value - containerHeight.value * 2;

        if (scrollBottom > threshold && props.hasMore && !props.loading) {
          emit("load-more");
        }
      }
      ticking = false;
    });
    ticking = true;
  }
}

function scrollToTop() {
  if (containerRef.value) {
    containerRef.value.scrollTop = 0;
    scrollTop.value = 0;
  }
}

function scrollToIndex(index) {
  if (containerRef.value) {
    containerRef.value.scrollTop = index * props.itemHeight;
    scrollTop.value = index * props.itemHeight;
  }
}

onMounted(() => {
  if (containerRef.value) {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value =
          entry.contentRect.height || props.containerHeight;
      }
    });
    resizeObserver.observe(containerRef.value);
  }
});

defineExpose({ scrollToTop, scrollToIndex, scrollTop });
</script>

<style scoped>
.virtual-scroller {
  @apply overflow-auto;
  contain: strict;
}

.virtual-scroller-content {
  will-change: transform;
}

.virtual-scroller-item {
  will-change: transform;
}
</style>
