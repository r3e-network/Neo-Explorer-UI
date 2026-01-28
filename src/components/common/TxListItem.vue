<template>
  <div class="tx-list-item p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="tx-icon w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 5v10l7-5-7-5z"/>
          </svg>
        </div>
        <div>
          <router-link :to="`/transactionInfo/${tx.hash}`" class="text-primary-500 hover:text-primary-600 font-mono text-sm">
            {{ truncateHash }}
          </router-link>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ timeAgo }}</p>
        </div>
      </div>
      <div class="text-right text-sm text-gray-600 dark:text-gray-300">
        <p>{{ tx.size || 0 }} bytes</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TxListItem',
  props: { tx: { type: Object, default: () => ({}) } },
  computed: {
    truncateHash() {
      const h = this.tx?.hash
      return h ? `${h.slice(0, 10)}...${h.slice(-6)}` : ''
    },
    timeAgo() {
      if (!this.tx?.blocktime) return ''
      const secs = Math.floor((Date.now() / 1000) - this.tx.blocktime)
      if (secs < 60) return `${secs}s ago`
      if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
      if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
      return `${Math.floor(secs / 86400)}d ago`
    }
  }
}
</script>
