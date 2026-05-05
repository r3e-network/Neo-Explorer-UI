<template>
  <section>
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="index in 6" :key="index" height="46px" />
    </div>

    <ErrorState v-else-if="error" :title="$t('addressDetail.nftTransfersError')" :message="error" @retry="$emit('retry')" />

    <EmptyState
      v-else-if="!transfers.length"
      :message="$t('addressDetail.nftTransfersEmptyTitle')"
      :description="$t('addressDetail.nftTransfersEmptyDesc')"
    />

    <div v-else class="space-y-4">
      <p class="text-mid text-sm">{{ $t("addressDetail.latestNep11", { count: transfers.length }) }}</p>
      <div class="surface-panel overflow-x-auto">
        <table class="w-full min-w-[850px]" :aria-label="$t('addressDetail.nftTransfersTableAria')">
          <caption class="sr-only">{{ $t("addressDetail.nftTransfersCaption") }}</caption>
          <thead class="table-head">
            <tr>
              <th scope="col" class="table-header-cell w-[180px]">{{ $t("transactionsPage.colTxnHash") }}</th>
              <th scope="col" class="table-header-cell">{{ $t("transactionsPage.colAge") }}</th>
              <th scope="col" class="table-header-cell">{{ $t("transactionsPage.colFrom") }}</th>
              <th scope="col" class="table-header-cell w-16 text-center"></th>
              <th scope="col" class="table-header-cell">{{ $t("transactionsPage.colTo") }}</th>
              <th scope="col" class="table-header-cell">{{ $t("transactionsPage.colTokenId") }}</th>
              <th scope="col" class="table-header-cell">{{ $t("addressDetail.colCollection") }}</th>
            </tr>
          </thead>
          <tbody class="soft-divider divide-y">
            <tr
              v-for="(transfer, idx) in transfers"
              :key="`nep11-${transfer.txHash}-${idx}`"
              class="list-row group"
            >
              <td class="table-cell">
                <router-link
                  :to="`/transaction-info/${transfer.txHash}`"
                  :title="transfer.txHash"
                  class="font-hash etherscan-link"
                >
                  {{ truncateHash(transfer.txHash, 12, 8) }}
                </router-link>
              </td>
              <td class="table-cell-secondary">
                {{ formatAge(transfer.timestamp) }}
              </td>
              <td class="table-cell">
                <HashLink v-if="transfer.from" :hash="transfer.from" type="address" :copyable="false" />
                <span v-else class="text-low">-</span>
              </td>
              <td class="table-cell text-center p-0">
                <span
                  class="inline-block min-w-[40px] rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                  :class="getDirection(transfer.from, transfer.to).cssClass"
                >
                  {{ $t(getDirection(transfer.from, transfer.to).labelKey) }}
                </span>
              </td>
              <td class="table-cell">
                <HashLink v-if="transfer.to" :hash="transfer.to" type="address" :copyable="false" />
                <span v-else class="text-low">-</span>
              </td>
              <td class="table-cell-secondary font-hash">
                {{ transfer.tokenId ? truncateHash(transfer.tokenId, 8, 4) : "-" }}
              </td>
              <td class="table-cell">
                <router-link
                  v-if="transfer.tokenHash"
                  :to="`/nft-token-info/${transfer.tokenHash}`"
                  class="etherscan-link font-medium"
                >
                  {{ transfer.tokenName }}
                </router-link>
                <span v-else class="text-mid font-medium">{{ transfer.tokenName }}</span>
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
import HashLink from "@/components/common/HashLink.vue";

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
