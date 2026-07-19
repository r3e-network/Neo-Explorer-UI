<template>
  <div>
    <div v-if="loading" class="soft-divider divide-y">
      <div v-for="i in 8" :key="i" class="flex items-center gap-4 px-4 py-3">
        <Skeleton width="30px" height="18px" />
        <Skeleton width="40%" height="18px" />
        <Skeleton width="20%" height="18px" />
      </div>
    </div>

    <ErrorState
      v-else-if="error"
      :title="tf('errors.loadFailed', 'Failed to load data.')"
      :message="tf('neoX.loadHoldersError', 'Unable to load holders.')"
      @retry="refresh"
    />

    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[680px]">
          <thead class="table-head">
            <tr>
              <th scope="col" class="table-header-cell">#</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.address", "Address") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.amount", "Amount") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.percentage", "Percentage") }}</th>
            </tr>
          </thead>
          <tbody v-if="holders.length" class="soft-divider divide-y">
            <tr v-for="(holder, i) in holders" :key="`${holder.address?.hash || i}-${holder.tokenId ?? ''}`" class="list-row group">
              <td class="table-cell-secondary">{{ i + 1 }}</td>
              <td class="table-cell">
                <XHashLink
                  v-if="holder.address?.hash"
                  type="address"
                  :hash="holder.address.hash"
                  :name="holder.address.name || ''"
                />
                <span v-else class="text-mid">—</span>
              </td>
              <td class="table-cell whitespace-nowrap">{{ amountOf(holder) }}</td>
              <td class="table-cell">
                <div v-if="pctOf(holder) !== null" class="flex items-center gap-2">
                  <span class="text-sm">{{ pctOf(holder).toFixed(2) }}%</span>
                  <span class="bg-line-soft inline-block h-1.5 w-24 flex-shrink-0 overflow-hidden rounded-full">
                    <span
                      class="block h-full rounded-full bg-primary-500"
                      :style="{ width: `${Math.min(100, pctOf(holder))}%` }"
                    ></span>
                  </span>
                </div>
                <span v-else class="text-mid">—</span>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="4" class="p-0">
                <EmptyState :message="tf('neoX.noHolders', 'No holders')" icon="token" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="holders.length" class="soft-divider border-t px-4 py-3">
        <InfiniteScroll :loading="loadingMore" :has-more="hasMore" @load-more="loadMore" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { tokenService } from "@/services/neox";
import { toXHolder } from "@/adapters/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import { formatUnits } from "@/utils/neoxFormat";
import XHashLink from "@/components/common/XHashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";

const props = defineProps({
  hash: { type: String, required: true },
  decimals: { type: Number, default: null },
  totalSupply: { type: String, default: "" },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const { items, loading, loadingMore, error, hasMore, loadMore, refresh } = useCursorList((cursor, ctx) =>
  tokenService.getHolders(props.hash, { net: getNeoxNet(), cursor, signal: ctx.signal })
);

const holders = computed(() => items.value.map(toXHolder).filter(Boolean));

function amountOf(holder) {
  const decimals = Number(props.decimals ?? 0);
  return formatUnits(holder.value, Number.isFinite(decimals) ? decimals : 0);
}

function pctOf(holder) {
  try {
    const supply = BigInt(String(props.totalSupply || "0"));
    if (supply <= 0n) return null;
    const value = BigInt(String(holder.value || "0"));
    return Number((value * 10000n) / supply) / 100;
  } catch (_err) {
    return null;
  }
}
</script>
