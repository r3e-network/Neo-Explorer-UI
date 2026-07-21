<template>
  <div>
    <div v-if="loading" class="soft-divider divide-y">
      <div v-for="i in 8" :key="i" class="flex items-center gap-4 px-4 py-3">
        <Skeleton width="30%" height="18px" />
        <Skeleton width="40%" height="18px" />
        <Skeleton width="15%" height="18px" />
      </div>
    </div>

    <ErrorState
      v-else-if="error"
      :title="tf('errors.loadFailed', 'Failed to load data.')"
      :message="tf('neoX.loadTransfersError', 'Unable to load token transfers.')"
      @retry="refresh"
    />

    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px]">
          <thead class="table-head">
            <tr>
              <th scope="col" class="table-header-cell">{{ tf("neoX.txnCount", "Txn") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.amount", "Amount") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.fromTo", "From → To") }}</th>
              <th scope="col" class="table-header-cell">
                <button
                  type="button"
                  class="cursor-pointer select-none hover:text-primary-500"
                  :aria-label="
                    ageMode === 'utc'
                      ? tf('neoX.showTimestampsAsAge', 'Show timestamps as age')
                      : tf('neoX.showTimestampsAsUtc', 'Show timestamps as UTC')
                  "
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
            </tr>
          </thead>
          <tbody v-if="items.length" class="soft-divider divide-y">
            <tr v-for="(transfer, i) in items" :key="transferKey(transfer, i)" class="list-row group">
              <td class="table-cell">
                <XHashLink v-if="txHash(transfer)" type="tx" :hash="txHash(transfer)" />
                <span v-else class="text-mid">—</span>
              </td>
              <td class="table-cell whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <span>{{ amountOf(transfer) }}</span>
                  <span
                    v-if="transfer.type === 'token_minting'"
                    class="inline-flex items-center rounded bg-status-success-bg px-1.5 py-0.5 text-[10px] font-semibold text-status-success"
                  >{{ tf("neoX.mint", "Mint") }}</span>
                  <span
                    v-else-if="transfer.type === 'token_burning'"
                    class="inline-flex items-center rounded bg-status-error-bg px-1.5 py-0.5 text-[10px] font-semibold text-status-error"
                  >{{ tf("neoX.burn", "Burn") }}</span>
                </div>
              </td>
              <td class="table-cell">
                <div class="flex items-center gap-1.5">
                  <XHashLink
                    v-if="transfer.from?.hash"
                    type="address"
                    :hash="transfer.from.hash"
                    :name="transfer.from.name || ''"
                  />
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
                  <XHashLink
                    v-if="transfer.to?.hash"
                    type="address"
                    :hash="transfer.to.hash"
                    :name="transfer.to.name || ''"
                  />
                  <span v-else class="text-mid">—</span>
                </div>
              </td>
              <td class="table-cell-secondary whitespace-nowrap">{{ formatWhen(toMs(transfer.timestamp)) }}</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="4" class="p-0">
                <EmptyState :message="tf('neoX.noTransfers', 'No token transfers')" icon="token" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="items.length" class="soft-divider border-t px-4 py-3">
        <InfiniteScroll :auto="false" :loading="loadingMore" :has-more="hasMore" @load-more="loadMore" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { tokenService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import { formatUnits } from "@/utils/neoxFormat";
import { useAgeMode } from "@/composables/useAgeMode";
import XHashLink from "@/components/common/XHashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";

const props = defineProps({
  hash: { type: String, required: true },
  decimals: { type: Number, default: null },
  symbol: { type: String, default: "" },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

// Shared etherscan-style Age ⇄ UTC toggle (one ref flips every table).
const { ageMode, toggleAgeMode, formatWhen } = useAgeMode();

const { items, loading, loadingMore, error, hasMore, loadMore, refresh } = useCursorList((cursor, ctx) =>
  tokenService.getTransfers(props.hash, { net: getNeoxNet(), cursor, signal: ctx.signal })
);

const toMs = (value) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
};

const txHash = (transfer) => transfer.transaction_hash || transfer.tx_hash || "";
const transferKey = (transfer, i) => `${txHash(transfer)}-${transfer.log_index ?? i}`;

function amountOf(transfer) {
  const total = transfer.total;
  if (total && total.value !== undefined && total.value !== null) {
    const decimals = Number(total.decimals ?? props.decimals ?? transfer.token?.decimals ?? 0);
    const amount = formatUnits(total.value, Number.isFinite(decimals) ? decimals : 0);
    return props.symbol ? `${amount} ${props.symbol}` : amount;
  }
  if (total && total.token_id !== undefined && total.token_id !== null) return `#${total.token_id}`;
  return "—";
}
</script>
