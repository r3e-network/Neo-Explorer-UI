<template>
  <div class="contract-detail-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-gray-500 mb-4">
        <router-link to="/" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/contracts/1" class="hover:text-primary-500">Contracts</router-link>
        <span class="mx-2">/</span>
        <span class="text-gray-700 dark:text-gray-300">{{ contract.name || 'Contract' }}</span>
      </nav>

      <!-- Page Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <svg class="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ contract.name }}</h1>
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm text-gray-500">{{ truncateHash }}</span>
            <CopyButton :text="contract.hash" />
          </div>
        </div>
      </div>

      <!-- Contract Overview -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-card mb-6">
        <div class="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 class="font-semibold text-gray-800 dark:text-white">Overview</h2>
        </div>
        <div class="p-4 md:p-6 space-y-4">
          <InfoRow label="Contract Hash">
            <HashLink :hash="contract.hash" type="contract" :truncate="false" />
          </InfoRow>
          <InfoRow label="Name">{{ contract.name }}</InfoRow>
          <InfoRow label="Creator">
            <router-link v-if="contract.creator" :to="`/accountprofile/${contract.creator}`" 
                         class="text-primary-500">{{ contract.creator }}</router-link>
          </InfoRow>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { contractService } from '@/services'
import InfoRow from '@/components/common/InfoRow.vue'
import HashLink from '@/components/common/HashLink.vue'
import CopyButton from '@/components/common/CopyButton.vue'

export default {
  name: 'ContractDetailNew',
  components: { InfoRow, HashLink, CopyButton },
  data() {
    return { contract: {}, loading: false }
  },
  computed: {
    truncateHash() {
      const h = this.contract?.hash
      return h ? `${h.slice(0, 10)}...${h.slice(-6)}` : ''
    }
  },
  watch: {
    '$route.params.hash': {
      immediate: true,
      handler(hash) { if (hash) this.loadContract(hash) }
    }
  },
  methods: {
    async loadContract(hash) {
      this.loading = true
      try {
        this.contract = await contractService.getByHash(hash) || {}
      } catch (e) {
        console.error('Failed to load contract:', e)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
