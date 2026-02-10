<template>
  <div class="token-detail-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6">
      <nav class="mb-4 flex items-center text-sm text-text-secondary dark:text-gray-400">
        <router-link to="/homepage" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/tokens/nep17/1" class="hover:text-primary-500">Tokens</router-link>
        <span class="mx-2">/</span>
        <span class="text-text-primary dark:text-gray-300">{{ token.symbol || "-" }}</span>
      </nav>

      <div class="mb-6 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-500 dark:bg-primary-900/30 dark:text-primary-400"
        >
          <span class="text-lg font-bold">{{ token.symbol?.charAt(0) || "?" }}</span>
        </div>
        <div>
          <h1 class="text-xl font-semibold text-text-primary dark:text-gray-100">
            {{ token.tokenname || "Token" }} ({{ token.symbol || "-" }})
          </h1>
          <p class="text-sm text-text-secondary dark:text-gray-400">NEP-17 Token</p>
        </div>
      </div>

      <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="info-card">
          <p class="info-label">Total Supply</p>
          <p class="info-value">{{ formatSupply }}</p>
        </div>
        <div class="info-card">
          <p class="info-label">Holders</p>
          <p class="info-value">{{ formatNumber(token.holders) }}</p>
        </div>
        <div class="info-card">
          <p class="info-label">Type</p>
          <p class="info-value">{{ token.type || "NEP-17" }}</p>
        </div>
        <div class="info-card">
          <p class="info-label">Decimals</p>
          <p class="info-value">{{ token.decimals || 0 }}</p>
        </div>
      </div>

      <div class="mb-6 etherscan-card">
        <InfoRow
          label="Contract"
          tooltip="The smart contract address for this token"
          :copyable="!!token.hash"
          :copy-value="token.hash"
        >
          <router-link
            v-if="token.hash"
            :to="`/contract-info/${token.hash}`"
            class="break-all font-mono text-sm etherscan-link"
          >
            {{ token.hash }}
          </router-link>
          <span v-else>-</span>
        </InfoRow>
      </div>

      <div class="etherscan-card">
        <div class="border-b border-card-border dark:border-card-border-dark">
          <nav class="flex flex-wrap">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="border-b-2 px-4 py-3 text-sm font-medium transition-colors"
              :class="
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-500 dark:text-primary-400'
                  : 'border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200'
              "
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <div class="p-4 md:p-5">
          <div v-if="!token.hash" class="py-8 text-center text-text-secondary dark:text-gray-400">
            Loading token details...
          </div>

          <div v-else-if="activeTab === 'transfers'">
            <TokenTxNep17
              :key="`token-transfers-${token.hash}`"
              :contract-hash="token.hash"
              :decimal="tokenDecimals"
              :symbol="token.symbol"
            />
          </div>

          <div v-else>
            <TokenHolder :key="`token-holders-${token.hash}`" :contract-hash="token.hash" :decimal="tokenDecimals" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { tokenService } from "@/services";
import { formatNumber } from "@/utils/explorerFormat";
import { getTokenDetailTabs } from "@/utils/detailRouting";
import InfoRow from "@/components/common/InfoRow.vue";
import TokenTxNep17 from "@/views/Token/TokenTxNep17.vue";
import TokenHolder from "@/views/Token/TokenHolder.vue";

export default {
  name: "TokenDetailNew",
  components: {
    InfoRow,
    TokenTxNep17,
    TokenHolder,
  },
  data() {
    return {
      token: {},
      loading: false,
      activeTab: "transfers",
      tabs: getTokenDetailTabs(),
    };
  },
  computed: {
    formatSupply() {
      const totalSupply = this.token?.totalsupply;
      if (!totalSupply) return "0";
      const decimals = this.token?.decimals || 0;
      return (totalSupply / Math.pow(10, decimals)).toLocaleString();
    },
    tokenDecimals() {
      return Number(this.token?.decimals || 0);
    },
  },
  watch: {
    "$route.params.hash": {
      immediate: true,
      handler(hash) {
        if (hash) this.loadToken(hash);
      },
    },
  },
  methods: {
    async loadToken(hash) {
      this.loading = true;
      try {
        this.token = (await tokenService.getByHash(hash)) || {};
      } catch {
        // Service layer handles error logging
      } finally {
        this.loading = false;
      }
    },
    formatNumber,
  },
};
</script>

<style scoped>
.info-card {
  @apply rounded-lg border border-card-border bg-white p-4 shadow-sm dark:border-card-border-dark dark:bg-gray-900;
}

.info-label {
  @apply text-sm text-text-secondary dark:text-gray-400;
}

.info-value {
  @apply mt-1 text-lg font-semibold text-text-primary dark:text-gray-100;
}
</style>
