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
  showMore: { type: Boolean, default: false },
});

defineEmits(["update:showMore"]);

const toAddress = computed(() => props.tx?.contractHash || props.tx?.to || "");

const txMethod = computed(() => {
  if (props.tx?.method) return props.tx.method;
  if (props.tx?.notifications?.length > 0) {
    return props.tx.notifications[0].eventname || "Transfer";
  }
  return "Transfer";
});
</script>
