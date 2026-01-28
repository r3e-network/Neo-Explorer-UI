<template>
  <div
    class="tx-list-item p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
  >
    <div class="flex items-center justify-between gap-4">
      <!-- Left: Tx Icon & Hash -->
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="tx-icon w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          :class="statusClass"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4z"
            />
          </svg>
        </div>
        <div class="min-w-0">
          <router-link
            :to="`/transactionInfo/${tx.hash}`"
            class="text-primary-500 hover:text-primary-600 font-mono text-sm transition-colors"
          >
            {{ truncateHash }}
          </router-link>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ timeAgo }}
          </p>
        </div>
      </div>

      <!-- Middle: From/To -->
      <div
        class="hidden md:flex flex-1 items-center justify-center gap-2 min-w-0"
      >
        <div class="text-right min-w-0">
          <p class="text-xs text-gray-500">From</p>
          <router-link
            v-if="tx.sender"
            :to="`/accountprofile/${tx.sender}`"
            class="text-sm text-gray-700 dark:text-gray-300 hover:text-primary-500 truncate block"
          >
            {{ truncateAddress(tx.sender) }}
          </router-link>
        </div>
        <svg
          class="w-4 h-4 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
        <div class="text-left min-w-0">
          <p class="text-xs text-gray-500">To</p>
          <span class="text-sm text-gray-400">Contract</span>
        </div>
      </div>

      <!-- Right: Status & Size -->
      <div class="text-right flex-shrink-0">
        <span
          :class="statusBadgeClass"
          class="text-xs px-2 py-0.5 rounded-full font-medium"
        >
          {{ statusText }}
        </span>
        <p class="text-xs text-gray-400 mt-1">{{ tx.size || 0 }} bytes</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "TxListItem",
  props: {
    tx: { type: Object, default: () => ({}) },
  },
  computed: {
    truncateHash() {
      const h = this.tx?.hash;
      return h ? `${h.slice(0, 10)}...${h.slice(-6)}` : "";
    },
    timeAgo() {
      if (!this.tx?.blocktime) return "";
      const secs = Math.floor(Date.now() / 1000 - this.tx.blocktime);
      if (secs < 60) return `${secs} secs ago`;
      if (secs < 3600) return `${Math.floor(secs / 60)} mins ago`;
      if (secs < 86400) return `${Math.floor(secs / 3600)} hrs ago`;
      return `${Math.floor(secs / 86400)} days ago`;
    },
    isSuccess() {
      return this.tx?.vmstate === "HALT" || !this.tx?.vmstate;
    },
    statusClass() {
      return this.isSuccess
        ? "bg-green-100 dark:bg-green-900/30 text-green-500"
        : "bg-red-100 dark:bg-red-900/30 text-red-500";
    },
    statusBadgeClass() {
      return this.isSuccess
        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
    },
    statusText() {
      return this.isSuccess ? "Success" : "Failed";
    },
  },
  methods: {
    truncateAddress(addr) {
      if (!addr) return "";
      return `${addr.slice(0, 8)}...${addr.slice(-4)}`;
    },
  },
};
</script>
