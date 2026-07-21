<template>
  <div class="overflow-x-auto">
    <table class="w-full" :class="dense ? 'min-w-[420px]' : 'min-w-[800px]'">
      <thead class="table-head">
        <tr>
          <th scope="col" class="table-header-cell">{{ tf("neoX.block", "Block") }}</th>
          <th scope="col" class="table-header-cell">
            <button
              type="button"
              class="cursor-pointer select-none hover:text-primary-500"
              :aria-pressed="ageMode === 'utc'"
              :title="tf('neoX.toggleAgeUtc', 'Click to toggle Age / UTC')"
              @click="toggleAgeMode"
            >
              {{ ageMode === "utc" ? tf("neoX.dateTimeUtc", "Date Time (UTC)") : tf("neoX.age", "Age") }}
              <svg class="ml-0.5 inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </button>
          </th>
          <th scope="col" class="table-header-cell">{{ tf("neoX.txnCount", "Txn") }}</th>
          <template v-if="!dense">
            <th scope="col" class="table-header-cell">{{ tf("neoX.gasUsed", "Gas Used") }}</th>
            <th scope="col" class="table-header-cell hidden xl:table-cell">{{ tf("neoX.gasLimit", "Gas Limit") }}</th>
            <th scope="col" class="table-header-cell hidden xl:table-cell">{{ tf("neoX.baseFee", "Base Fee") }}</th>
            <th scope="col" class="table-header-cell hidden lg:table-cell">{{ tf("neoX.burntFees", "Burnt Fees") }}</th>
            <th scope="col" class="table-header-cell">{{ tf("neoX.primaryValidator", "Primary Validator") }}</th>
          </template>
        </tr>
      </thead>
      <tbody v-if="blocks.length" class="soft-divider divide-y">
        <tr v-for="block in blocks" :key="block.hash || block.index" class="list-row group">
          <td class="table-cell">
            <router-link :to="`/x/block-info/${block.index}`" class="etherscan-link font-medium">
              #{{ formatInt(block.index) }}
            </router-link>
          </td>
          <td class="table-cell-secondary whitespace-nowrap">{{ formatWhen(block.timestampMs) }}</td>
          <td class="table-cell">
            <span class="badge-soft">{{ formatInt(block.txCount) }}</span>
          </td>
          <template v-if="!dense">
            <td class="table-cell">
              <div class="flex items-center gap-2">
                <span>{{ formatInt(block.gasUsed) }}</span>
                <span
                  class="bg-line-soft inline-block h-1.5 w-10 flex-shrink-0 overflow-hidden rounded-full"
                  :title="gasPctTitle(block)"
                >
                  <span class="block h-full rounded-full bg-primary-500" :style="{ width: `${gasPct(block)}%` }"></span>
                </span>
              </div>
            </td>
            <td class="table-cell-secondary hidden whitespace-nowrap xl:table-cell">{{ formatInt(block.gasLimit) }}</td>
            <td class="table-cell-secondary hidden whitespace-nowrap xl:table-cell">
              <span v-if="block.baseFeePerGas !== null && block.baseFeePerGas !== undefined">
                {{ formatGwei(block.baseFeePerGas) }} Gwei
              </span>
              <span v-else class="text-low">—</span>
            </td>
            <td class="table-cell-secondary hidden lg:table-cell">
              <span v-if="block.burntFees !== null && block.burntFees !== undefined">{{ formatGas(block.burntFees) }}</span>
              <span v-else class="text-low">—</span>
            </td>
            <td class="table-cell">
              <div class="flex min-w-0 items-center gap-1.5">
                <XHashLink v-if="block.primaryValidator" type="address" :hash="block.primaryValidator" />
                <span v-else-if="block.primaryPosition != null" class="whitespace-nowrap text-mid">
                  {{ tf("neoX.consensusPosition", "Consensus Position") }} #{{ block.primaryPosition }}
                </span>
                <span v-else class="text-mid">—</span>
                <span v-if="block.primaryValidator && block.primaryPosition != null" class="badge-soft whitespace-nowrap text-[10px]">
                  #{{ block.primaryPosition }}<template v-if="block.consensusSize">/{{ block.consensusSize }}</template>
                </span>
              </div>
            </td>
          </template>
        </tr>
      </tbody>
      <tbody v-else>
        <tr>
          <td :colspan="dense ? 3 : 8" class="p-0">
            <EmptyState :message="empty || tf('neoX.noBlocks', 'No blocks')" icon="block" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import XHashLink from "@/components/common/XHashLink.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import { formatInt, formatGas, formatGwei } from "@/utils/neoxFormat";
import { useAgeMode } from "@/composables/useAgeMode";

defineProps({
  blocks: { type: Array, default: () => [] },
  empty: { type: String, default: "" },
  // Home-widget mode: only Block / Age / Txn columns.
  dense: { type: Boolean, default: false },
});

const { t: translate } = useI18n();
// Fall back to a literal when a key is missing so the table is never blank.
const tf = (key, fallback) => {
  const value = translate(key);
  return value === key ? fallback : value;
};

// Shared etherscan-style Age ⇄ UTC toggle (one ref flips every table).
const { ageMode, toggleAgeMode, formatWhen } = useAgeMode();

function gasPct(block) {
  const pct = Number(block.gasUsedPercentage ?? block.raw?.gas_used_percentage);
  if (!Number.isFinite(pct)) return 0;
  return Math.min(100, Math.max(0, pct));
}

function gasPctTitle(block) {
  return `${gasPct(block).toFixed(2)}%`;
}
</script>
