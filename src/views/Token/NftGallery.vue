<template>
  <div class="nft-gallery min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">NFT Gallery</h1>
        <p class="text-gray-500">Explore Neo N3 NFT collections</p>
      </div>

      <!-- Filter -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
        <div class="flex flex-wrap gap-4">
          <input v-model="search" type="text" placeholder="Search NFTs..."
            class="flex-1 min-w-[200px] px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
          <select v-model="sortBy" class="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
            <option value="recent">Most Recent</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <!-- NFT Grid -->
      <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="i in 8" :key="i" class="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse">
          <div class="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg mb-3"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>

      <div v-else-if="nfts.length" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="nft in nfts" :key="nft.id" 
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
          <div class="aspect-square bg-gray-100 dark:bg-gray-700">
            <img v-if="nft.image" :src="nft.image" :alt="nft.name" class="w-full h-full object-cover" />
          </div>
          <div class="p-4">
            <p class="font-medium text-gray-800 dark:text-white truncate">{{ nft.name }}</p>
            <p class="text-sm text-gray-500 truncate">{{ nft.collection }}</p>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-12 text-gray-500">
        No NFTs found
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NftGallery',
  data() {
    return { nfts: [], loading: false, search: '', sortBy: 'recent' }
  }
}
</script>
