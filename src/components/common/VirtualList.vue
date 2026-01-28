<template>
  <div 
    ref="container" 
    class="virtual-list-container" 
    :style="{ height: containerHeight + 'px' }"
    @scroll="onScroll"
  >
    <div class="virtual-list-phantom" :style="{ height: totalHeight + 'px' }"></div>
    <div class="virtual-list-content" :style="{ transform: `translateY(${offset}px)` }">
      <div
        v-for="item in visibleItems"
        :key="item._virtualIndex"
        class="virtual-list-item"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot :item="item" :index="item._virtualIndex"></slot>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

export default {
  name: 'VirtualList',
  props: {
    items: { type: Array, required: true },
    itemHeight: { type: Number, default: 50 },
    containerHeight: { type: Number, default: 400 },
    buffer: { type: Number, default: 5 }
  },
  setup(props) {
    const container = ref(null);
    const scrollTop = ref(0);

    const visibleCount = computed(() => 
      Math.ceil(props.containerHeight / props.itemHeight) + props.buffer * 2
    );

    const startIndex = computed(() => 
      Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer)
    );

    const endIndex = computed(() => 
      Math.min(props.items.length, startIndex.value + visibleCount.value)
    );

    const visibleItems = computed(() => 
      props.items.slice(startIndex.value, endIndex.value).map((item, i) => ({
        ...item,
        _virtualIndex: startIndex.value + i
      }))
    );

    const totalHeight = computed(() => props.items.length * props.itemHeight);
    const offset = computed(() => startIndex.value * props.itemHeight);

    const onScroll = (e) => {
      scrollTop.value = e.target.scrollTop;
    };

    return {
      container,
      visibleItems,
      totalHeight,
      offset,
      onScroll
    };
  }
};
</script>

<style scoped>
.virtual-list-container {
  overflow-y: auto;
  position: relative;
}
.virtual-list-phantom {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  z-index: -1;
}
.virtual-list-content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}
</style>
