<template>
  <div class="token-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <Breadcrumb
        :items="[
          { label: $t('breadcrumb.home'), to: '/homepage' },
          { label: $t('breadcrumb.tokens'), to: '/tokens/1' },
          { label: tokenValue?.tokenname || $t('breadcrumb.tokenDetail') },
        ]"
      />

      <div class="detail-hero">
        <div class="flex items-start gap-3">
          <img
            v-if="tokenMetadata?.logo_url"
            :src="tokenMetadata.logo_url"
            class="h-10 w-10 rounded-full object-cover ring-1 ring-line-soft bg-white"
            :alt="$t('inline.tokenLogoAlt')"
            loading="lazy"
            @error="$event.target.src='/img/brand/neo.png'"
          />
          <img
            v-else-if="hasTokenIcon(tokenValue?.hash)"
            :src="getTokenIcon(tokenValue?.hash, tokenValue?.type)"
            class="h-10 w-10 rounded-full object-cover ring-1 ring-line-soft bg-white"
            :alt="$t('inline.tokenLogoAlt')"
            loading="lazy"
          />
          <div
            v-else
            class="page-header-icon bg-primary-100 text-primary-500 dark:bg-primary-900/40 dark:text-primary-400"
          >
            <span class="text-lg font-bold">{{ tokenMetadata?.symbol || tokenValue?.symbol?.charAt(0) || "?" }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="page-title">
                {{ tokenMetadata?.name || tokenValue?.tokenname || $t("tokenDetail.tokenFallback") }} ({{
                  tokenMetadata?.symbol || tokenValue?.symbol || "-"
                }})
              </h1>
              <span
                v-if="tokenMetadata?.is_verified"
                class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-success dark:border-emerald-800 dark:bg-emerald-900/30"
              >
                <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                {{ $t("tokenDetail.verifiedBadge") }}
              </span>
            </div>
            <p class="page-subtitle mt-1">
              {{ tokenValue?.type ? $t("tokenDetail.nepTokenSubtitle", { type: String(tokenValue.type).replace(/^NEP-?/i, "") }) : $t("tokenDetail.tokenFallback") }}
              <a
                v-if="tokenMetadata?.website"
                :href="tokenMetadata.website"
                target="_blank"
                rel="noopener noreferrer"
                class="ml-2 text-primary-500 hover:underline"
                >{{ $t("tokenDetail.officialWebsite") }} ↗</a
              >
            </p>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <ErrorState v-if="error" :title="$t('tokenDetail.notFoundTitle')" :message="error" @retry="reloadToken" />

      <template v-else>
        <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="stat-card">
            <p class="stat-label">{{ $t("tokenDetail.statTotalSupply") }}</p>
            <p class="stat-value">{{ formatSupply }}</p>
          </div>
          <div class="stat-card">
            <p class="stat-label">{{ $t("tokenDetail.statHolders") }}</p>
            <p class="stat-value">{{ formatNumber(tokenValue?.holders) }}</p>
          </div>
          <div class="stat-card">
            <p class="stat-label">{{ $t("tokenDetail.statType") }}</p>
            <p class="stat-value">{{ tokenValue?.type || "NEP-17" }}</p>
          </div>
          <div class="stat-card">
            <p class="stat-label">{{ $t("tokenDetail.statDecimals") }}</p>
            <p class="stat-value">{{ tokenValue?.decimals || 0 }}</p>
          </div>
        </div>

        <div class="mb-6 etherscan-card px-4">
          <InfoRow
            :label="$t('tokenDetail.contract')"
            :tooltip="$t('tokenDetail.contractTooltip')"
            :copyable="!!tokenValue?.hash"
            :copy-value="tokenValue?.hash"
          >
            <router-link
              v-if="tokenValue?.hash"
              :to="`/contract-info/${tokenValue.hash}`"
              class="break-all font-hash text-sm etherscan-link"
            >
              {{ tokenValue.hash }}
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

            <div v-else-if="!tokenValue?.hash" class="p-6 text-center text-sm text-mid">
              {{ $t("tokenDetail.dataUnavailable") }}
            </div>

            <div v-else-if="activeTab === 'transfers'">
              <TokenTxNep17
                :key="`token-transfers-${tokenValue?.hash || 'unknown'}`"
                type="nep17"
                :contract-hash="tokenValue?.hash"
                :decimal="tokenDecimals"
                :symbol="tokenValue?.symbol"
              />
            </div>

            <div v-else>
              <TokenHolder
                :key="`token-holders-${tokenValue?.hash || 'unknown'}`"
                :contract-hash="tokenValue?.hash"
                :decimal="tokenDecimals"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { formatNumber, formatSupply as formatSupplyUtil } from "@/utils/explorerFormat";
import { useTokenDetail } from "@/composables/useTokenDetail";

const { t } = useI18n();
import TabsNav from "@/components/common/TabsNav.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import InfoRow from "@/components/common/InfoRow.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import TokenTxNep17 from "@/components/common/TransferTable.vue";
import TokenHolder from "@/views/Token/TokenHolder.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { getTokenIcon, hasTokenIcon } from "@/utils/getTokenIcon";

const {
  isLoading,
  error,
  tokenInfo: token,
  tokenMetadata,
  activeName: activeTab,
  tabs,
  reloadToken,
} = useTokenDetail({
  defaultTab: "transfers",
  tabs: [
    { key: "transfers", label: t("tokenDetail.tabTransfers") },
    { key: "holders", label: t("tokenDetail.tabHolders") },
  ],
});

const tokenValue = computed(() => token.value || null);
const formatSupply = computed(() =>
  token.value?.totalsupply === null || token.value?.totalsupply === undefined
    ? "-"
    : formatSupplyUtil(token.value?.totalsupply, token.value?.decimals || 0)
);
const tokenDecimals = computed(() => Number(token.value?.decimals || 0));
</script>
