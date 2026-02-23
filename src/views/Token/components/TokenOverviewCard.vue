<template>
  <div class="etherscan-card mb-6">
    <div class="card-header">
      <h2 class="text-base font-semibold text-high">Overview</h2>
    </div>

    <!-- Token Image -->
    <div v-if="hasTokenImage" class="card-header">
      <img
        :src="image"
        :alt="tokenInfo['tokenname'] ? tokenInfo['tokenname'] + ' icon' : 'Token'"
        class="h-16 w-16 rounded-lg object-contain"
      />
    </div>

    <div class="soft-divider divide-y px-4 md:px-5 pb-2">
      <!-- Name -->
      <InfoRow label="Name">
        <span>
          {{ tokenInfo["tokenname"] }}
          <span v-if="tokenInfo.ispopular" class="ml-1" title="Popular Token">&#x1F525;</span>
        </span>
      </InfoRow>
      <!-- Hash -->
      <InfoRow
        label="Hash"
        :value="tokenInfo['hash']"
        :copyable="!!tokenInfo['hash']"
        :copy-value="tokenInfo['hash']"
      >
        <span class="font-hash text-primary-500 break-all">{{ tokenInfo["hash"] }}</span>
      </InfoRow>
      <!-- Symbol -->
      <InfoRow label="Symbol" :value="tokenInfo['symbol']" />
      <!-- Decimals -->
      <InfoRow label="Decimals" :value="String(tokenInfo['decimals'])" />
      <!-- Standard -->
      <InfoRow label="Standard" :value="`NEP-${tokenInfo['type']}`" />
      <!-- First Transfer -->
      <InfoRow label="First Transfer">
        <span v-if="tokenInfo.firsttransfertime">
          {{ formatTime(tokenInfo["firsttransfertime"]) }}
        </span>
        <span v-else class="text-mid">&mdash;</span>
      </InfoRow>
      <!-- Total Supply -->
      <InfoRow label="Total Supply" :value="convertToken(tokenInfo['totalsupply'], decimal)" />
      <!-- Holders -->
      <InfoRow label="Holders" :value="String(tokenInfo['holders'])" />
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
