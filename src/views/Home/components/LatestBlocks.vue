<template>
  <article class="etherscan-card overflow-hidden">
    <header class="card-header">
      <h2 class="text-high text-base font-semibold">Latest Blocks</h2>
      <router-link to="/blocks/1" class="btn-outline text-xs">View all</router-link>
    </header>

    <div v-if="loading && !blocks.length" class="space-y-2 p-4">
      <Skeleton v-for="i in 6" :key="i" height="54px" />
    </div>
    <div v-else-if="error && !blocks.length" class="p-4">
      <ErrorState
        title="Unable to load latest blocks"
        message="Please try again in a moment."
        @retry="$emit('retry')"
      />
    </div>
    <div v-else-if="!blocks.length" class="p-4">
      <EmptyState message="No blocks found" />
    </div>
    <TransitionGroup v-else name="list" tag="div" class="relative overflow-hidden">
      <BlockListItem v-for="block in blocks" :key="block.hash" :block="block" class="w-full" style="background: var(--surface-elevated)" />
    </TransitionGroup>
  </article>
</template>

<script setup>
import BlockListItem from "@/components/common/BlockListItem.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

defineProps({
  blocks: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
});

defineEmits(["retry"]);
</script>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>