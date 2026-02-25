<template>
  <article class="etherscan-card overflow-hidden">
    <header class="card-header">
      <h2 class="text-high text-base font-semibold">Latest Transactions</h2>
      <router-link to="/transactions/1" class="btn-outline text-xs">View all</router-link>
    </header>

    <div v-if="loading && !transactions.length" class="space-y-2 p-4">
      <Skeleton v-for="i in 6" :key="i" height="54px" />
    </div>
    <div v-else-if="error && !transactions.length" class="p-4">
      <ErrorState
        title="Unable to load latest transactions"
        message="Please try again in a moment."
        @retry="$emit('retry')"
      />
    </div>
    <div v-else-if="!transactions.length" class="p-4">
      <EmptyState message="No transactions found" />
    </div>
    <TransitionGroup v-else name="list" tag="div" class="relative overflow-hidden">
      <TxListItem v-for="tx in transactions" :key="tx.hash" :tx="tx" :transfer-summary="transferSummaryByHash[tx.hash]" class="w-full" style="background: var(--surface-elevated)" />
    </TransitionGroup>
  </article>
</template>

<script setup>
import TxListItem from "@/components/common/TxListItem.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

defineProps({
  transferSummaryByHash: { type: Object, default: () => ({}) },
  transactions: { type: Array, default: () => [] },
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