<template>
  <div>
    <div class="soft-divider divide-y">
      <InfoRow
        label="Transaction Hash"
        tooltip="A unique identifier for this transaction"
        :value="tx.hash"
        :copyable="!!tx.hash"
        :copy-value="tx.hash"
      />

      <InfoRow v-if="txMethod" label="Method" tooltip="The function executed by this transaction">
        <span class="badge-soft">{{ txMethod }}</span>
      </InfoRow>

      <InfoRow label="Status" tooltip="The execution status of the transaction">
        <StatusBadge :status="txStatus" />
      </InfoRow>

      <InfoRow label="Block">
        <router-link v-if="tx.blockhash" :to="`/block-info/${tx.blockhash}`" class="etherscan-link">
          #{{ tx.blockIndex ?? tx.blockindex }}
        </router-link>
        <span v-else class="text-mid">Pending confirmation</span>
      </InfoRow>

      <InfoRow label="Timestamp">
        <template v-if="tx.blocktime">
          <span class="text-high">{{ formatTime(tx.blocktime) }}</span>
          <span class="text-mid ml-2 text-xs"> ({{ formatAge(tx.blocktime) }}) </span>
        </template>
        <span v-else class="text-mid">Pending confirmation</span>
      </InfoRow>

      <InfoRow label="Confirmations" tooltip="Number of blocks confirmed since this transaction">
        <span
          class="badge-soft rounded px-2 py-0.5 text-xs font-medium text-high"
        >
          {{ confirmations.toLocaleString() }} blocks
        </span>
      </InfoRow>

      <!-- Separator -->
      <div class="py-1" />

      <InfoRow label="From" tooltip="The sending address of this transaction">
        <HashLink v-if="tx.sender" :hash="tx.sender" type="address" :truncated="false" />
        <span v-else class="text-mid">-</span>
      </InfoRow>

      <InfoRow label="To / Interacted With" tooltip="The receiving address or the primary contract invoked">
        <HashLink v-if="toAddress" :hash="toAddress" type="contract" :truncated="false" />
        <span v-else class="text-mid">Contract Invocation</span>
      </InfoRow>

      <InfoRow v-if="allTransfers && allTransfers.length" label="Tokens Transferred" tooltip="Tokens sent during this transaction">
        <div class="space-y-3 mt-1">
          <div v-for="(t, tIdx) in allTransfers" :key="'overview-xfer-' + tIdx" class="flex items-center flex-wrap gap-2 text-sm bg-surface-elevated px-3 py-2 rounded-lg border border-line-soft">
            <span class="text-low font-medium">From</span>
            <HashLink v-if="t.from" :hash="scriptHashToAddress(t.from)" type="address" class="max-w-[100px] truncate" />
            <span v-else class="text-mid italic text-xs">Mint</span>
            <span class="text-low font-medium px-1">To</span>
            <HashLink v-if="t.to" :hash="scriptHashToAddress(t.to)" type="address" class="max-w-[100px] truncate" />
            <span v-else class="text-mid italic text-xs">Burn</span>
            <span class="text-high font-semibold font-mono pl-2">For</span>
            <span class="text-high font-mono">{{ formatTransferAmount(t) }}</span>
            <span class="badge-soft inline-flex items-center gap-1.5 px-2 py-1">
              <img :src="getTokenLogo(t)" alt="logo" class="w-4 h-4 rounded-full object-cover bg-white/5" />
              {{ t.tokenname || t.symbol || "Token" }}
            </span>
            <span v-if="t._standard === 'NEP-11' && t.tokenId" class="text-xs text-low">#{{ t.tokenId.length > 8 ? t.tokenId.slice(0,8)+'…' : t.tokenId }}</span>
          </div>
        </div>
      </InfoRow>

      <InfoRow label="Network Fee" :value="`${formatGas(tx.netfee)} GAS`" />
      <InfoRow label="System Fee" :value="`${formatGas(tx.sysfee)} GAS`" />

      <InfoRow label="Total Fee">
        <span class="text-high font-medium">{{ totalFee }} GAS</span>
      </InfoRow>

      <InfoRow label="Signers" tooltip="Accounts that authorized this transaction and their authorization scope">
        <div v-if="tx.signers && tx.signers.length" class="space-y-2">
          <div v-for="(signer, idx) in tx.signers" :key="idx" class="flex items-center gap-2 flex-wrap">
            <HashLink :hash="signer.account" type="address" :truncated="false" />
            <span class="badge-soft text-[10px] uppercase font-semibold tracking-wide text-mid">{{ signer.scopes }}</span>
          </div>
        </div>
        <span v-else class="text-mid">-</span>
      </InfoRow>
    </div>

    <!-- Gas Breakdown (complex transactions) -->
    <div
      v-if="isComplexTx && enrichedTrace"
      class="panel-muted mt-4 p-4"
    >
      <GasBreakdown :executions="enrichedTrace?.executions ?? []" :total-gas="totalGas" :loading="enrichedLoading" />
    </div>

    <!-- Collapsible More Details -->
    <div class="panel-muted mt-4">
      <button
        type="button"
        :aria-expanded="showMore"
        aria-controls="tx-overview-extra"
        :aria-label="`${showMore ? 'Hide' : 'Show'} additional transaction details`"
        class="list-row flex w-full items-center justify-between p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        @click="$emit('update:showMore', !showMore)"
      >
        <span class="text-sm font-medium text-primary-500"> Click to {{ showMore ? "hide" : "show" }} more </span>
        <svg
          class="h-4 w-4 text-primary-500 transition-transform duration-200"
          :class="{ 'rotate-180': showMore }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <transition name="expand">
        <div id="tx-overview-extra" v-show="showMore" class="soft-divider border-t">
          <div class="soft-divider divide-y">
            <InfoRow label="Size" :value="`${tx.size || 0} bytes`" />
            <InfoRow label="Valid Until Block">
              <router-link v-if="tx.validUntilBlock || tx.validuntilblock" :to="`/block-info/${tx.validUntilBlock || tx.validuntilblock}`" class="etherscan-link">
                #{{ tx.validUntilBlock || tx.validuntilblock }}
              </router-link>
              <span v-else class="text-mid">-</span>
            </InfoRow>
            <InfoRow label="Nonce" :value="tx.nonce != null ? String(tx.nonce) : '-'" />
            <InfoRow label="Version" :value="tx.version != null ? String(tx.version) : '-'" />
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import InfoRow from "@/components/common/InfoRow.vue";
import HashLink from "@/components/common/HashLink.vue";
import StatusBadge from "@/components/common/StatusBadge.vue";
import GasBreakdown from "@/components/trace/GasBreakdown.vue";
import { formatGas, formatAge, formatTime } from "@/utils/explorerFormat";
import { scriptHashToAddress } from "@/utils/neoHelpers";
import { GAS_DECIMALS } from "@/constants";

const props = defineProps({
  tx: { type: Object, required: true },
  txStatus: { type: String, default: "pending" },
  isSuccess: { type: [Boolean, null], default: null },
  confirmations: { type: Number, default: 0 },
  totalFee: { type: String, default: "0" },
  isComplexTx: { type: Boolean, default: false },
  enrichedTrace: { type: Object, default: null },
  enrichedLoading: { type: Boolean, default: false },
  totalGas: { type: String, default: "0" },
  allTransfers: { type: Array, default: () => [] },
  showMore: { type: Boolean, default: false },
});

defineEmits(["update:showMore"]);

const localImages = import.meta.glob('@/assets/gui/*.png', { eager: true, import: 'default' });

function getTokenLogo(t) {
  const hash = (t.contract || t.contractHash || "").toLowerCase();
  const path = `/src/assets/gui/${hash}.png`;
  
  if (localImages[path]) {
    return localImages[path];
  }
  
  const isNep11 = t._standard && t._standard.toUpperCase().includes("NEP-11");
  const fallbackPath = isNep11 ? "/src/assets/gui/defaultNep11.png" : "/src/assets/gui/defaultNep17.png";
  return localImages[fallbackPath] || "";
}

function formatTransferAmount(t) {
  const raw = Number(t.value || t.amount || 0);
  const decimals = Number(t.decimals ?? GAS_DECIMALS);
  if (decimals === 0) return String(raw);
  return (raw / Math.pow(10, decimals)).toFixed(Math.min(decimals, 8));
}

const toAddress = computed(() => props.tx?.contractHash || props.tx?.to || "");

const txMethod = computed(() => {
  if (props.tx?.method) return props.tx.method;
  if (props.tx?.notifications?.length > 0) {
    return props.tx.notifications[0].eventname || "Transfer";
  }
  return "Transfer";
});
</script>
