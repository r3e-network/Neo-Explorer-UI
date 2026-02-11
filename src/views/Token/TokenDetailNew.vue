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
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-500 dark:bg-primary-900/40 dark:text-primary-400"
        >
          <span class="text-lg font-bold">{{ token.symbol?.charAt(0) || "?" }}</span>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-text-primary dark:text-white">
            {{ token.tokenname || "Token" }} ({{ token.symbol || "-" }})
          </h1>
          <p class="text-sm text-text-secondary dark:text-gray-400">
            {{ token.type ? `NEP-${token.type} Token` : "Token" }}
          </p>
        </div>
      </div>

      <!-- Error State -->
      <ErrorState v-if="error" title="Token not found" :message="error" @retry="loadToken(route.params.hash)" />

      <template v-else>
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
            <nav class="flex flex-wrap" role="tablist">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                role="tab"
                :aria-selected="activeTab === tab.key"
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
            <div v-if="loading" class="space-y-2 p-4">
              <Skeleton v-for="i in 6" :key="i" height="44px" />
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
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { tokenService } from "@/services";
import { formatNumber, formatSupply as formatSupplyUtil } from "@/utils/explorerFormat";
import { getTokenDetailTabs } from "@/utils/detailRouting";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import InfoRow from "@/components/common/InfoRow.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import TokenTxNep17 from "@/views/Token/TokenTxNep17.vue";
import TokenHolder from "@/views/Token/TokenHolder.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const route = useRoute();

const token = ref({});
const loading = ref(false);
const error = ref(null);
const activeTab = ref("transfers");
const tabs = getTokenDetailTabs();
const abortController = ref(null);

onBeforeUnmount(() => {
  abortController.value?.abort();
});

const formatSupply = computed(() => formatSupplyUtil(token.value?.totalsupply, token.value?.decimals || 0));

const tokenDecimals = computed(() => Number(token.value?.decimals || 0));

async function loadToken(hash) {
  abortController.value?.abort();
  abortController.value = new AbortController();

  loading.value = true;
  error.value = null;
  try {
    token.value = (await tokenService.getByHash(hash)) || {};
    if (abortController.value?.signal.aborted) return;
  } catch (err) {
    if (abortController.value?.signal.aborted) return;
    if (process.env.NODE_ENV !== "production") console.error("Failed to load token details:", err);
    error.value = "Failed to load token details. Please try again.";
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.params.hash,
  (hash) => {
    if (hash) loadToken(hash);
  },
  { immediate: true }
);
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
