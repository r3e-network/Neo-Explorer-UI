<template>
  <article class="etherscan-card overflow-hidden">
    <header class="card-header">
      <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Latest Blocks</h2>
      <router-link to="/blocks/1" class="btn-outline text-xs">View all</router-link>
    </header>

    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 6" :key="i" height="54px" />
    </div>
    <div v-else-if="error" class="p-4">
      <ErrorState
        title="Unable to load latest blocks"
        message="Please try again in a moment."
        @retry="$emit('retry')"
      />
    </div>
    <div v-else-if="!blocks.length" class="p-4">
      <EmptyState message="No blocks found" />
    </div>
    <div v-else>
      <BlockListItem v-for="block in blocks" :key="block.hash" :block="block" />
    </div>
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
