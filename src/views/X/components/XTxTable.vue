<template>
  <div class="overflow-x-auto">
    <table class="w-full" :class="dense ? 'min-w-[420px]' : 'min-w-[900px]'">
      <thead class="table-head">
        <tr>
          <th scope="col" class="table-header-cell">{{ tf("neoX.txHash", "Tx Hash") }}</th>
          <th v-if="!dense" scope="col" class="table-header-cell hidden md:table-cell">
            {{ tf("neoX.method", "Method") }}
          </th>
          <th v-if="!dense" scope="col" class="table-header-cell hidden md:table-cell">
            {{ tf("neoX.block", "Block") }}
          </th>
          <th scope="col" class="table-header-cell">{{ tf("neoX.age", "Age") }}</th>
          <th v-if="!dense" scope="col" class="table-header-cell">{{ tf("neoX.fromTo", "From → To") }}</th>
          <th scope="col" class="table-header-cell">{{ tf("neoX.valueGas", "Value (GAS)") }}</th>
          <th v-if="!dense" scope="col" class="table-header-cell hidden lg:table-cell">
            {{ tf("neoX.feeGas", "Fee (GAS)") }}
          </th>
          <th v-if="!dense" scope="col" class="table-header-cell hidden xl:table-cell">
            {{ tf("neoX.gasPrice", "Gas Price") }}
          </th>
        </tr>
      </thead>
      <tbody v-if="transactions.length" class="soft-divider divide-y">
        <tr v-for="tx in transactions" :key="tx.hash" class="list-row group">
          <td class="table-cell">
            <div class="flex items-center gap-2">
              <span
                class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                :class="statusDotClass(tx)"
                :title="statusTitle(tx)"
              >Tx</span>
              <XHashLink type="tx" :hash="tx.hash" />
              <span
                v-if="isFailed(tx)"
                class="bg-status-error-bg text-status-error rounded px-1.5 py-0.5 text-[10px] font-semibold"
              >{{ tf("status.failed", "Failed") }}</span>
            </div>
          </td>
          <td v-if="!dense" class="table-cell hidden md:table-cell">
            <span v-if="tx.method" class="badge-soft max-w-[140px] truncate" :title="tx.method">{{ tx.method }}</span>
            <span v-else class="text-mid">—</span>
          </td>
          <td v-if="!dense" class="table-cell hidden md:table-cell">
            <router-link
              v-if="tx.blockIndex !== null && tx.blockIndex !== undefined"
              :to="`/x/block-info/${tx.blockIndex}`"
              class="etherscan-link font-medium"
            >{{ formatInt(tx.blockIndex) }}</router-link>
            <span v-else class="text-mid">-</span>
          </td>
          <td class="table-cell-secondary whitespace-nowrap">{{ timeAgo(tx.timestampMs) }}</td>
          <td v-if="!dense" class="table-cell">
            <div class="flex items-center gap-1.5">
              <XHashLink v-if="tx.sender" type="address" :hash="tx.sender" :name="tx.fromInfo?.name || ''" />
              <span v-else class="text-mid">—</span>
              <svg
                class="text-low h-4 w-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <XHashLink v-if="tx.to" type="address" :hash="tx.to" :name="tx.toInfo?.name || ''" />
              <XHashLink
                v-else-if="tx.createdContract?.hash"
                type="address"
                :hash="tx.createdContract.hash"
                :name="tx.createdContract.name || tf('neoX.contractCreation', 'Contract creation')"
              />
              <span v-else class="text-mid">—</span>
            </div>
          </td>
          <td class="table-cell whitespace-nowrap">{{ formatGas(tx.value) }}</td>
          <td v-if="!dense" class="table-cell-secondary hidden whitespace-nowrap lg:table-cell">
            <span v-if="tx.fee !== null && tx.fee !== undefined">{{ formatGas(tx.fee) }}</span>
            <span v-else class="text-low">—</span>
          </td>
          <td v-if="!dense" class="table-cell-secondary hidden whitespace-nowrap xl:table-cell">
            <span v-if="tx.gasPrice !== null && tx.gasPrice !== undefined">{{ formatGwei(tx.gasPrice) }} Gwei</span>
            <span v-else class="text-low">—</span>
          </td>
        </tr>
      </tbody>
      <tbody v-else>
        <tr>
          <td :colspan="dense ? 3 : 8" class="p-0">
            <EmptyState :message="empty || tf('neoX.noTransactions', 'No transactions')" icon="tx" />
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
import { formatGas, formatGwei, formatInt, timeAgo } from "@/utils/neoxFormat";

defineProps({
  transactions: { type: Array, default: () => [] },
  empty: { type: String, default: "" },
  // Home-widget mode: only Tx Hash / Age / Value columns.
  dense: { type: Boolean, default: false },
});

const { t: translate } = useI18n();
// Fall back to a literal when a key is missing so the table is never blank.
const tf = (key, fallback) => {
  const value = translate(key);
  return value === key ? fallback : value;
};

const isFailed = (tx) => tx.status === "error";

function statusDotClass(tx) {
  if (tx.status === "ok") return "bg-status-success-bg text-status-success";
  if (tx.status === "error") return "bg-status-error-bg text-status-error";
  return "bg-status-warning-bg text-status-warning";
}

function statusTitle(tx) {
  if (tx.status === "ok") return tf("status.success", "Success");
  if (tx.status === "error") return tf("status.failed", "Failed");
  return tf("status.pending", "Pending");
}
</script>
