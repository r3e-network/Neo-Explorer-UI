<template>
  <div class="tokens-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Page Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="container mx-auto px-4 py-6">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-white">
          {{ $t('tokens.title') || 'Token Tracker' }}
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          {{ $t('tokens.subtitle') || 'NEP-17 & NEP-11 Tokens on Neo N3' }}
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="container mx-auto px-4 py-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <!-- Tab Navigation -->
        <div class="border-b border-gray-200 dark:border-gray-700">
          <nav class="flex -mb-px">
            <button
              @click="activeTab = 'nep17'"
              :class="[
                'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'nep17'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              ]"
            >
              NEP-17 Tokens
            </button>
            <button
              @click="activeTab = 'nep11'"
              :class="[
                'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'nep11'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              ]"
            >
              NEP-11 NFTs
            </button>
          </nav>
        </div>

        <!-- Token List -->
        <div class="p-4">
          <div v-if="loading" class="space-y-4">
            <div v-for="i in 10" :key="i" class="animate-pulse">
              <div class="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>

          <div v-else-if="tokens.length === 0" class="text-center py-12">
            <p class="text-gray-500 dark:text-gray-400">No tokens found</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-gray-500 dark:text-gray-400 text-sm">
                  <th class="pb-4 font-medium">#</th>
                  <th class="pb-4 font-medium">Token</th>
                  <th class="pb-4 font-medium">Symbol</th>
                  <th class="pb-4 font-medium">Contract</th>
                  <th class="pb-4 font-medium text-right">Holders</th>
                  <th class="pb-4 font-medium text-right">Transfers</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="(token, index) in tokens" :key="token.hash" 
                    class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="py-4 text-gray-500">{{ index + 1 }}</td>
                  <td class="py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 
                                  flex items-center justify-center text-primary-600 font-bold text-sm">
                        {{ token.symbol?.charAt(0) || '?' }}
                      </div>
                      <span class="font-medium text-gray-800 dark:text-white">
                        {{ token.name || 'Unknown Token' }}
                      </span>
                    </div>
                  </td>
                  <td class="py-4 text-gray-600 dark:text-gray-300">{{ token.symbol }}</td>
                  <td class="py-4">
                    <router-link 
                      :to="`/contractinfo/${token.hash}`"
                      class="text-primary-500 hover:text-primary-600 font-mono text-sm"
                    >
                      {{ shortenHash(token.hash) }}
                    </router-link>
                  </td>
                  <td class="py-4 text-right text-gray-600 dark:text-gray-300">
                    {{ formatNumber(token.holders || 0) }}
                  </td>
                  <td class="py-4 text-right text-gray-600 dark:text-gray-300">
                    {{ formatNumber(token.transfers || 0) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="mt-6 flex justify-center">
            <nav class="flex items-center gap-2">
              <button 
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span class="px-4 py-2 text-gray-600 dark:text-gray-300">
                Page {{ currentPage }} of {{ totalPages }}
              </span>
              <button 
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { tokenService } from '@/services'

export default {
  name: 'TokensNew',
  data() {
    return {
      loading: true,
      tokens: [],
      activeTab: 'nep17',
      currentPage: 1,
      totalPages: 1,
      pageSize: 25
    }
  },
  watch: {
    activeTab() {
      this.currentPage = 1
      this.loadTokens()
    },
    '$route.params.tab'(tab) {
      if (tab) this.activeTab = tab
    },
    '$route.params.page'(page) {
      if (page) this.currentPage = parseInt(page) || 1
    }
  },
  created() {
    const { tab, page } = this.$route.params
    if (tab) this.activeTab = tab
    if (page) this.currentPage = parseInt(page) || 1
    this.loadTokens()
  },
  methods: {
    async loadTokens() {
      this.loading = true
      try {
        const offset = (this.currentPage - 1) * this.pageSize
        const response = await tokenService.getList(this.activeTab, this.pageSize, offset)
        this.tokens = response?.result || []
        this.totalPages = Math.ceil((response?.totalCount || 0) / this.pageSize) || 1
      } catch (error) {
        console.error('Failed to load tokens:', error)
        this.tokens = []
      } finally {
        this.loading = false
      }
    },
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page
        this.$router.push(`/tokens/${this.activeTab}/${page}`)
        this.loadTokens()
      }
    },
    shortenHash(hash) {
      if (!hash) return ''
      return `${hash.slice(0, 10)}...${hash.slice(-8)}`
    },
    formatNumber(num) {
      if (!num) return '0'
      return num.toLocaleString()
    }
  }
}
</script>
