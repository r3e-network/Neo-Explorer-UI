<script setup>
import { computed } from "vue";
import { formatNumber, formatAge, formatBytes, formatGas } from "@/utils/explorerFormat";
import { NULL_TX_HASH } from "@/constants";
import InfoRow from "@/components/common/InfoRow.vue";
import HashLink from "@/components/common/HashLink.vue";

const props = defineProps({
  block: { type: Object, required: true },
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
</script>

<template>
  <!-- Overview Card -->
  <div class="etherscan-card overflow-hidden">
    <div class="card-header">
      <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Overview</h2>
    </div>
    <div class="p-4 md:p-6">
      <!-- Block Height -->
      <InfoRow label="Block Height">
        <span class="font-mono font-medium">{{ formatNumber(block.index) }}</span>
      </InfoRow>

      <!-- Timestamp -->
      <InfoRow label="Timestamp">
        <svg
          class="mr-1.5 inline h-4 w-4 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{{ formatTimestamp(block.timestamp) }}</span>
        <span class="ml-1.5 text-text-secondary">({{ timeAgo }})</span>
      </InfoRow>

      <!-- Transactions -->
      <InfoRow label="Transactions">
        <span
          v-if="blockTransactionCount > 0"
          class="inline-flex items-center rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
        >
          {{ blockTransactionCount }} transaction{{ blockTransactionCount !== 1 ? "s" : "" }}
        </span>
        <span v-else class="text-text-secondary">0 transactions</span>
      </InfoRow>

      <!-- Validator / Next Consensus -->
      <InfoRow label="Validated By" tooltip="The consensus node that proposed this block">
        <HashLink v-if="block.nextconsensus" :hash="block.nextconsensus" type="address" />
        <span v-else class="text-text-secondary">--</span>
      </InfoRow>

      <!-- Size -->
      <InfoRow label="Size">
        <span>{{ formatBytes(block.size) }}</span>
      </InfoRow>
    </div>
  </div>

  <!-- Details Card -->
  <div class="etherscan-card overflow-hidden">
    <div class="card-header">
      <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Details</h2>
    </div>
    <div class="p-4 md:p-6">
      <!-- Block Hash -->
      <InfoRow label="Hash" :copyable="true" :copy-value="block.hash">
        <span class="font-mono text-sm break-all">{{ block.hash }}</span>
      </InfoRow>

      <!-- Previous Hash -->
      <InfoRow label="Previous Hash">
        <router-link
          v-if="block.prevhash && block.prevhash !== NULL_TX_HASH"
          :to="`/block-info/${block.prevhash}`"
          class="etherscan-link font-mono text-sm break-all"
        >
          {{ block.prevhash }}
        </router-link>
        <span v-else class="font-mono text-sm text-text-secondary">Genesis Block (no previous)</span>
      </InfoRow>

      <!-- Merkle Root -->
      <InfoRow label="Merkle Root">
        <span class="font-mono text-sm break-all text-text-primary dark:text-gray-300">
          {{ block.merkleroot || "--" }}
        </span>
      </InfoRow>

      <!-- Next Consensus -->
      <InfoRow label="Next Consensus" tooltip="Address of the next consensus node">
        <HashLink v-if="block.nextconsensus" :hash="block.nextconsensus" type="address" :truncate="false" />
        <span v-else class="text-text-secondary">--</span>
      </InfoRow>

      <!-- Version -->
      <InfoRow label="Version">
        <span>{{ block.version ?? "--" }}</span>
      </InfoRow>

      <!-- Nonce -->
      <InfoRow v-if="block.nonce" label="Nonce">
        <span class="font-mono text-sm">{{ block.nonce }}</span>
      </InfoRow>
    </div>
  </div>

  <!-- Fees & Reward Card -->
  <div class="etherscan-card overflow-hidden">
    <div class="card-header">
      <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Fees &amp; Reward</h2>
    </div>
    <div class="p-4 md:p-6">
      <InfoRow label="System Fee Total">
        <span class="font-mono">{{ formatGas(block.sysfee || block.totalSysFee || 0) }} GAS</span>
      </InfoRow>
      <InfoRow label="Network Fee Total">
        <span class="font-mono">{{ formatGas(block.netfee || block.totalNetFee || 0) }} GAS</span>
      </InfoRow>
      <InfoRow v-if="reward !== null" label="GAS Reward" tooltip="Block reward distributed to consensus nodes">
        <span class="font-mono text-green-600 dark:text-green-400"> {{ formatGas(reward) }} GAS </span>
      </InfoRow>
    </div>
  </div>

  <!-- Witnesses (Collapsible) -->
  <div v-if="block.witnesses && block.witnesses.length > 0" class="etherscan-card overflow-hidden">
    <button
      aria-label="Toggle witnesses section"
      :aria-expanded="showWitnesses"
      class="flex w-full items-center justify-between border-b border-card-border px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-card-border-dark dark:hover:bg-gray-800/60"
      @click="emit('update:showWitnesses', !showWitnesses)"
    >
      <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">
        Witnesses
        <span class="ml-1.5 text-sm font-normal text-text-secondary"> ({{ block.witnesses.length }}) </span>
      </h2>
      <svg
        class="h-5 w-5 text-gray-400 transition-transform dark:text-gray-500"
        :class="{ 'rotate-180': showWitnesses }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div v-if="showWitnesses" class="divide-y divide-card-border dark:divide-card-border-dark">
      <div v-for="(w, idx) in block.witnesses" :key="idx" class="p-4">
        <p class="mb-1 text-xs font-medium text-text-secondary">Witness #{{ idx + 1 }}</p>
        <div class="space-y-2">
          <div>
            <span class="text-xs text-text-secondary">Invocation:</span>
            <p class="mt-0.5 break-all font-mono text-xs text-gray-700 dark:text-gray-300">
              {{ w.invocation }}
            </p>
          </div>
          <div>
            <span class="text-xs text-text-secondary">Verification:</span>
            <p class="mt-0.5 break-all font-mono text-xs text-gray-700 dark:text-gray-300">
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
      <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">dBFT 2.0 Consensus</h2>
    </div>
    <div class="p-4 md:p-6">
      <InfoRow label="Consensus Model">
        <span>Delegated Byzantine Fault Tolerance (dBFT 2.0)</span>
      </InfoRow>
      <InfoRow label="Block Time">
        <span>~15 seconds</span>
      </InfoRow>
      <InfoRow label="Finality">
        <span class="inline-flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-green-500"></span>
          Deterministic (single-block finality)
        </span>
      </InfoRow>
      <InfoRow label="Primary Index" v-if="block.primary !== undefined && block.primary !== null">
        <span class="font-mono">{{ block.primary }}</span>
      </InfoRow>
    </div>
  </div>
</template>
