<template>
  <div class="nft-info">
    <section class="mx-auto max-w-[1400px] px-4 py-6">
      <nav class="mb-4 flex items-center text-sm text-text-secondary dark:text-gray-400">
        <router-link to="/homepage" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <span class="text-text-primary dark:text-gray-300">NFT Detail</span>
      </nav>

      <div v-if="loading" class="space-y-2">
        <Skeleton v-for="index in 6" :key="index" height="44px" />
      </div>

      <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="lg:col-span-1">
          <div class="etherscan-card p-4">
            <div class="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              <img
                v-if="image"
                v-lazy-image="image"
                :alt="nftName || 'NFT image'"
                class="h-full w-full object-cover"
                @error="handleImageError"
              />
              <div v-else class="flex h-full items-center justify-center text-gray-400">
                <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6 lg:col-span-2">
          <div class="etherscan-card p-6">
            <h1 class="mb-4 text-2xl font-semibold text-text-primary dark:text-gray-100">
              {{ nftName }}
            </h1>

            <div class="space-y-4">
              <div class="flex flex-col border-b border-card-border py-2 dark:border-card-border-dark md:flex-row">
                <span class="mb-1 w-32 text-sm text-text-secondary dark:text-gray-400 md:mb-0">Token ID</span>
                <span class="break-all font-mono text-sm text-text-primary dark:text-gray-300">{{ tokenId }}</span>
              </div>
              <div class="flex flex-col border-b border-card-border py-2 dark:border-card-border-dark md:flex-row">
                <span class="mb-1 w-32 text-sm text-text-secondary dark:text-gray-400 md:mb-0">Contract</span>
                <router-link :to="`/contract-info/${contractHash}`" class="break-all font-mono text-sm etherscan-link">
                  {{ contractHash }}
                </router-link>
              </div>
              <div class="flex flex-col border-b border-card-border py-2 dark:border-card-border-dark md:flex-row">
                <span class="mb-1 w-32 text-sm text-text-secondary dark:text-gray-400 md:mb-0">Owner</span>
                <router-link :to="`/account-profile/${address}`" class="break-all font-mono text-sm etherscan-link">
                  {{ address }}
                </router-link>
              </div>
              <div v-if="description" class="flex flex-col py-2">
                <span class="mb-1 text-sm text-text-secondary dark:text-gray-400">Description</span>
                <p class="text-text-primary dark:text-gray-300">{{ description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { tokenService } from "@/services";
import Skeleton from "@/components/common/Skeleton.vue";

export default {
  name: "NFTInfoNew",
  components: {
    Skeleton,
  },
  data() {
    return {
      loading: true,
      nftName: "",
      image: "",
      description: "",
    };
  },
  computed: {
    tokenId() {
      return this.$route.params.tokenId;
    },
    contractHash() {
      return this.$route.params.contractHash;
    },
    address() {
      return this.$route.params.address;
    },
  },
  watch: {
    tokenId: {
      immediate: true,
      handler() {
        this.loadNFT();
      },
    },
  },
  methods: {
    handleImageError() {
      this.image = "";
    },
    async loadNFT() {
      this.loading = true;
      try {
        const result = await tokenService.getNep11Properties(this.contractHash, [this.tokenId]);
        const data = result?.result?.[0];
        if (data) {
          this.nftName = data.name || "Unknown NFT";
          this.image = data.image?.replace(/^ipfs:\/\//, "https://ipfs.io/ipfs/") || "";
          this.description = data.description || "";
        }
      } catch {
        // Service layer handles error logging
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
