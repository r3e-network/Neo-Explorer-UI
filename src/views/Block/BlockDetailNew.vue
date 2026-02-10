<template>
  <div class="block-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <!-- Breadcrumb -->
      <nav aria-label="Breadcrumb" class="flex items-center text-sm text-gray-500 mb-4">
        <router-link to="/" class="hover:text-primary-500">Home</router-link>
        <svg class="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          />
        </svg>
        <router-link to="/blocks/1" class="hover:text-primary-500">Blocks</router-link>
        <svg class="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          />
        </svg>
        <span class="text-gray-700 dark:text-gray-300">#{{ block.index }}</span>
      </nav>

      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div class="flex items-center gap-3 mb-4 md:mb-0">
          <div class="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Block #{{ formatNumber(block.index) }}</h1>
            <p class="text-sm text-gray-500">{{ timeAgo }}</p>
          </div>
        </div>
        <!-- Navigation Buttons -->
        <div class="flex gap-2">
          <button
            @click="goToPrevBlock"
            :disabled="!block.prevhash"
            aria-label="Previous block"
            class="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            @click="goToNextBlock"
            :disabled="!block.nextblockhash"
            aria-label="Next block"
            class="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-4">
        <div class="etherscan-card p-6">
          <Skeleton class="h-6 w-1/3 mb-4" />
          <Skeleton class="h-4 w-full mb-2" v-for="i in 8" :key="i" />
        </div>
      </div>

      <!-- Block Overview -->
      <div v-else class="space-y-6">
        <div class="etherscan-card overflow-hidden">
          <div class="p-4 border-b border-card-border dark:border-card-border-dark">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white">Overview</h2>
          </div>
          <div class="p-4 md:p-6 space-y-4">
            <InfoRow label="Block Height" :copyable="false">
              <span class="font-mono">{{ formatNumber(block.index) }}</span>
            </InfoRow>
            <InfoRow label="Timestamp">
              <span>{{ formatTime(block.timestamp) }}</span>
              <span class="text-gray-500 ml-2">({{ timeAgo }})</span>
            </InfoRow>
            <InfoRow label="Transactions">
              <span class="text-primary-500 font-medium">{{ block.txcount || 0 }} transactions</span>
            </InfoRow>
          </div>
        </div>

        <!-- Block Details -->
        <div class="etherscan-card overflow-hidden">
          <div class="p-4 border-b border-card-border dark:border-card-border-dark">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white">Details</h2>
          </div>
          <div class="p-4 md:p-6 space-y-4">
            <InfoRow label="Block Hash">
              <HashLink :hash="block.hash" type="block" />
            </InfoRow>
            <InfoRow label="Previous Block">
              <HashLink :hash="block.prevhash" type="block" />
            </InfoRow>
            <InfoRow label="Merkle Root">
              <span class="font-mono text-sm break-all">{{ block.merkleroot }}</span>
            </InfoRow>
            <InfoRow label="Size">
              <span>{{ formatSize(block.size) }}</span>
            </InfoRow>
            <InfoRow label="Version">
              <span>{{ block.version }}</span>
            </InfoRow>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { blockService } from "@/services";
import { formatNumber, formatBytes, formatUnixTime } from "@/utils/explorerFormat";
import InfoRow from "@/components/common/InfoRow.vue";
import HashLink from "@/components/common/HashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";

export default {
  name: "BlockDetailNew",
  components: { InfoRow, HashLink, Skeleton },
  data() {
    return {
      block: {},
      loading: false,
    };
  },
  computed: {
    timeAgo() {
      if (!this.block?.timestamp) return "";
      // neo3fura returns millisecond timestamps (13+ digits); normalize to seconds
      const ts = this.block.timestamp > 1e12 ? Math.floor(this.block.timestamp / 1000) : this.block.timestamp;
      const secs = Math.max(0, Math.floor(Date.now() / 1000 - ts));
      if (secs < 60) return `${secs} secs ago`;
      if (secs < 3600) return `${Math.floor(secs / 60)} mins ago`;
      if (secs < 86400) return `${Math.floor(secs / 3600)} hrs ago`;
      return `${Math.floor(secs / 86400)} days ago`;
    },
  },
  watch: {
    "$route.params.hash": {
      immediate: true,
      handler(hash) {
        if (hash) this.loadBlock(hash);
      },
    },
  },
  methods: {
    async loadBlock(hash) {
      this.loading = true;
      try {
        this.block = (await blockService.getInfoByHash(hash)) || {};
      } catch {
        // Service layer handles error logging
      } finally {
        this.loading = false;
      }
    },
    formatNumber,
    formatTime(ts) {
      return formatUnixTime(ts) || "";
    },
    formatSize(size) {
      return formatBytes(size);
    },
    goToPrevBlock() {
      if (this.block.prevhash) {
        this.$router.push(`/block-info/${this.block.prevhash}`);
      }
    },
    goToNextBlock() {
      if (this.block.nextblockhash) {
        this.$router.push(`/block-info/${this.block.nextblockhash}`);
      }
    },
  },
};
</script>
