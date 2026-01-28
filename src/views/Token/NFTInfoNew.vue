<template>
  <div class="nft-info min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center text-sm text-gray-500 mb-4">
        <router-link to="/" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <span class="text-gray-700 dark:text-gray-300">NFT Detail</span>
      </nav>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>

      <!-- Content -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- NFT Image -->
        <div class="lg:col-span-1">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <div class="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img v-if="image" :src="image" :alt="nftName" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <!-- NFT Details -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">{{ nftName }}</h1>
            
            <div class="space-y-4">
              <div class="flex flex-col md:flex-row py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-gray-500 w-32 mb-1 md:mb-0">Token ID</span>
                <span class="font-mono text-sm break-all">{{ tokenId }}</span>
              </div>
              <div class="flex flex-col md:flex-row py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-gray-500 w-32 mb-1 md:mb-0">Contract</span>
                <router-link :to="`/contractinfo/${contractHash}`" class="text-primary-500 font-mono text-sm">
                  {{ contractHash }}
                </router-link>
              </div>
              <div class="flex flex-col md:flex-row py-2 border-b border-gray-100 dark:border-gray-700">
                <span class="text-gray-500 w-32 mb-1 md:mb-0">Owner</span>
                <router-link :to="`/accountprofile/${address}`" class="text-primary-500 font-mono text-sm">
                  {{ address }}
                </router-link>
              </div>
              <div v-if="description" class="flex flex-col py-2">
                <span class="text-gray-500 mb-1">Description</span>
                <p class="text-gray-700 dark:text-gray-300">{{ description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'NFTInfoNew',
  data() {
    return {
      loading: true,
      nftName: '',
      image: '',
      description: ''
    }
  },
  computed: {
    tokenId() { return this.$route.params.tokenId },
    contractHash() { return this.$route.params.contractHash },
    address() { return this.$route.params.address }
  },
  created() {
    this.loadNFT()
  },
  methods: {
    async loadNFT() {
      this.loading = true
      try {
        const res = await axios.post('/api', {
          jsonrpc: '2.0', id: 1,
          method: 'GetNep11PropertiesByContractHashTokenId',
          params: { ContractHash: this.contractHash, tokenIds: [this.tokenId] }
        })
        const data = res.data?.result?.result?.[0]
        if (data) {
          this.nftName = data.name || 'Unknown NFT'
          this.image = data.image?.replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/') || ''
          this.description = data.description || ''
        }
      } catch (e) {
        console.error('Failed to load NFT:', e)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
