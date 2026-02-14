<template>
  <section>
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="index in 6" :key="index" height="46px" />
    </div>

    <ErrorState v-else-if="error" title="Unable to load NFT transfers" :message="error" @retry="$emit('retry')" />

    <EmptyState
      v-else-if="!transfers.length"
      message="No NFT transfers found"
      description="No NEP-11 transfer records were found for this address."
    />

    <div v-else class="space-y-4">
      <p class="text-sm text-text-secondary dark:text-gray-400">Latest {{ transfers.length }} NEP-11 (NFT) transfers</p>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[850px]">
          <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
            <tr>
              <th class="table-header-cell">Txn Hash</th>
              <th class="table-header-cell">Age</th>
              <th class="table-header-cell">From</th>
              <th class="w-12 px-2 py-3 text-center font-medium text-text-secondary dark:text-gray-400"></th>
              <th class="table-header-cell">To</th>
              <th class="table-header-cell">Token ID</th>
              <th class="table-header-cell">Collection</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
            <tr
              v-for="(transfer, idx) in transfers"
              :key="`nep11-${transfer.txHash}-${idx}`"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
            >
              <td class="table-cell">
                <router-link
                  :to="`/transaction-info/${transfer.txHash}`"
                  :title="transfer.txHash"
                  class="font-hash text-sm etherscan-link"
                >
                  {{ truncateHash(transfer.txHash, 12, 8) }}
                </router-link>
              </td>
              <td class="table-cell-secondary">
                {{ formatAge(transfer.timestamp) }}
              </td>
              <td class="table-cell">
                <router-link
                  v-if="transfer.from"
                  :to="`/account-profile/${transfer.from}`"
                  class="font-hash text-sm etherscan-link"
                >
                  {{ truncateHash(transfer.from, 10, 6) }}
                </router-link>
                <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="getDirection(transfer.from, transfer.to).cssClass"
                >
                  {{ getDirection(transfer.from, transfer.to).label }}
                </span>
              </td>
              <td class="table-cell">
                <router-link
                  v-if="transfer.to"
                  :to="`/account-profile/${transfer.to}`"
                  class="font-hash text-sm etherscan-link"
                >
                  {{ truncateHash(transfer.to, 10, 6) }}
                </router-link>
                <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
              </td>
              <td class="table-cell-secondary font-hash">
                {{ transfer.tokenId ? truncateHash(transfer.tokenId, 8, 4) : "-" }}
              </td>
              <td class="table-cell">
                <router-link
                  v-if="transfer.tokenHash"
                  :to="`/nft-token-info/${transfer.tokenHash}`"
                  class="text-sm etherscan-link"
                >
                  {{ transfer.tokenName }}
                </router-link>
                <span v-else class="table-cell-secondary">{{ transfer.tokenName }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="border-t border-card-border pt-3 dark:border-card-border-dark">
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
</script>
