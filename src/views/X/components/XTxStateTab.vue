<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="soft-divider divide-y">
      <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-4 py-3">
        <Skeleton width="30%" height="18px" />
        <Skeleton width="60px" height="18px" />
        <Skeleton width="20%" height="18px" />
        <Skeleton width="20%" height="18px" />
      </div>
    </div>

    <!-- Error -->
    <ErrorState
      v-else-if="error"
      :title="tf('neoX.stateChanges', 'State Changes')"
      :message="tf('errors.loadFailed', 'Failed to load data.')"
      @retry="refresh"
    />

    <!-- Empty -->
    <EmptyState v-else-if="rows.length === 0" :message="tf('neoX.noStateChanges', 'No state changes')" icon="default" />

    <!-- Table -->
    <div v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px]">
          <thead class="table-head">
            <tr>
              <th scope="col" class="table-header-cell">{{ tf("neoX.address", "Address") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.type", "Type") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.before", "Before") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.after", "After") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.change", "Change") }}</th>
            </tr>
          </thead>
          <tbody class="soft-divider divide-y">
            <tr v-for="(change, i) in rows" :key="i" class="list-row group">
              <td class="table-cell">
                <XHashLink
                  v-if="change.address?.hash"
                  type="address"
                  :hash="change.address.hash"
                  :name="change.address.name || ''"
                />
                <span v-else class="text-mid">—</span>
              </td>
              <td class="table-cell">
                <span class="badge-soft">{{ typeLabel(change) }}</span>
              </td>
              <td class="table-cell-secondary whitespace-nowrap">{{ formatBalance(change, change.balanceBefore) }}</td>
              <td class="table-cell-secondary whitespace-nowrap">{{ formatBalance(change, change.balanceAfter) }}</td>
              <td class="table-cell whitespace-nowrap" :class="changeClass(change)">{{ formatChange(change) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="hasMore" class="soft-divider border-t px-4 py-3 text-center">
        <button type="button" class="btn-outline px-4 py-2 text-xs" :disabled="loadingMore" @click="loadMore">
          {{ tf("neoX.loadMore", "Load More") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { transactionService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import XHashLink from "@/components/common/XHashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { formatGas, formatUnits } from "@/utils/neoxFormat";

const props = defineProps({
  hash: { type: String, required: true },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const {
  items: rows,
  loading,
  loadingMore,
  error,
  hasMore,
  loadMore,
  refresh,
} = useCursorList((cursor, { signal }) =>
  transactionService.getStateChanges(props.hash, { net: getNeoxNet(), cursor, signal }),
);

const tokenDecimals = (change) => Number(change.token?.decimals ?? 18);
const tokenSymbol = (change) => change.token?.symbol || "";

function typeLabel(change) {
  if (change.type === "coin") return "GAS";
  return tokenSymbol(change) || change.type || "—";
}

function formatBalance(change, value) {
  if (value === undefined || value === null) return "—";
  if (change.type === "coin") return formatGas(value);
  return formatUnits(value, tokenDecimals(change));
}

function formatChange(change) {
  const value = change.change;
  if (value === undefined || value === null) return "—";
  // NFT rows arrive as a structured array of { direction, total: { token_id } }.
  if (Array.isArray(value)) {
    return value
      .map((entry) => `${entry?.direction === "from" ? "-" : "+"}#${entry?.total?.token_id ?? "?"}`)
      .join(", ");
  }
  const str = String(value);
  const negative = str.startsWith("-");
  const amount = change.type === "coin" ? formatGas(str) : formatUnits(str, tokenDecimals(change));
  const symbol = change.type === "coin" ? "GAS" : tokenSymbol(change);
  const signed = negative || amount.startsWith("-") ? amount : `+${amount}`;
  return symbol ? `${signed} ${symbol}` : signed;
}

function changeClass(change) {
  const value = change.change;
  if (value === undefined || value === null || Array.isArray(value)) return "";
  return String(value).startsWith("-") ? "text-status-error" : "text-status-success";
}
</script>
