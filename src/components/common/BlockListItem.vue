<template>
  <div
    class="block-list-item border-b border-card-border px-4 py-3 transition-colors hover:bg-gray-50 dark:border-card-border-dark dark:hover:bg-gray-800/60"
  >
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <!-- Etherscan "Bk" circle icon -->
        <div
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-text-secondary dark:bg-gray-800 dark:text-gray-400"
        >
          Bk
        </div>
        <div class="min-w-0">
          <router-link :to="`/block-info/${block.hash}`" :title="block.hash" class="font-medium etherscan-link">
            #{{ block.index || 0 }}
          </router-link>
          <p class="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
            {{ formatAge(block.timestamp) }}
          </p>
        </div>
      </div>

      <div class="hidden min-w-0 flex-1 text-center md:block">
        <p class="text-xs text-text-secondary dark:text-gray-400">Fee Recipient</p>
        <router-link
          v-if="block.speaker"
          :to="`/account-profile/${block.speaker}`"
          :title="block.speaker"
          class="block truncate font-hash text-sm text-text-primary hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400"
        >
          {{ truncateHash(block.speaker, 8, 6) }}
        </router-link>
        <span v-else class="text-sm text-text-muted">-</span>
      </div>

      <div class="flex-shrink-0 text-right">
        <p class="text-sm text-text-primary dark:text-gray-300">
          <span class="font-medium etherscan-link">{{ block.txcount || 0 }}</span>
          txns
        </p>
        <p class="mt-0.5 text-xs text-text-secondary dark:text-gray-400">{{ formatGas(block.netfee, 4) }} GAS</p>
      </div>
    </div>
  </div>
</template>

<script>
import { truncateHash, formatAge, formatGas } from "@/utils/explorerFormat";

export default {
  name: "BlockListItem",
  props: {
    block: { type: Object, default: () => ({}) },
  },
  methods: {
    truncateHash,
    formatAge,
    formatGas,
  },
};
</script>
