<template>
  <div class="block-list-item p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="block-icon w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <svg class="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2L3 7v6l7 5 7-5V7l-7-5z"/>
          </svg>
        </div>
        <div>
          <router-link :to="`/blockinfo/${block.hash}`" class="font-medium text-primary-500 hover:text-primary-600">
            #{{ block.index }}
          </router-link>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ timeAgo }}</p>
        </div>
      </div>
      <div class="text-right text-sm text-gray-600 dark:text-gray-300">
        <p>{{ block.txcount || 0 }} txns</p>
        <p class="text-xs text-gray-400">{{ formatSize(block.size) }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BlockListItem',
  props: { block: { type: Object, default: () => ({}) } },
  computed: {
    timeAgo() {
      if (!this.block?.timestamp) return ''
      const secs = Math.floor((Date.now() / 1000) - this.block.timestamp)
      if (secs < 60) return `${secs}s ago`
      if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
      if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
      return `${Math.floor(secs / 86400)}d ago`
    }
  },
  methods: {
    formatSize(size) {
      return size ? `${(size / 1024).toFixed(1)} KB` : ''
    }
  }
}
</script>
