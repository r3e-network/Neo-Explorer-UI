<template>
  <div
    class="block-list-item p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
  >
    <div class="flex items-center justify-between gap-4">
      <!-- Left: Block Icon & Info -->
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="block-icon w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0"
        >
          <svg
            class="w-5 h-5 text-primary-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
          </svg>
        </div>
        <div class="min-w-0">
          <router-link
            :to="`/blockinfo/${block.hash}`"
            class="font-semibold text-primary-500 hover:text-primary-600 transition-colors"
          >
            {{ formatBlockIndex(block.index) }}
          </router-link>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ timeAgo }}
          </p>
        </div>
      </div>

      <!-- Middle: Validator/Speaker -->
      <div class="hidden md:block flex-1 min-w-0 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">Validated by</p>
        <router-link
          v-if="block.speaker"
          :to="`/accountprofile/${block.speaker}`"
          class="text-sm text-gray-700 dark:text-gray-300 hover:text-primary-500 truncate block"
        >
          {{ truncateAddress(block.speaker) }}
        </router-link>
        <span v-else class="text-sm text-gray-400">-</span>
      </div>

      <!-- Right: Txns & Size -->
      <div class="text-right flex-shrink-0">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
          <span class="text-primary-500">{{ block.txcount || 0 }}</span> txns
        </p>
        <p class="text-xs text-gray-400 mt-0.5">{{ formatSize(block.size) }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "BlockListItem",
  props: {
    block: { type: Object, default: () => ({}) },
  },
  computed: {
    timeAgo() {
      if (!this.block?.timestamp) return "";
      const secs = Math.floor(Date.now() / 1000 - this.block.timestamp);
      if (secs < 60) return `${secs} secs ago`;
      if (secs < 3600) return `${Math.floor(secs / 60)} mins ago`;
      if (secs < 86400) return `${Math.floor(secs / 3600)} hrs ago`;
      return `${Math.floor(secs / 86400)} days ago`;
    },
  },
  methods: {
    formatBlockIndex(index) {
      return index !== undefined ? `#${index.toLocaleString()}` : "#-";
    },
    formatSize(size) {
      if (!size) return "0 bytes";
      if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
      return `${size} bytes`;
    },
    truncateAddress(addr) {
      if (!addr) return "";
      return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
    },
  },
};
</script>
