<template>
  <div class="token-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <Breadcrumb
        :items="[
          { label: 'Home', to: '/homepage' },
          { label: 'Tokens', to: '/tokens/1' },
          { label: token.tokenname || 'Token Detail' },
        ]"
      />

      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-primary-100 text-primary-500 dark:bg-primary-900/40 dark:text-primary-400">
          <span class="text-lg font-bold">{{ token.symbol?.charAt(0) || "?" }}</span>
        </div>
        <div>
          <h1 class="page-title">{{ token.tokenname || "Token" }} ({{ token.symbol || "-" }})</h1>
          <p class="page-subtitle">
            {{ token.type ? `NEP-${token.type} Token` : "Token" }}
          </p>
        </div>
      </div>

      <!-- Error State -->
      <ErrorState v-if="error" title="Token not found" :message="error" @retry="reloadToken" />

      <template v-else>
        <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="stat-card">
            <p class="stat-label">Total Supply</p>
            <p class="stat-value">{{ formatSupply }}</p>
          </div>
          <div class="stat-card">
            <p class="stat-label">Holders</p>
            <p class="stat-value">{{ formatNumber(token.holders) }}</p>
          </div>
          <div class="stat-card">
            <p class="stat-label">Type</p>
            <p class="stat-value">{{ token.type || "NEP-17" }}</p>
          </div>
          <div class="stat-card">
            <p class="stat-label">Decimals</p>
            <p class="stat-value">{{ token.decimals || 0 }}</p>
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
              class="break-all font-hash text-sm etherscan-link"
            >
              {{ token.hash }}
            </router-link>
            <span v-else>-</span>
          </InfoRow>
        </div>

        <div class="etherscan-card">
          <div class="card-header">
            <TabsNav :tabs="tabs" v-model="activeTab" />
          </div>

          <div :id="'panel-' + activeTab" role="tabpanel" :aria-labelledby="'tab-' + activeTab" class="p-4 md:p-5">
            <div v-if="isLoading" class="space-y-2 p-4">
              <Skeleton v-for="i in 6" :key="i" height="44px" />
            </div>

            <div v-else-if="activeTab === 'transfers'">
              <TokenTxNep17
                :key="`token-transfers-${token.hash}`"
                type="nep17"
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
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { formatNumber, formatSupply as formatSupplyUtil } from "@/utils/explorerFormat";
import { useTokenDetail } from "@/composables/useTokenDetail";
import TabsNav from "@/components/common/TabsNav.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import InfoRow from "@/components/common/InfoRow.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import TokenTxNep17 from "@/components/common/TransferTable.vue";
import TokenHolder from "@/views/Token/TokenHolder.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const { isLoading, error, tokenInfo: token, activeName: activeTab, tabs, reloadToken } = useTokenDetail({
  defaultTab: "transfers",
  tabs: [
    { key: "transfers", label: "Transfers" },
    { key: "holders", label: "Top Holders" },
  ],
});

const formatSupply = computed(() => formatSupplyUtil(token.value?.totalsupply, token.value?.decimals || 0));
const tokenDecimals = computed(() => Number(token.value?.decimals || 0));
</script>
