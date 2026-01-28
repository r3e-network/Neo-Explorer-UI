<template>
  <div class="home-page min-h-screen">
    <!-- Hero Section -->
    <section class="hero-section bg-gradient-to-br from-primary-600 to-primary-800 dark:from-gray-800 dark:to-gray-900">
      <div class="container mx-auto px-4 py-16">
        <h1 class="text-4xl md:text-5xl font-bold text-center text-white mb-2">
          Neo Explorer
        </h1>
        <p class="text-center text-primary-100 dark:text-gray-400 mb-8">
          {{ $t('home.subtitle') || 'Explore the Neo N3 Blockchain' }}
        </p>
        <div class="max-w-2xl mx-auto">
          <SearchBox @search="handleSearch" placeholder="Search by Address / Txn Hash / Block / Token" />
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="stats-section py-8">
      <div class="container mx-auto px-4 -mt-16">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard 
            v-for="stat in stats" 
            :key="stat.key"
            :label="stat.label" 
            :value="stat.value"
            :loading="loading"
            class="cursor-pointer hover:shadow-lg transition-shadow"
            @click="navigateTo(stat.route)"
          />
        </div>
      </div>
    </section>

    <!-- Latest Data Section -->
    <section class="latest-section py-8">
      <div class="container mx-auto px-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Latest Blocks -->
          <div class="card">
            <div class="card-header flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 class="text-lg font-semibold">Latest Blocks</h3>
              <router-link to="/blocks/1" class="text-primary-500 hover:text-primary-600 text-sm">
                View All →
              </router-link>
            </div>
            <div class="divide-y dark:divide-gray-700">
              <BlockListItem 
                v-for="block in latestBlocks" 
                :key="block.hash" 
                :block="block"
              />
              <div v-if="loading" class="p-4">
                <Skeleton v-for="i in 5" :key="i" class="h-16 mb-2" />
              </div>
            </div>
          </div>

          <!-- Latest Transactions -->
          <div class="card">
            <div class="card-header flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 class="text-lg font-semibold">Latest Transactions</h3>
              <router-link to="/Transactions/1" class="text-primary-500 hover:text-primary-600 text-sm">
                View All →
              </router-link>
            </div>
            <div class="divide-y dark:divide-gray-700">
              <TxListItem 
                v-for="tx in latestTxs" 
                :key="tx.hash" 
                :tx="tx"
              />
              <div v-if="loading" class="p-4">
                <Skeleton v-for="i in 5" :key="i" class="h-16 mb-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import SearchBox from '@/components/common/SearchBox.vue'
import StatCard from '@/components/common/StatCard.vue'
import BlockListItem from '@/components/common/BlockListItem.vue'
import TxListItem from '@/components/common/TxListItem.vue'
import Skeleton from '@/components/common/Skeleton.vue'
import { statsService, blockService, transactionService, searchService } from '@/services'

export default {
  name: 'HomePageNew',
  components: { SearchBox, StatCard, BlockListItem, TxListItem, Skeleton },
  
  data() {
    return {
      loading: true,
      blockCount: 0,
      txCount: 0,
      contractCount: 0,
      candidateCount: 0,
      latestBlocks: [],
      latestTxs: []
    }
  },

  computed: {
    stats() {
      return [
        { key: 'blocks', label: 'Blocks', value: this.formatNumber(this.blockCount), route: '/blocks/1' },
        { key: 'txs', label: 'Transactions', value: this.formatNumber(this.txCount), route: '/Transactions/1' },
        { key: 'contracts', label: 'Contracts', value: this.formatNumber(this.contractCount), route: '/contracts/1' },
        { key: 'candidates', label: 'Candidates', value: this.formatNumber(this.candidateCount), route: '/candidates/1' }
      ]
    }
  },

  created() {
    this.loadData()
  },

  methods: {
    async loadData() {
      this.loading = true
      try {
        // Load stats
        const stats = await statsService.getDashboardStats()
        this.blockCount = stats.blocks || 0
        this.txCount = stats.txs || 0
        this.contractCount = stats.contracts || 0
        this.candidateCount = stats.candidates || 0

        // Load latest blocks and transactions
        const [blocksRes, txsRes] = await Promise.all([
          blockService.getList(5, 0),
          transactionService.getList(5, 0)
        ])
        this.latestBlocks = blocksRes?.result || []
        this.latestTxs = txsRes?.result || []
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        this.loading = false
      }
    },

    async handleSearch(query) {
      if (!query) return
      const result = await searchService.search(query)
      if (result.type === 'block') {
        this.$router.push(`/blockinfo/${result.data.hash}`)
      } else if (result.type === 'transaction') {
        this.$router.push(`/transactionInfo/${result.data.hash}`)
      } else if (result.type === 'contract') {
        this.$router.push(`/contractinfo/${result.data.hash}`)
      } else if (result.type === 'address') {
        this.$router.push(`/accountprofile/${query}`)
      } else {
        this.$router.push('/search')
      }
    },

    navigateTo(route) {
      this.$router.push(route)
    },

    formatNumber(num) {
      if (!num) return '0'
      return num.toLocaleString()
    }
  }
}
</script>

<style scoped>
.card {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden;
}
</style>
