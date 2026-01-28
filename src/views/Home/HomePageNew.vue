<template>
  <div class="home-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Hero Section with Search -->
    <section class="hero-section relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900"></div>
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0" style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fill-opacity=&quot;0.4&quot;%3E%3Cpath d=&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
      </div>
      
      <div class="container mx-auto px-4 py-12 md:py-16 relative z-10">
        <div class="text-center mb-8">
          <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
            Neo N3 Explorer
          </h1>
          <p class="text-primary-100 text-base md:text-lg max-w-2xl mx-auto">
            {{ $t('home.subtitle') || 'The Neo Smart Economy Blockchain Explorer' }}
          </p>
        </div>
        
        <!-- Search Box -->
        <div class="max-w-3xl mx-auto">
          <SearchBox 
            @search="handleSearch" 
            :placeholder="$t('search.placeholder') || 'Search by Address / Txn Hash / Block / Token / Contract'"
            :loading="searchLoading"
          />
        </div>
      </div>
    </section>

    <!-- Price & Stats Banner -->
    <section class="stats-banner py-6 -mt-6 relative z-20">
      <div class="container mx-auto px-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-4 md:p-6">
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            <!-- NEO Price -->
            <div class="stat-item">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-6 h-6 rounded-full bg-neo-green/20 flex items-center justify-center">
                  <span class="text-neo-green text-xs font-bold">N</span>
                </div>
                <span class="text-gray-500 dark:text-gray-400 text-sm">NEO Price</span>
              </div>
              <div class="flex items-baseline gap-2">
                <span class="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                  ${{ formatPrice(neoPrice) }}
                </span>
                <span :class="priceChangeClass(neoPriceChange)" class="text-xs font-medium">
                  {{ formatPriceChange(neoPriceChange) }}
                </span>
              </div>
            </div>

            <!-- GAS Price -->
            <div class="stat-item">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span class="text-green-500 text-xs font-bold">G</span>
                </div>
                <span class="text-gray-500 dark:text-gray-400 text-sm">GAS Price</span>
              </div>
              <div class="flex items-baseline gap-2">
                <span class="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                  ${{ formatPrice(gasPrice) }}
                </span>
                <span :class="priceChangeClass(gasPriceChange)" class="text-xs font-medium">
                  {{ formatPriceChange(gasPriceChange) }}
                </span>
              </div>
            </div>

            <!-- Market Cap -->
            <div class="stat-item hidden md:block">
              <div class="text-gray-500 dark:text-gray-400 text-sm mb-1">Market Cap</div>
              <div class="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                ${{ formatLargeNumber(marketCap) }}
              </div>
            </div>

            <!-- Block Height -->
            <div class="stat-item">
              <div class="text-gray-500 dark:text-gray-400 text-sm mb-1">Block Height</div>
              <div class="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                {{ formatNumber(blockCount) }}
              </div>
            </div>

            <!-- Transactions -->
            <div class="stat-item hidden lg:block">
              <div class="text-gray-500 dark:text-gray-400 text-sm mb-1">Transactions</div>
              <div class="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                {{ formatNumber(txCount) }}
              </div>
            </div>

            <!-- TPS -->
            <div class="stat-item hidden lg:block">
              <div class="text-gray-500 dark:text-gray-400 text-sm mb-1">TPS</div>
              <div class="flex items-center gap-2">
                <span class="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                  {{ tps.toFixed(2) }}
                </span>
                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Network Stats Cards -->
    <section class="network-stats py-6">
      <div class="container mx-auto px-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            v-for="stat in networkStats" 
            :key="stat.key"
            :label="stat.label"
            :value="stat.value"
            :icon="stat.icon"
            :color="stat.color"
            :loading="loading"
            :route="stat.route"
            @click="navigateTo(stat.route)"
          />
        </div>
      </div>
    </section>

    <!-- Latest Data Section -->
    <section class="latest-section py-6">
      <div class="container mx-auto px-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Latest Blocks -->
          <div class="card bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden">
            <div class="card-header flex justify-between items-center p-4 md:p-5 border-b border-gray-100 dark:border-gray-700">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <svg class="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2L3 7v6l7 5 7-5V7l-7-5z"/>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-white">
                  {{ $t('homePage.recentBlocks') || 'Latest Blocks' }}
                </h3>
              </div>
              <router-link 
                to="/blocks/1" 
                class="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center gap-1"
              >
                {{ $t('homePage.seeAll') || 'View All' }}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </router-link>
            </div>
            
            <div class="divide-y divide-gray-100 dark:divide-gray-700">
              <template v-if="loading">
                <div v-for="i in 6" :key="i" class="p-4">
                  <Skeleton class="h-14" />
                </div>
              </template>
              <template v-else>
                <BlockListItem 
                  v-for="block in latestBlocks" 
                  :key="block.hash" 
                  :block="block"
                />
              </template>
            </div>
          </div>

          <!-- Latest Transactions -->
          <div class="card bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden">
            <div class="card-header flex justify-between items-center p-4 md:p-5 border-b border-gray-100 dark:border-gray-700">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-white">
                  {{ $t('homePage.recentTxs') || 'Latest Transactions' }}
                </h3>
              </div>
              <router-link 
                to="/Transactions/1" 
                class="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center gap-1"
              >
                {{ $t('homePage.seeAll') || 'View All' }}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </router-link>
            </div>
            
            <div class="divide-y divide-gray-100 dark:divide-gray-700">
              <template v-if="loading">
                <div v-for="i in 6" :key="i" class="p-4">
                  <Skeleton class="h-14" />
                </div>
              </template>
              <template v-else>
                <TxListItem 
                  v-for="tx in latestTxs" 
                  :key="tx.hash" 
                  :tx="tx"
                />
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Network Activity Chart -->
    <section class="chart-section py-6">
      <div class="container mx-auto px-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-4 md:p-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 md:mb-0">
              Network Activity (14 Days)
            </h3>
            <div class="flex gap-2">
              <button 
                v-for="type in chartTypes" 
                :key="type.key"
                @click="activeChartType = type.key"
                :class="[
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  activeChartType === type.key 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                ]"
              >
                {{ type.label }}
              </button>
            </div>
          </div>
          <div class="h-64 md:h-80">
            <NetworkChart :type="activeChartType" :data="chartData" />
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
import NetworkChart from '@/components/charts/NetworkChart.vue'
import { statsService, blockService, transactionService, searchService } from '@/services'

export default {
  name: 'HomePageNew',
  components: { 
    SearchBox, 
    StatCard, 
    BlockListItem, 
    TxListItem, 
    Skeleton,
    NetworkChart
  },
  
  data() {
    return {
      loading: true,
      searchLoading: false,
      blockCount: 0,
      txCount: 0,
      contractCount: 0,
      candidateCount: 0,
      addressCount: 0,
      tokenCount: 0,
      latestBlocks: [],
      latestTxs: [],
      neoPrice: 0,
      gasPrice: 0,
      neoPriceChange: 0,
      gasPriceChange: 0,
      marketCap: 0,
      tps: 0,
      activeChartType: 'transactions',
      chartData: [],
      chartTypes: [
        { key: 'transactions', label: 'Transactions' },
        { key: 'addresses', label: 'Active Addresses' },
        { key: 'gas', label: 'GAS Used' }
      ],
      refreshInterval: null
    }
  },

  computed: {
    networkStats() {
      return [
        { 
          key: 'blocks', 
          label: this.$t('homePage.totalBLocks') || 'Total Blocks', 
          value: this.formatNumber(this.blockCount), 
          route: '/blocks/1',
          icon: 'block',
          color: 'primary'
        },
        { 
          key: 'txs', 
          label: this.$t('homePage.totalTxs') || 'Total Transactions', 
          value: this.formatNumber(this.txCount), 
          route: '/Transactions/1',
          icon: 'transaction',
          color: 'green'
        },
        { 
          key: 'contracts', 
          label: this.$t('homePage.totalCntrts') || 'Total Contracts', 
          value: this.formatNumber(this.contractCount), 
          route: '/contracts/1',
          icon: 'contract',
          color: 'purple'
        },
        { 
          key: 'addresses', 
          label: this.$t('homePage.totalAddrs') || 'Total Addresses', 
          value: this.formatNumber(this.addressCount), 
          route: '/account/1',
          icon: 'address',
          color: 'orange'
        }
      ]
    }
  },

  created() {
    this.loadData()
    this.loadPrices()
    // Auto refresh every 15 seconds
    this.refreshInterval = setInterval(() => {
      this.loadLatestData()
    }, 15000)
  },

  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  },

  methods: {
    async loadData() {
      this.loading = true
      try {
        await Promise.all([
          this.loadStats(),
          this.loadLatestData(),
          this.loadChartData()
        ])
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        this.loading = false
      }
    },

    async loadStats() {
      try {
        const stats = await statsService.getDashboardStats()
        this.blockCount = stats.blocks || 0
        this.txCount = stats.txs || 0
        this.contractCount = stats.contracts || 0
        this.candidateCount = stats.candidates || 0
        this.addressCount = stats.addresses || 0
        this.tokenCount = stats.tokens || 0
      } catch (error) {
        console.error('Failed to load stats:', error)
      }
    },

    async loadLatestData() {
      try {
        const [blocksRes, txsRes] = await Promise.all([
          blockService.getList(6, 0),
          transactionService.getList(6, 0)
        ])
        this.latestBlocks = blocksRes?.result || []
        this.latestTxs = txsRes?.result || []
        
        // Calculate TPS from latest blocks
        if (this.latestBlocks.length >= 2) {
          const timeDiff = this.latestBlocks[0].timestamp - this.latestBlocks[this.latestBlocks.length - 1].timestamp
          const totalTxs = this.latestBlocks.reduce((sum, b) => sum + (b.txcount || 0), 0)
          this.tps = timeDiff > 0 ? totalTxs / timeDiff : 0
        }
      } catch (error) {
        console.error('Failed to load latest data:', error)
      }
    },

    async loadPrices() {
      try {
        // Fetch prices from CoinGecko or similar API
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=neo,gas&vs_currencies=usd&include_24hr_change=true')
        const data = await response.json()
        
        this.neoPrice = data.neo?.usd || 0
        this.neoPriceChange = data.neo?.usd_24h_change || 0
        this.gasPrice = data.gas?.usd || 0
        this.gasPriceChange = data.gas?.usd_24h_change || 0
        
        // Calculate market cap (100M NEO total supply)
        this.marketCap = this.neoPrice * 100000000
      } catch (error) {
        console.error('Failed to load prices:', error)
        // Use fallback values
        this.neoPrice = 12.50
        this.gasPrice = 4.20
      }
    },

    async loadChartData() {
      try {
        const data = await statsService.getNetworkActivity(14)
        this.chartData = data || []
      } catch (error) {
        console.error('Failed to load chart data:', error)
        // Generate mock data for demo
        this.chartData = this.generateMockChartData()
      }
    },

    generateMockChartData() {
      const data = []
      const now = Date.now()
      for (let i = 13; i >= 0; i--) {
        data.push({
          date: new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          transactions: Math.floor(Math.random() * 5000) + 1000,
          addresses: Math.floor(Math.random() * 500) + 100,
          gas: Math.floor(Math.random() * 10000) + 2000
        })
      }
      return data
    },

    async handleSearch(query) {
      if (!query) return
      this.searchLoading = true
      try {
        const result = await searchService.search(query)
        if (result.type === 'block') {
          this.$router.push(`/blockinfo/${result.data.hash || query}`)
        } else if (result.type === 'transaction') {
          this.$router.push(`/transactionInfo/${result.data.hash || query}`)
        } else if (result.type === 'contract') {
          this.$router.push(`/contractinfo/${result.data.hash || query}`)
        } else if (result.type === 'address') {
          this.$router.push(`/accountprofile/${query}`)
        } else if (result.type === 'token') {
          this.$router.push(`/NEP17tokeninfo/${result.data.hash || query}`)
        } else {
          this.$router.push({ path: '/search', query: { q: query } })
        }
      } catch (error) {
        console.error('Search error:', error)
        this.$router.push({ path: '/search', query: { q: query } })
      } finally {
        this.searchLoading = false
      }
    },

    navigateTo(route) {
      if (route) this.$router.push(route)
    },

    formatNumber(num) {
      if (!num) return '0'
      return num.toLocaleString()
    },

    formatPrice(price) {
      if (!price) return '0.00'
      return price.toFixed(2)
    },

    formatPriceChange(change) {
      if (!change) return '0.00%'
      const sign = change >= 0 ? '+' : ''
      return `${sign}${change.toFixed(2)}%`
    },

    priceChangeClass(change) {
      return change >= 0 
        ? 'text-green-500' 
        : 'text-red-500'
    },

    formatLargeNumber(num) {
      if (!num) return '0'
      if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
      if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
      if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
      return num.toFixed(2)
    }
  }
}
</script>

<style scoped>
.stat-item {
  @apply p-2 rounded-lg transition-colors;
}
.stat-item:hover {
  background-color: rgba(249, 250, 251, 1);
}
</style>
