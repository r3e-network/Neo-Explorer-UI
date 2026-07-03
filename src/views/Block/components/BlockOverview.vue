<script setup>
import { computed } from "vue";
import { formatNumber, formatAge, formatBytes, formatGas } from "@/utils/explorerFormat";
import { scriptHashToAddress } from "@/utils/neoHelpers";
import { NULL_TX_HASH } from "@/constants";
import InfoRow from "@/components/common/InfoRow.vue";
import HashLink from "@/components/common/HashLink.vue";
import { useCommittee } from "@/composables/useCommittee";
import ConfirmationsRing from "@/components/charts/ConfirmationsRing.vue";
import DashboardStatCard from "@/components/charts/DashboardStatCard.vue";

const { resolvePrimaryIndex, getPrimaryNodeAddress } = useCommittee();

const validatorAddress = computed(() => {
  const resolvedPrimary = resolvePrimaryIndex(props.block);
  if (resolvedPrimary !== undefined) {
    const directAddr = getPrimaryNodeAddress(resolvedPrimary);
    if (directAddr) return scriptHashToAddress(directAddr);
  }
  return props.block?.nextconsensus ? scriptHashToAddress(props.block.nextconsensus) : null;
});

const props = defineProps({
  block: { type: Object, required: true },
  transactions: { type: Array, default: () => [] },
  reward: { type: [Number, String, null], default: null },
  showWitnesses: { type: Boolean, default: false },
  confirmations: { type: Number, default: 0 },
});

const emit = defineEmits(["update:showWitnesses"]);

const stateRootValidatedIndex = computed(() => {
  const value = Number(props.block?.stateRootValidatedIndex ?? props.block?.validatedrootindex);
  return Number.isInteger(value) && value >= 0 ? value : null;
});

const stateRootValidatedIndexLabel = computed(() => (
  stateRootValidatedIndex.value !== null ? formatNumber(stateRootValidatedIndex.value) : ""
));

function formatTimestamp(ts) {
  if (!ts) return "";
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms).toUTCString();
}

const blockTimestamp = computed(
  () => props.block?.timestamp ?? props.block?.time ?? props.block?.time_ms ?? props.block?.blocktime ?? 0,
);

const blockTransactionCount = computed(() => {
  const declared = Number(props.block?.txcount ?? props.block?.transactioncount ?? 0);
  if (Number.isFinite(declared) && declared > 0) {
    return declared;
  }
  return 0;
});

const timeAgo = computed(() => {
  if (!blockTimestamp.value) return "";
  return formatAge(blockTimestamp.value);
});

const feeSourceTransactions = computed(() => {
  if (Array.isArray(props.transactions) && props.transactions.length > 0) {
    return props.transactions;
  }
  return Array.isArray(props.block?.tx) ? props.block.tx : [];
});

const feeTotals = computed(() => {
  const directSysFee = Number(props.block?.sysfee ?? props.block?.systemFee ?? props.block?.sys_fee ?? props.block?.totalSysFee);
  const directNetFee = Number(props.block?.netfee ?? props.block?.networkFee ?? props.block?.net_fee ?? props.block?.totalNetFee);
  const hasDirectSysFee = Number.isFinite(directSysFee);
  const hasDirectNetFee = Number.isFinite(directNetFee);

  let sysfee = hasDirectSysFee ? directSysFee : 0;
  let netfee = hasDirectNetFee ? directNetFee : 0;

  const shouldUseTxFallback =
    feeSourceTransactions.value.length > 0 &&
    (!hasDirectSysFee || !hasDirectNetFee || (sysfee === 0 && netfee === 0));

  if (shouldUseTxFallback) {
    sysfee = feeSourceTransactions.value.reduce(
      (sum, tx) => sum + Number(tx?.sysfee ?? tx?.systemFee ?? tx?.sys_fee ?? 0),
      0,
    );
    netfee = feeSourceTransactions.value.reduce(
      (sum, tx) => sum + Number(tx?.netfee ?? tx?.networkFee ?? tx?.net_fee ?? 0),
      0,
    );
  }

  return { sysfee, netfee };
});
</script>

<template>
  <!-- ====== Metrics Dashboard Row ====== -->
  <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
    <DashboardStatCard
      :label="$t('blockDetail.rowBlockHeight')"
      :value="block.index"
      animated
      icon="<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 2L3 7v10l9 5 9-5V7l-9-5z'/></svg>"
      glow-color="var(--link)"
    />
    <div class="flex items-center justify-center rounded-xl border border-line-soft bg-surface-elevated p-5 card-tilt gradient-border-card">
      <ConfirmationsRing
        :confirmed="confirmations"
        :target="15"
        :label="$t('blockDetail.rowConfirmationsLabel')"
        :size="110"
      />
    </div>
    <DashboardStatCard
      :label="$t('blockDetail.rowTransactions')"
      :value="blockTransactionCount"
      animated
      icon="<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 10V3L4 14h7v7l9-11h-7z'/></svg>"
      glow-color="#3b82f6"
      spark-color="#3b82f6"
    />
    <DashboardStatCard
      :label="$t('blockDetail.rowSize')"
      :value="Number(block.size || 0)"
      suffix=" B"
      :decimals="0"
      animated
      icon="<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z'/></svg>"
      glow-color="#8b5cf6"
    />
  </div>

  <!-- Overview Card -->
  <div class="etherscan-card overflow-hidden card-tilt gradient-border-card">
    <div class="card-header">
      <h2 class="text-base font-semibold text-high">{{ $t("blockDetail.overviewTitle") }}</h2>
    </div>
    <div class="p-4 md:p-6">
      <!-- Block Height -->
      <InfoRow :label="$t('blockDetail.rowBlockHeight')">
        <span class="font-mono font-medium">{{ formatNumber(block.index) }}</span>
      </InfoRow>

      <!-- Timestamp -->
      <InfoRow :label="$t('blockDetail.rowTimestamp')">
        <svg class="mr-1.5 inline h-4 w-4 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{{ formatTimestamp(blockTimestamp) }}</span>
        <span class="ml-1.5 text-mid">({{ timeAgo }})</span>
      </InfoRow>

      <!-- Transactions -->
      <InfoRow :label="$t('blockDetail.rowTransactions')">
        <span
          v-if="blockTransactionCount > 0"
          class="inline-flex items-center rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
        >
          {{
            blockTransactionCount === 1
              ? $t("blockDetail.txCountSingular", { n: blockTransactionCount })
              : $t("blockDetail.txCountPlural", { n: blockTransactionCount })
          }}
        </span>
        <span v-else class="text-mid">{{ $t("blockDetail.txCountZero") }}</span>
      </InfoRow>

      <!-- Validator / Next Consensus -->
      <InfoRow :label="$t('blockDetail.rowValidatedBy')" :tooltip="$t('blockDetail.rowValidatedByTip')">
        <HashLink v-if="validatorAddress" :hash="validatorAddress" type="address" />
        <span v-else class="text-mid">--</span>
      </InfoRow>

      <!-- Size -->
      <InfoRow :label="$t('blockDetail.rowSize')">
        <span>{{ formatBytes(block.size) }}</span>
      </InfoRow>
    </div>
  </div>

  <!-- Details Card -->
  <div class="etherscan-card overflow-hidden">
    <div class="card-header">
      <h2 class="text-high text-base font-semibold">{{ $t("blockDetail.detailsTitle") }}</h2>
    </div>
    <div class="p-4 md:p-6">
      <!-- Block Hash -->
      <InfoRow :label="$t('blockDetail.rowHash')" :copyable="true" :copy-value="block.hash">
        <span class="font-mono text-sm break-all">{{ block.hash }}</span>
      </InfoRow>

      <!-- Previous Hash -->
      <InfoRow :label="$t('blockDetail.rowPrevHash')">
        <router-link
          v-if="block.prevhash && block.prevhash !== NULL_TX_HASH"
          :to="`/block-info/${block.prevhash}`"
          class="etherscan-link font-mono text-sm break-all"
        >
          {{ block.prevhash }}
        </router-link>
        <span v-else class="font-mono text-sm text-mid">{{ $t("blockDetail.rowGenesis") }}</span>
      </InfoRow>

      <!-- Merkle Root -->
      <InfoRow :label="$t('blockDetail.rowMerkleRoot')">
        <span class="text-high font-mono text-sm break-all">
          {{ block.merkleroot || "--" }}
        </span>
      </InfoRow>

      <!-- State Root -->
      <InfoRow :label="$t('blockDetail.rowStateRoot')" :tooltip="$t('blockDetail.rowStateRootTip')">
        <div class="flex min-w-0 flex-col gap-1.5">
          <span class="text-high font-mono text-sm break-all">
            {{ block.stateroot || "--" }}
          </span>
          <div
            v-if="block.stateRootValidated || stateRootValidatedIndex !== null"
            class="flex flex-wrap items-center gap-2 text-xs"
          >
            <span
              v-if="block.stateRootValidated"
              class="inline-flex items-center rounded bg-status-success-bg px-2 py-0.5 font-semibold text-status-success"
            >
              {{ $t("blockDetail.stateRootValidated") }}
            </span>
            <span v-else class="inline-flex items-center rounded bg-status-warning-bg px-2 py-0.5 font-semibold text-status-warning">
              {{ $t("blockDetail.stateRootPending") }}
            </span>
            <span v-if="stateRootValidatedIndexLabel" class="text-low">
              {{ $t("blockDetail.stateRootValidatedHeight", { n: stateRootValidatedIndexLabel }) }}
            </span>
          </div>
        </div>
      </InfoRow>

      <!-- Next Consensus -->
      <InfoRow :label="$t('blockDetail.rowNextConsensus')" :tooltip="$t('blockDetail.rowNextConsensusTip')">
        <HashLink v-if="block.nextconsensus" :hash="scriptHashToAddress(block.nextconsensus)" type="address" :truncated="false" />
        <span v-else class="text-mid">--</span>
      </InfoRow>

      <!-- Version -->
      <InfoRow :label="$t('blockDetail.rowVersion')">
        <span>{{ block.version ?? "--" }}</span>
      </InfoRow>

      <!-- Nonce -->
      <InfoRow v-if="block.nonce !== undefined && block.nonce !== null" :label="$t('blockDetail.rowNonce')">
        <span class="font-mono text-sm">{{ block.nonce }}</span>
      </InfoRow>
    </div>
  </div>

  <!-- Fees & Reward Card -->
  <div class="etherscan-card overflow-hidden">
    <div class="card-header">
      <h2 class="text-high text-base font-semibold">{{ $t("blockDetail.feesRewardTitle") }}</h2>
    </div>
    <div class="p-4 md:p-6">
      <InfoRow :label="$t('blockDetail.rowSysFeeTotal')">
        <span class="font-mono">{{ formatGas(feeTotals.sysfee) }} GAS</span>
      </InfoRow>
      <InfoRow :label="$t('blockDetail.rowNetFeeTotal')">
        <span class="font-mono">{{ formatGas(feeTotals.netfee) }} GAS</span>
      </InfoRow>
      <InfoRow v-if="reward !== null" :label="$t('blockDetail.rowGasReward')" :tooltip="$t('blockDetail.rowGasRewardTip')">
        <span class="font-mono font-semibold text-status-success"> {{ formatGas(reward) }} GAS </span>
      </InfoRow>
    </div>
  </div>

  <!-- Witnesses (Collapsible) -->
  <div v-if="block.witnesses && block.witnesses.length > 0" class="etherscan-card overflow-hidden">
    <button
      type="button"
      :aria-label="$t('blockDetail.witnessesToggleAria')"
      :aria-expanded="showWitnesses"
      aria-controls="block-witnesses-panel"
      class="soft-divider list-row flex w-full items-center justify-between border-b px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      @click="emit('update:showWitnesses', !showWitnesses)"
    >
      <h2 class="text-high text-base font-semibold">
        {{ $t("blockDetail.witnessesTitle") }}
        <span class="ml-1.5 text-sm font-normal text-mid"> ({{ block.witnesses.length }}) </span>
      </h2>
      <svg
        class="text-low h-5 w-5 transition-transform"
        :class="{ 'rotate-180': showWitnesses }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div v-if="showWitnesses" id="block-witnesses-panel" class="soft-divider divide-y">
      <div v-for="(w, idx) in block.witnesses" :key="idx" class="p-4">
        <p class="text-mid mb-1 text-xs font-medium">{{ $t("blockDetail.witnessLabel", { n: idx + 1 }) }}</p>
        <div class="space-y-2">
          <div>
            <span class="text-mid text-xs">{{ $t("blockDetail.witnessInvocation") }}</span>
            <p class="text-high mt-0.5 break-all font-mono text-xs">
              {{ w.invocation }}
            </p>
          </div>
          <div>
            <span class="text-mid text-xs">{{ $t("blockDetail.witnessVerification") }}</span>
            <p class="text-high mt-0.5 break-all font-mono text-xs">
              {{ w.verification }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- dBFT Consensus Info -->
  <div v-once class="etherscan-card overflow-hidden">
    <div class="card-header">
      <h2 class="text-high text-base font-semibold">{{ $t("blockDetail.consensusTitle") }}</h2>
    </div>
    <div class="p-4 md:p-6">
      <InfoRow :label="$t('blockDetail.rowConsensusModel')">
        <span>{{ $t("blockDetail.rowConsensusModelValue") }}</span>
      </InfoRow>
      <InfoRow :label="$t('blockDetail.rowBlockTime')">
        <span>{{ $t("blockDetail.rowBlockTimeValue") }}</span>
      </InfoRow>
      <InfoRow :label="$t('blockDetail.rowFinality')">
        <span class="inline-flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-status-success"></span>
          {{ $t("blockDetail.rowFinalityValue") }}
        </span>
      </InfoRow>
      <InfoRow :label="$t('blockDetail.rowValidator')" v-if="resolvePrimaryIndex(block) !== undefined">
        <HashLink v-if="validatorAddress" :hash="validatorAddress" type="address" :truncated="false" />
      </InfoRow>
    </div>
  </div>
</template>
