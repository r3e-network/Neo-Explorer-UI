<template>
  <div class="mx-auto max-w-[1400px] px-4 py-6">
    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <Skeleton height="40px" />
      <div class="etherscan-card p-6">
        <Skeleton v-for="i in 8" :key="i" height="24px" class="mb-3" />
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="py-12">
      <ErrorState :message="error" @retry="reloadToken" />
    </div>

    <template v-else>
      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h1 class="page-title">Token Detail</h1>
            <span
              v-if="updateCounter === -1"
              class="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
            >
              Destroyed
            </span>
          </div>
          <p class="page-subtitle">NEP-17 Fungible Token</p>
        </div>
        <button class="btn-outline ml-auto" @click="getContract(tokenInfo['hash'])">View Contract</button>
      </div>

      <!-- Overview Card -->
      <TokenOverviewCard
        :token-info="tokenInfo"
        :decimal="decimal"
        :image="image"
        :has-token-image="hasTokenImage"
        :copied="copied"
        @copy-hash="copyHash"
        @view-contract="getContract"
      />

      <!-- Tabs -->
      <div v-if="updateCounter !== -1">
        <div class="etherscan-card mb-0">
          <div class="card-header">
            <nav class="flex flex-wrap gap-1" role="tablist">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                role="tab"
                :aria-selected="activeName === tab.key"
                :class="['tab-btn', activeName === tab.key ? 'tab-btn-active' : 'tab-btn-inactive']"
                @click="activeName = tab.key"
              >
                {{ tab.label }}
              </button>
            </nav>
          </div>
        </div>

        <!-- Tab: Recent Transfers -->
        <div v-show="activeName === 'transfers'">
          <tokens-tx-nep17
            type="nep17"
            :contractHash="tokenId"
            :decimal="decimal === '' ? 0 : decimal"
            :symbol="tokenInfo['symbol']"
          />
        </div>

        <!-- Tab: Top Holders -->
        <div v-show="activeName === 'holders'">
          <token-holder :contract-hash="tokenId" :decimal="decimal === '' ? 0 : decimal" />
        </div>

        <!-- Tab: Contract Info -->
        <div v-show="activeName === 'contract'">
          <ContractInfoTab :manifest="manifest" @query="onQuery" @decode="decode" @update-param="onUpdateParam" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useTokenDetail } from "@/composables/useTokenDetail";
import TokensTxNep17 from "@/components/common/TransferTable.vue";
import TokenHolder from "./TokenHolder";
import TokenOverviewCard from "./components/TokenOverviewCard.vue";
import ContractInfoTab from "./components/ContractInfoTab.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";

// NEP-17 specific: token image lookup
const tokenImageList = {
  GhostMarketToken: "https://governance.ghostmarket.io/images/gm.png",
};
const image = ref("");
const hasTokenImage = ref(false);

function checkTokenImage(info) {
  const name = info["tokenname"];
  if (name && name in tokenImageList) {
    image.value = tokenImageList[name];
    hasTokenImage.value = true;
  }
}

const {
  tokenId,
  isLoading,
  error,
  tokenInfo,
  manifest,
  decimal,
  activeName,
  tabs,
  updateCounter,
  copied,
  decode,
  onUpdateParam,
  onQuery,
  getContract,
  copyHash,
  reloadToken,
} = useTokenDetail({
  defaultTab: "transfers",
  tabs: [
    { key: "transfers", label: "Recent Transfers" },
    { key: "holders", label: "Top Holders" },
    { key: "contract", label: "Contract Info" },
  ],
  onTokenLoaded: checkTokenImage,
});
</script>
