<template>
  <article class="etherscan-card overflow-hidden">
    <header class="card-header">
      <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Latest Transactions</h2>
      <router-link to="/transactions/1" class="btn-outline text-xs">View all</router-link>
    </header>

    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 6" :key="i" height="54px" />
    </div>
    <div v-else-if="error" class="p-4">
      <ErrorState
        title="Unable to load latest transactions"
        message="Please try again in a moment."
        @retry="$emit('retry')"
      />
    </div>
    <div v-else-if="!transactions.length" class="p-4">
      <EmptyState message="No transactions found" />
    </div>
    <div v-else>
      <TxListItem v-for="tx in transactions" :key="tx.hash" :tx="tx" />
    </div>
  </article>
</template>

<script setup>
import TxListItem from "@/components/common/TxListItem.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

defineProps({
  transactions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
});

defineEmits(["retry"]);
</script>
