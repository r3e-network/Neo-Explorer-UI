<script setup>
import { computed } from "vue";
import { formatNumber, formatAge, formatBytes, formatGas } from "@/utils/explorerFormat";
import { scriptHashToAddress } from "@/utils/neoHelpers";
import { NULL_TX_HASH } from "@/constants";
import InfoRow from "@/components/common/InfoRow.vue";
import HashLink from "@/components/common/HashLink.vue";
import { useCommittee } from "@/composables/useCommittee";

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
});

const emit = defineEmits(["update:showWitnesses"]);

function formatTimestamp(ts) {
  if (!ts) return "";
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms).toUTCString();
}

const blockTransactionCount = computed(() => {
  const declared = Number(props.block?.txcount ?? props.block?.transactioncount ?? 0);
  if (Number.isFinite(declared) && declared > 0) {
    return declared;
  }
  return 0;
});

const timeAgo = computed(() => {
  if (!props.block?.timestamp) return "";
  return formatAge(props.block.timestamp);
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
  <!-- Overview Card -->
  <div class="etherscan-card overflow-hidden">
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
        <span>{{ formatTimestamp(block.timestamp) }}</span>
        <span class="ml-1.5 text-mid">({{ timeAgo }})</span>
      </InfoRow>

      <!-- Transactions -->
      <InfoRow :label="$t('blockDetail.rowTransactions')">
        <span
          v-if="blockTransactionCount > 0"
          class="inline-flex items-center rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
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
        <span class="text-high font-mono text-sm break-all">
          {{ block.stateroot || "--" }}
        </span>
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
        <span class="font-mono text-green-600 dark:text-green-400"> {{ formatGas(reward) }} GAS </span>
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
          <span class="h-2 w-2 rounded-full bg-green-500"></span>
          {{ $t("blockDetail.rowFinalityValue") }}
        </span>
      </InfoRow>
      <InfoRow :label="$t('blockDetail.rowValidator')" v-if="resolvePrimaryIndex(block) !== undefined">
        <HashLink v-if="validatorAddress" :hash="validatorAddress" type="address" :truncated="false" />
      </InfoRow>
    </div>
  </div>
</template>
