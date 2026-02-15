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
        <div class="page-header-icon bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
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
          <p class="page-subtitle">NEP-11 Non-Fungible Token</p>
        </div>
        <button class="btn-outline ml-auto" aria-label="View contract details" @click="getContract(tokenInfo['hash'])">
          View Contract
        </button>
      </div>

      <!-- Overview Card -->
      <TokenOverviewCard
        :token-info="tokenInfo"
        :decimal="decimal"
        :copied="copied"
        @copy-hash="copyHash"
        @view-contract="getContract"
      />

      <!-- Tabs -->
      <div v-if="updateCounter !== -1">
        <div class="etherscan-card mb-0">
          <div class="card-header">
            <TabsNav :tabs="tabs" v-model="activeName" />
          </div>
        </div>

        <!-- Tab: NFT Tokens -->
        <div v-show="activeName === 'nfts'">
          <nft-token
            v-if="tokenInfo['totalsupply'] !== 0"
            :contract-hash="tokenId"
            :decimal="decimal === '' ? 0 : decimal"
          />
          <div v-else class="etherscan-card p-6 text-center text-sm text-text-muted">No NFT tokens found</div>
        </div>

        <!-- Tab: Top Holders -->
        <div v-show="activeName === 'holders'">
          <token-holder v-if="tokenInfo['holders']" :contract-hash="tokenId" :format-balance="false" />
          <div v-else class="etherscan-card p-6 text-center text-sm text-text-muted">No holders found</div>
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
import { useTokenDetail } from "@/composables/useTokenDetail";
import TabsNav from "@/components/common/TabsNav.vue";
import NftToken from "./NftTokens";
import TokenHolder from "./TokenHolder";
import TokenOverviewCard from "./components/TokenOverviewCard.vue";
import ContractInfoTab from "./components/ContractInfoTab.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";

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
  defaultTab: "nfts",
  tabs: [
    { key: "nfts", label: "NFT Tokens" },
    { key: "holders", label: "Top Holders" },
    { key: "contract", label: "Contract Info" },
  ],
});
</script>
