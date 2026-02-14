<template>
  <div>
    <div class="divide-y divide-card-border dark:divide-card-border-dark">
      <InfoRow
        label="Transaction Hash"
        tooltip="A unique identifier for this transaction"
        :value="tx.hash"
        :copyable="!!tx.hash"
        :copy-value="tx.hash"
      />

      <InfoRow label="Status" tooltip="The execution status of the transaction">
        <StatusBadge :status="txStatus" />
      </InfoRow>

      <InfoRow label="Block">
        <router-link :to="`/block-info/${tx.blockhash}`" class="etherscan-link"> #{{ tx.blockIndex }} </router-link>
      </InfoRow>

      <InfoRow label="Timestamp">
        <span class="text-text-primary dark:text-gray-200">{{ formatTime(tx.blocktime) }}</span>
        <span class="ml-2 text-xs text-text-secondary dark:text-gray-400"> ({{ formatAge(tx.blocktime) }}) </span>
      </InfoRow>

      <InfoRow label="Confirmations" tooltip="Number of blocks confirmed since this transaction">
        <span
          class="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-text-primary dark:bg-gray-700 dark:text-gray-200"
        >
          {{ confirmations.toLocaleString() }} blocks
        </span>
      </InfoRow>

      <!-- Separator -->
      <div class="py-1" />

      <InfoRow label="From" tooltip="The sending address of this transaction">
        <HashLink v-if="tx.sender" :hash="tx.sender" type="address" />
        <span v-else class="text-text-secondary">-</span>
      </InfoRow>

      <InfoRow label="Network Fee" :value="`${formatGas(tx.netfee)} GAS`" />
      <InfoRow label="System Fee" :value="`${formatGas(tx.sysfee)} GAS`" />

      <InfoRow label="Total Fee">
        <span class="font-medium text-text-primary dark:text-gray-200">{{ totalFee }} GAS</span>
      </InfoRow>

      <InfoRow label="Size" :value="`${tx.size || 0} bytes`" />
    </div>

    <!-- Gas Breakdown (complex transactions) -->
    <div
      v-if="isComplexTx && enrichedTrace"
      class="mt-4 rounded-lg border border-card-border dark:border-card-border-dark p-4"
    >
      <GasBreakdown :executions="enrichedTrace?.executions ?? []" :total-gas="totalGas" :loading="enrichedLoading" />
    </div>

    <!-- Collapsible More Details -->
    <div class="mt-4 rounded-lg border border-card-border dark:border-card-border-dark">
      <button
        class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
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
        <div v-show="showMore" class="border-t border-card-border dark:border-card-border-dark">
          <div class="divide-y divide-card-border dark:divide-card-border-dark">
            <InfoRow label="Nonce" :value="tx.nonce != null ? String(tx.nonce) : '-'" />
            <InfoRow label="Version" :value="tx.version != null ? String(tx.version) : '-'" />
            <InfoRow label="Script">
              <pre
                v-if="tx.script"
                class="max-h-40 overflow-auto rounded bg-gray-50 p-2 font-mono text-xs text-text-primary dark:bg-gray-800 dark:text-gray-300"
                >{{ tx.script }}</pre
              >
              <span v-else class="text-text-secondary">-</span>
            </InfoRow>
            <InfoRow label="Witnesses">
              <div v-if="tx.witnesses && tx.witnesses.length">
                <div v-for="(w, i) in tx.witnesses" :key="i" class="mb-2 rounded bg-gray-50 p-2 dark:bg-gray-800">
                  <p class="text-xs text-text-secondary">Witness {{ i + 1 }}</p>
                  <p class="mt-1 break-all font-mono text-xs text-text-primary dark:text-gray-300">
                    {{ w.invocation || w }}
                  </p>
                </div>
              </div>
              <span v-else class="text-text-secondary">-</span>
            </InfoRow>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import InfoRow from "@/components/common/InfoRow.vue";
import HashLink from "@/components/common/HashLink.vue";
import StatusBadge from "@/components/common/StatusBadge.vue";
import GasBreakdown from "@/components/trace/GasBreakdown.vue";
import { formatGas, formatAge, formatTime } from "@/utils/explorerFormat";

defineProps({
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
</script>
