<template>
  <div class="tx-detail-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-gray-500 mb-4">
        <router-link to="/" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/Transactions/1" class="hover:text-primary-500">Transactions</router-link>
        <span class="mx-2">/</span>
        <span class="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{{ truncateHash }}</span>
      </nav>

      <!-- Page Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="statusBgClass">
          <svg class="w-6 h-6" :class="statusIconClass" fill="currentColor" viewBox="0 0 24 24">
            <path v-if="isSuccess" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            <path v-else d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Transaction Details</h1>
          <span :class="statusBadgeClass" class="text-xs px-2 py-0.5 rounded-full">
            {{ isSuccess ? 'Success' : 'Failed' }}
          </span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6">
          <Skeleton class="h-4 w-full mb-3" v-for="i in 6" :key="i" />
        </div>
      </div>

      <!-- Transaction Overview -->
      <div v-else class="space-y-6">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-card">
          <div class="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 class="font-semibold text-gray-800 dark:text-white">Overview</h2>
          </div>
          <div class="p-4 md:p-6 space-y-4">
            <InfoRow label="Transaction Hash">
              <HashLink :hash="tx.hash" type="tx" :truncate="false" />
            </InfoRow>
            <InfoRow label="Status">
              <span :class="statusBadgeClass" class="px-2 py-1 rounded text-sm">
                {{ tx.vmstate || 'HALT' }}
              </span>
            </InfoRow>
            <InfoRow label="Block">
              <router-link :to="`/blockinfo/${tx.blockhash}`" class="text-primary-500">
                #{{ tx.blockindex }}
              </router-link>
            </InfoRow>
            <InfoRow label="Timestamp">
              {{ formatTime(tx.blocktime) }}
            </InfoRow>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { transactionService } from '@/services'
import InfoRow from '@/components/common/InfoRow.vue'
import HashLink from '@/components/common/HashLink.vue'
import Skeleton from '@/components/common/Skeleton.vue'

export default {
  name: 'TxDetailNew',
  components: { InfoRow, HashLink, Skeleton },
  data() {
    return { tx: {}, loading: false }
  },
  computed: {
    truncateHash() {
      const h = this.tx?.hash
      return h ? `${h.slice(0, 10)}...${h.slice(-6)}` : ''
    },
    isSuccess() {
      return this.tx?.vmstate === 'HALT' || !this.tx?.vmstate
    },
    statusBgClass() {
      return this.isSuccess 
        ? 'bg-green-100 dark:bg-green-900/30' 
        : 'bg-red-100 dark:bg-red-900/30'
    },
    statusIconClass() {
      return this.isSuccess ? 'text-green-500' : 'text-red-500'
    },
    statusBadgeClass() {
      return this.isSuccess
        ? 'bg-green-100 text-green-600'
        : 'bg-red-100 text-red-600'
    }
  },
  watch: {
    '$route.params.txhash': {
      immediate: true,
      handler(hash) { if (hash) this.loadTx(hash) }
    }
  },
  methods: {
    async loadTx(hash) {
      this.loading = true
      try {
        this.tx = await transactionService.getByHash(hash) || {}
      } catch (e) {
        console.error('Failed to load tx:', e)
      } finally {
        this.loading = false
      }
    },
    formatTime(ts) {
      return ts ? new Date(ts * 1000).toLocaleString() : ''
    }
  }
}
</script>
