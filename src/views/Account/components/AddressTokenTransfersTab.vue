<template>
  <section>
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="index in 6" :key="index" height="46px" />
    </div>

    <ErrorState v-else-if="error" title="Unable to load token transfers" :message="error" @retry="$emit('retry')" />

    <EmptyState
      v-else-if="!transfers.length"
      message="No token transfers found"
      description="No NEP-17 transfer records were found for this address."
    />

    <div v-else class="space-y-4">
      <p class="text-mid text-sm">Latest {{ transfers.length }} NEP-17 token transfers</p>
      <div class="surface-panel overflow-x-auto">
        <table class="w-full min-w-[850px]" aria-label="Address NEP-17 token transfers">
          <caption class="sr-only">
            NEP-17 token transfers involving this address
          </caption>
          <thead class="table-head text-xs uppercase tracking-wide">
            <tr>
              <th class="table-header-cell">Txn Hash</th>
              <th class="table-header-cell">Age</th>
              <th class="table-header-cell">From</th>
              <th class="text-low w-12 px-2 py-3 text-center font-medium"></th>
              <th class="table-header-cell">To</th>
              <th class="table-header-cell-right">Amount</th>
              <th class="table-header-cell">Token</th>
            </tr>
          </thead>
          <tbody class="soft-divider divide-y">
            <tr
              v-for="(transfer, idx) in transfers"
              :key="`nep17-${transfer.txHash}-${idx}`"
              class="list-row transition-colors"
            >
              <td class="table-cell">
                <router-link
                  :to="`/transaction-info/${transfer.txHash}`"
                  :title="transfer.txHash"
                  class="font-hash text-sm etherscan-link"
                >
                  {{ truncateHash(transfer.txHash, 10, 6) }}
                </router-link>
              </td>
              <td class="table-cell-secondary">
                {{ formatAge(transfer.timestamp) }}
              </td>
              <td class="table-cell">
                <router-link
                  v-if="transfer.from && !isSelf(transfer.from)"
                  :to="`/account-profile/${transfer.from}`"
                  class="font-hash text-sm etherscan-link"
                >
                  {{ truncateHash(transfer.from, 8, 6) }}
                </router-link>
                <span v-else-if="transfer.from" class="text-high font-hash text-sm">
                  {{ truncateHash(transfer.from, 8, 6) }}
                </span>
                <span v-else class="text-low text-sm">Null</span>
              </td>
              <td class="px-2 py-3 text-center">
                <span
                  class="inline-block min-w-[40px] rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="getDirection(transfer.from, transfer.to).cssClass"
                >
                  {{ getDirection(transfer.from, transfer.to).label }}
                </span>
              </td>
              <td class="table-cell">
                <router-link
                  v-if="transfer.to && !isSelf(transfer.to)"
                  :to="`/account-profile/${transfer.to}`"
                  class="font-hash text-sm etherscan-link"
                >
                  {{ truncateHash(transfer.to, 8, 6) }}
                </router-link>
                <span v-else-if="transfer.to" class="text-high font-hash text-sm">
                  {{ truncateHash(transfer.to, 8, 6) }}
                </span>
                <span v-else class="text-low text-sm">Null</span>
              </td>
              <td class="table-cell text-right">
                {{ formatTransferAmount(transfer.amount, transfer.decimals) }}
              </td>
              <td class="table-cell">
                <router-link
                  v-if="transfer.tokenHash"
                  :to="`/nep17-token-info/${transfer.tokenHash}`"
                  class="text-sm etherscan-link"
                >
                  {{ transfer.tokenName }}
                </router-link>
                <span v-else class="text-mid text-sm">
                  {{ transfer.tokenName }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="soft-divider border-t pt-3">
        <EtherscanPagination
          :page="page"
          :total-pages="totalPages"
          :page-size="pageSize"
          :total="totalCount"
          @update:page="$emit('goToPage', $event)"
          @update:page-size="$emit('changePageSize', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { formatAge, truncateHash } from "@/utils/explorerFormat";
import { getTransferDirection } from "@/utils/addressDetail";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";

const props = defineProps({
  address: { type: String, default: "" },
  transfers: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  totalCount: { type: Number, default: 0 },
});

defineEmits(["goToPage", "changePageSize", "retry"]);

function getDirection(from, to) {
  return getTransferDirection(from, to, props.address);
}

function isSelf(addr) {
  return (addr || "").toLowerCase() === (props.address || "").toLowerCase();
}

function formatTransferAmount(amount, decimals = 8) {
  const raw = Number(amount || 0);
  if (!Number.isFinite(raw)) return "0";
  const divisor = Math.pow(10, decimals);
  return (raw / divisor).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
  });
}
</script>
