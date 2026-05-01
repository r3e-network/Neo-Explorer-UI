<template>
  <div class="etherscan-card mb-6">
    <div class="card-header">
      <h2 class="text-base font-semibold text-high">{{ $t("tokenDetail.overviewTitle") }}</h2>
    </div>

    <!-- Token Image -->
    <div v-if="hasTokenImage" class="card-header">
      <img
        :src="image"
        :alt="tokenInfo['tokenname'] ? tokenInfo['tokenname'] + ' icon' : 'Token'"
        class="h-16 w-16 rounded-lg object-contain"
        loading="lazy"
        @error="$event.target.src='/img/brand/neo.png'"
      />
    </div>

    <div class="soft-divider divide-y px-4 md:px-5 pb-2">
      <!-- Name -->
      <InfoRow :label="$t('tokenDetail.overviewName')">
        <span>
          {{ tokenInfo["tokenname"] }}
          <span v-if="tokenInfo.ispopular" class="ml-1" :title="$t('aria.popularToken')">&#x1F525;</span>
        </span>
      </InfoRow>
      <!-- Hash -->
      <InfoRow
        :label="$t('tokenDetail.overviewHash')"
        :value="tokenInfo['hash']"
        :copyable="!!tokenInfo['hash']"
        :copy-value="tokenInfo['hash']"
      >
        <span class="font-hash text-primary-500 break-all">{{ tokenInfo["hash"] }}</span>
      </InfoRow>
      <!-- Symbol -->
      <InfoRow :label="$t('tokenDetail.overviewSymbol')" :value="tokenInfo['symbol']" />
      <!-- Decimals -->
      <InfoRow :label="$t('tokenDetail.statDecimals')" :value="String(tokenInfo['decimals'] ?? 0)" />
      <!-- Standard -->
      <InfoRow :label="$t('tokenDetail.overviewStandard')" :value="`NEP-${tokenInfo['type']}`" />
      <!-- First Transfer -->
      <InfoRow :label="$t('tokenDetail.overviewFirstTransfer')">
        <span v-if="tokenInfo.firsttransfertime">
          {{ formatTime(tokenInfo["firsttransfertime"]) }}
        </span>
        <span v-else class="text-mid">&mdash;</span>
      </InfoRow>
      <!-- Total Supply -->
      <InfoRow :label="$t('tokenDetail.statTotalSupply')" :value="convertToken(tokenInfo['totalsupply'], decimal)" />
      <!-- Holders -->
      <InfoRow :label="$t('tokenDetail.statHolders')" :value="String(tokenInfo['holders'] ?? 0)" />
    </div>
  </div>
</template>

<script setup>
import { convertToken } from "@/utils/neoHelpers";
import { formatTime } from "@/utils/timeFormat";
import InfoRow from "@/components/common/InfoRow.vue";

defineProps({
  tokenInfo: {
    type: Object,
    required: true,
  },
  decimal: {
    type: [String, Number],
    default: "",
  },
  image: {
    type: String,
    default: "",
  },
  hasTokenImage: {
    type: Boolean,
    default: false,
  },
  copied: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["copy-hash", "view-contract"]);
</script>
