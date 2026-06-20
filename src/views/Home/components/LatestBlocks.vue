<template>
  <article class="etherscan-card overflow-hidden">
    <header class="card-header">
      <h2 class="text-high text-base font-semibold">{{ $t("homePage.recentBlocks") }}</h2>
      <router-link to="/blocks/1" class="btn-outline text-xs">{{ $t("homePage.viewAll") }}</router-link>
    </header>

    <div v-if="loading && !blocks.length" class="space-y-2 p-4">
      <Skeleton v-for="i in 6" :key="i" height="54px" />
    </div>
    <div v-else-if="error && !blocks.length" class="p-4">
      <ErrorState
        :title="$t('errorTitles.unableToLoadLatestBlocks')"
        :message="$t('emptyMessages.tryAgainMoment')"
        @retry="$emit('retry')"
      />
    </div>
    <div v-else-if="!blocks.length" class="p-4">
      <EmptyState :message="$t('emptyMessages.noBlocksFound')" />
    </div>
    <TransitionGroup v-else name="list" tag="div" class="relative overflow-hidden">
      <BlockListItem
        v-for="block in blocks"
        :key="block.hash"
        :block="block"
        :state-root-validated="isBlockStateRootValidated(block)"
        class="w-full bg-surface-elevated"
      />
    </TransitionGroup>
  </article>
</template>

<script setup>
import { computed } from "vue";
import BlockListItem from "@/components/common/BlockListItem.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const props = defineProps({
  blocks: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  validatedStateRoot: { type: Object, default: null },
});

defineEmits(["retry"]);

const validatedStateRootHeight = computed(() => {
  const root = props.validatedStateRoot;
  if (!root?.validated) return null;
  const height = Number(root.validatedrootindex ?? root.validatedRootIndex ?? root.index ?? root.height);
  return Number.isFinite(height) ? height : null;
});

function getBlockIndex(block) {
  const index = Number(block?.index ?? block?.block_index ?? block?.height);
  return Number.isFinite(index) ? index : null;
}

function isBlockStateRootValidated(block) {
  const validatedHeight = validatedStateRootHeight.value;
  const blockIndex = getBlockIndex(block);
  return validatedHeight !== null && blockIndex !== null && blockIndex <= validatedHeight;
}
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
