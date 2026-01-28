<template>
  <div class="block-detail-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-6">
        <nav class="text-sm text-gray-500 mb-2">
          <router-link to="/" class="hover:text-primary-500">Home</router-link>
          <span class="mx-2">/</span>
          <router-link to="/blocks/1" class="hover:text-primary-500">Blocks</router-link>
          <span class="mx-2">/</span>
          <span class="text-gray-700 dark:text-gray-300">Block #{{ block.index }}</span>
        </nav>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Block #{{ block.index }}</h1>
      </div>

      <!-- Block Info Card -->
      <div class="card bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div class="p-6 space-y-4">
          <InfoRow label="Block Hash" :value="block.hash" copyable />
          <InfoRow label="Height" :value="block.index" />
          <InfoRow label="Timestamp" :value="formatTime(block.timestamp)" />
          <InfoRow label="Transactions" :value="block.txcount || 0" />
          <InfoRow label="Size" :value="formatSize(block.size)" />
          <InfoRow label="Version" :value="block.version" />
          <InfoRow label="Merkle Root" :value="block.merkleroot" copyable />
          <InfoRow label="Previous Block" :value="block.previousblockhash" link />
          <InfoRow label="Next Block" :value="block.nextblockhash" link />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { blockService } from '@/services'
import InfoRow from '@/components/common/InfoRow.vue'

export default {
  name: 'BlockDetailPage',
  components: { InfoRow },
  data() {
    return {
      block: {},
      loading: false
    }
  },
  watch: {
    '$route.params.hash': {
      immediate: true,
      handler(hash) {
        if (hash) this.loadBlock(hash)
      }
    }
  },
  methods: {
    async loadBlock(hash) {
      this.loading = true
      try {
        this.block = await blockService.getByHash(hash) || {}
      } catch (error) {
        console.error('Failed to load block:', error)
      } finally {
        this.loading = false
      }
    },
    formatTime(ts) {
      return ts ? new Date(ts * 1000).toLocaleString() : ''
    },
    formatSize(size) {
      return size ? `${(size / 1024).toFixed(2)} KB` : '0 B'
    }
  }
}
</script>
