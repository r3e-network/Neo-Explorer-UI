<template>
  <div class="home-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Hero Section with Search -->
    <section class="hero-section relative overflow-hidden">
      <!-- Animated Background -->
      <div class="absolute inset-0 bg-gradient-to-br from-neo-green via-primary-700 to-primary-900"></div>
      <div class="absolute inset-0 opacity-20">
        <div class="absolute inset-0 bg-grid-pattern"></div>
      </div>
      <!-- Floating particles effect -->
      <div class="absolute inset-0 overflow-hidden">
        <div class="particle particle-1"></div>
        <div class="particle particle-2"></div>
        <div class="particle particle-3"></div>
      </div>
      
      <div class="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div class="text-center mb-10">
          <!-- Logo -->
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm mb-6">
            <svg class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18l6.26 3.48L12 11.14 5.74 7.66 12 4.18zM5 8.82l6 3.33v6.52l-6-3.33V8.82zm8 9.85v-6.52l6-3.33v6.52l-6 3.33z"/>
            </svg>
          </div>
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
            Neo N3 Explorer
          </h1>
          <p class="text-primary-100 text-lg md:text-xl max-w-2xl mx-auto opacity-90">
            {{ $t('home.subtitle') || 'Explore the Neo Smart Economy Blockchain' }}
          </p>
        </div>
        
        <!-- Large Search Box -->
        <div class="max-w-4xl mx-auto">
          <SearchBox 
            @search="handleSearch" 
            :placeholder="$t('search.placeholder') || 'Search by Address / Txn Hash / Block / Token / Contract'"
            :loading="searchLoading"
          />
          <!-- Quick Links -->
          <div class="flex flex-wrap justify-center gap-3 mt-6">
            <router-link to="/blocks/1" 
                         class="quick-link px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 
                                text-white text-sm font-medium transition-all backdrop-blur-sm">
              📦 Blocks
            </router-link>
            <router-link to="/Transactions/1" 
                         class="quick-link px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 
                                text-white text-sm font-medium transition-all backdrop-blur-sm">
              💸 Transactions
            </router-link>
            <router-link to="/tokens/nep17/1" 
                         class="quick-link px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 
                                text-white text-sm font-medium transition-all backdrop-blur-sm">
              🪙 Tokens
            </router-link>
            <router-link to="/contracts/1" 
                         class="quick-link px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 
                                text-white text-sm font-medium transition-all backdrop-blur-sm">
              📜 Contracts
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Price & Stats Banner -->
    <section class="stats-banner py-6 -mt-8 relative z-20">
      <div class="container mx-auto px-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-5 md:p-6">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            <!-- NEO Price -->
            <div class="stat-item group cursor-pointer" @click="$router.push('/NEP17tokeninfo/0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5')">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-neo-green to-green-600 flex items-center justify-center shadow-sm">
                  <span class="text-white text-sm font-bold">N</span>
                </div>
                <span class="text-gray-500 dark:text-gray-400 text-sm font-medium">NEO</span>
              </div>
              <div class="flex items-baseline gap-2">
                <span class="text-xl md:text-2xl font-bold text-gray-800 dark:text-white group-hover:text-primary-500 transition-colors">
                  ${{ formatPrice(neoPrice) }}
                </span>
                <span :class="priceChangeClass(neoPriceChange)" class="text-xs font-semibold px-1.5 py-0.5 rounded">
                  {{ formatPriceChange(neoPriceChange) }}
                </span>
              </div>
            </div>

            <!-- GAS Price -->
            <div class="stat-item group cursor-pointer" @click="$router.push('/NEP17tokeninfo/0xd2a4cff31913016155e38e474a2c06d08be276cf')">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-sm">
                  <span class="text-white text-sm font-bold">G</span>
                </div>
                <span class="text-gray-500 dark:text-gray-400 text-sm font-medium">GAS</span>
              </div>
              <div class="flex items-baseline gap-2">
                <span class="text-xl md:text-2xl font-bold text-gray-800 dark:text-white group-hover:text-primary-500 transition-colors">
                  ${{ formatPrice(gasPrice) }}
                </span>
                <span :class="priceChangeClass(gasPriceChange)" class="text-xs font-semibold px-1.5 py-0.5 rounded">
                  {{ formatPriceChange(gasPriceChange) }}
                </span>
              </div>
            </div>

            <!-- Market Cap -->
            <div class="stat-item hidden md:block">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4z"/>
                  </svg>
                </div>
                <span class="text-gray-500 dark:text-gray-400 text-sm font-medium">Market Cap</span>
              </div>
              <div class="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                ${{ formatLargeNumber(marketCap) }}
              </div>
            </div>

            <!-- Block Height -->
            <div class="stat-item group cursor-pointer" @click="$router.push('/blocks/1')">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <svg class="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2L3 7v6l7 5 7-5V7l-7-5z"/>
                  </svg>
                </div>
                <span class="text-gray-500 dark:text-gray-400 text-sm font-medium">Block Height</span>
              </div>
              <div class="text-xl md:text-2xl font-bold text-gray-800 dark:text-white group-hover:text-primary-500 transition-colors">
                {{ formatNumber(blockCount) }}
              </div>
            </div>

            <!-- Transactions -->
            <div class="stat-item hidden lg:block group cursor-pointer" @click="$router.push('/Transactions/1')">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <span class="text-gray-500 dark:text-gray-400 text-sm font-medium">Transactions</span>
              </div>
              <div class="text-xl md:text-2xl font-bold text-gray-800 dark:text-white group-hover:text-primary-500 transition-colors">
                {{ formatNumber(txCount) }}
              </div>
            </div>

            <!-- TPS -->
            <div class="stat-item hidden lg:block">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <span class="text-gray-500 dark:text-gray-400 text-sm font-medium">TPS</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                  {{ tps.toFixed(2) }}
                </span>
                <span class="relative flex h-2.5 w-2.5">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Network Stats Cards -->
    <section class="network-stats py-8">
      <div class="container mx-auto px-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <StatCard 
            v-for="stat in networkStats" 
            :key="stat.key"
            :label="stat.label"
            :value="stat.value"
            :icon="stat.icon"
            :color="stat.color"
            :loading="loading"
            :route="stat.route"
            :trend="stat.trend"
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
          <div class="card bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div class="card-header flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-transparent dark:from-primary-900/20">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                  <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2L3 7v6l7 5 7-5V7l-7-5z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-800 dark:text-white">
                    {{ $t('homePage.recentBlocks') || 'Latest Blocks' }}
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Real-time block updates</p>
                </div>
              </div>
              <router-link 
                to="/blocks/1" 
                class="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 
                       text-primary-600 dark:text-primary-400 text-sm font-medium 
                       hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
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
                  <Skeleton class="h-16" />
                </div>
              </template>
              <template v-else-if="latestBlocks.length === 0">
                <EmptyState message="No blocks found" icon="block" />
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
          <div class="card bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div class="card-header flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-800 dark:text-white">
                    {{ $t('homePage.recentTxs') || 'Latest Transactions' }}
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Real-time transaction updates</p>
                </div>
              </div>
              <router-link 
                to="/Transactions/1" 
                class="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/30 
                       text-green-600 dark:text-green-400 text-sm font-medium 
                       hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
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
                  <Skeleton class="h-16" />
                </div>
              </template>
              <template v-else-if="latestTxs.length === 0">
                <EmptyState message="No transactions found" icon="transaction" />
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
    <section class="chart-section py-8 pb-12">
      <div class="container mx-auto px-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-5 md:p-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h3 class="text-lg font-bold text-gray-800 dark:text-white">
                Network Activity
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">Last 14 days transaction history</p>
            </div>
            <div class="flex gap-2 mt-4 md:mt-0">
              <button 
                v-for="type in chartTypes" 
                :key="type.key"
                @click="activeChartType = type.key"
                :class="[
                  'px-4 py-2 text-sm rounded-lg font-medium transition-all',
                  activeChartType === type.key 
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                ]"
              >
                {{ type.label }}
              </button>
            </div>
          </div>
          <div class="h-72 md:h-80">
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
import EmptyState from '@/components/common/EmptyState.vue'
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
    EmptyState,
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
  @apply p-3 rounded-xl transition-all duration-200;
}
.stat-item:hover {
  @apply bg-gray-50 dark:bg-gray-700/50;
}

/* Grid pattern background */
.bg-grid-pattern {
  background-image: 
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Floating particles */
.particle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  animation: float 20s infinite ease-in-out;
}
.particle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
  animation-delay: 0s;
}
.particle-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: 10%;
  animation-delay: -5s;
}
.particle-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  right: 20%;
  animation-delay: -10s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

/* Quick links hover effect */
.quick-link {
  border: 1px solid rgba(255,255,255,0.2);
}
.quick-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
</style>
