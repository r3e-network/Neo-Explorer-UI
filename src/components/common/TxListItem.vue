<template>
  <div
    class="tx-list-item border-b border-card-border px-4 py-3 transition-colors hover:bg-gray-50 dark:border-card-border-dark dark:hover:bg-gray-800/60"
  >
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <!-- Etherscan "Tx" circle icon -->
        <div
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
          :class="iconClass"
        >
          Tx
        </div>
        <div class="min-w-0">
          <router-link :to="`/transactionInfo/${tx.hash}`" :title="tx.hash" class="font-hash text-sm etherscan-link">
            {{ truncateHash(tx.hash, 10, 6) }}
          </router-link>
          <p class="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
            {{ formatAge(tx.blocktime) }}
          </p>
        </div>
      </div>

      <div class="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
        <div class="min-w-0 text-right">
          <p class="text-xs text-text-secondary dark:text-gray-400">From</p>
          <router-link
            v-if="tx.sender"
            :to="`/accountprofile/${tx.sender}`"
            :title="tx.sender"
            class="block truncate font-hash text-sm text-text-primary hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400"
          >
            {{ truncateHash(tx.sender, 8, 4) }}
          </router-link>
        </div>
        <svg class="h-4 w-4 flex-shrink-0 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
        <div class="min-w-0 text-left">
          <p class="text-xs text-text-secondary dark:text-gray-400">To</p>
          <router-link
            v-if="toAddress"
            :to="`/accountprofile/${toAddress}`"
            :title="toAddress"
            class="block truncate font-hash text-sm text-text-primary hover:text-primary-500 dark:text-gray-300"
          >
            {{ truncateHash(toAddress, 8, 4) }}
          </router-link>
          <span v-else class="text-sm text-text-muted">Contract Call</span>
        </div>
      </div>

      <div class="flex-shrink-0 text-right">
        <span :class="statusBadgeClass" class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
          {{ statusText }}
        </span>
        <p class="mt-1 text-xs text-text-secondary dark:text-gray-400">{{ formatFee }} GAS</p>
      </div>
    </div>
  </div>
</template>

<script>
import { truncateHash, formatAge } from "@/utils/explorerFormat";

export default {
  name: "TxListItem",
  props: {
    tx: { type: Object, default: () => ({}) },
  },
  computed: {
    isSuccess() {
      return this.tx?.vmstate === "HALT" || !this.tx?.vmstate;
    },
    iconClass() {
      return this.isSuccess
        ? "bg-green-100 text-success dark:bg-green-900/30 dark:text-green-300"
        : "bg-red-100 text-error dark:bg-red-900/30 dark:text-red-300";
    },
    statusBadgeClass() {
      return this.isSuccess
        ? "bg-green-100 text-success dark:bg-green-900/30 dark:text-green-300"
        : "bg-red-100 text-error dark:bg-red-900/30 dark:text-red-300";
    },
    statusText() {
      return this.isSuccess ? "Success" : "Failed";
    },
    toAddress() {
      return this.tx?.contractHash || this.tx?.to || "";
    },
    formatFee() {
      const fee = this.tx?.netfee || this.tx?.sysfee || 0;
      return fee ? (fee / 1e8).toFixed(4) : "0";
    },
  },
  methods: {
    truncateHash,
    formatAge,
  },
};
</script>
