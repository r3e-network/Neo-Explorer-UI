<template>
  <div class="overflow-x-auto">
    <table class="w-full" :class="dense ? 'min-w-[420px]' : 'min-w-[800px]'">
      <thead class="table-head">
        <tr>
          <th scope="col" class="table-header-cell">{{ tf("neoX.block", "Block") }}</th>
          <th scope="col" class="table-header-cell">{{ tf("neoX.age", "Age") }}</th>
          <th scope="col" class="table-header-cell">{{ tf("neoX.txnCount", "Txn") }}</th>
          <template v-if="!dense">
            <th scope="col" class="table-header-cell">{{ tf("neoX.gasUsed", "Gas Used") }}</th>
            <th scope="col" class="table-header-cell hidden xl:table-cell">{{ tf("neoX.gasLimit", "Gas Limit") }}</th>
            <th scope="col" class="table-header-cell hidden xl:table-cell">{{ tf("neoX.baseFee", "Base Fee") }}</th>
            <th scope="col" class="table-header-cell hidden lg:table-cell">{{ tf("neoX.burntFees", "Burnt Fees") }}</th>
            <th scope="col" class="table-header-cell">{{ tf("neoX.validator", "Validator") }}</th>
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
          <td class="table-cell-secondary whitespace-nowrap">{{ timeAgo(block.timestampMs) }}</td>
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
              <!-- No :name here: the identity registry labels the coinbase
                   (0x1212...0003 → "Governance Reward") instead of Blockscout's
                   generic proxy name (ERC1967Proxy). -->
              <XHashLink v-if="block.miner" type="address" :hash="block.miner" />
              <span v-else class="text-mid">—</span>
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
import { formatInt, formatGas, formatGwei, timeAgo } from "@/utils/neoxFormat";

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

function gasPct(block) {
  const pct = Number(block.gasUsedPercentage ?? block.raw?.gas_used_percentage);
  if (!Number.isFinite(pct)) return 0;
  return Math.min(100, Math.max(0, pct));
}

function gasPctTitle(block) {
  return `${gasPct(block).toFixed(2)}%`;
}
</script>
