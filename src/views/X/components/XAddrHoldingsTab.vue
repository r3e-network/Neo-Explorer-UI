<template>
  <div>
    <!-- Standard sub-tabs -->
    <div class="mb-3 flex items-center gap-1">
      <button
        v-for="option in standardOptions"
        :key="option.key"
        type="button"
        class="tab-btn px-2.5 py-1 text-xs"
        :class="standard === option.key ? 'tab-btn-active' : 'tab-btn-inactive'"
        :aria-pressed="standard === option.key ? 'true' : 'false'"
        @click="setStandard(option.key)"
      >
        {{ option.label }}
      </button>
    </div>

    <div v-if="loading" class="soft-divider divide-y">
      <div v-for="i in 6" :key="i" class="flex items-center gap-4 px-4 py-3">
        <Skeleton width="32px" height="32px" variant="circle" />
        <Skeleton width="40%" height="18px" />
        <Skeleton width="20%" height="18px" />
      </div>
    </div>

    <ErrorState
      v-else-if="error"
      :title="tf('errors.loadFailed', 'Failed to load data.')"
      :message="tf('neoX.loadHoldingsError', 'Unable to load token holdings.')"
      @retry="refresh"
    />

    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[560px]">
          <thead class="table-head">
            <tr>
              <th scope="col" class="table-header-cell">{{ tf("neoX.token", "Token") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.balance", "Balance") }}</th>
              <th scope="col" class="table-header-cell">{{ tf("neoX.standard", "Standard") }}</th>
            </tr>
          </thead>
          <tbody v-if="items.length" class="soft-divider divide-y">
            <tr v-for="(holding, i) in items" :key="holdingKey(holding, i)" class="list-row group">
              <td class="table-cell">
                <div class="flex items-center gap-2">
                  <TokenAvatar
                    size="sm"
                    :src="holding.token?.icon_url || ''"
                    :name="holding.token?.name || ''"
                    :symbol="holding.token?.symbol || ''"
                  />
                  <XHashLink
                    type="token"
                    :hash="tokenHash(holding)"
                    :label="holding.token?.name || holding.token?.symbol || ''"
                  />
                  <span v-if="holding.token?.symbol" class="badge-soft">{{ holding.token.symbol }}</span>
                </div>
              </td>
              <td class="table-cell whitespace-nowrap">
                {{ balanceOf(holding) }}
                <span v-if="holding.token_id !== null && holding.token_id !== undefined" class="text-mid ml-1 text-xs">
                  #{{ holding.token_id }}
                </span>
              </td>
              <td class="table-cell">
                <span class="badge-soft">{{ holding.token?.type || "—" }}</span>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="3" class="p-0">
                <EmptyState :message="tf('neoX.noTokens', 'No tokens')" icon="token" />
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
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { accountService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import { formatUnits } from "@/utils/neoxFormat";
import XHashLink from "@/components/common/XHashLink.vue";
import TokenAvatar from "@/components/common/TokenAvatar.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";

const props = defineProps({
  address: { type: String, required: true },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const standard = ref("erc20");
const standardOptions = [
  { key: "erc20", label: "ERC-20" },
  { key: "erc721", label: "ERC-721" },
  { key: "erc1155", label: "ERC-1155" },
];

const { items, loading, loadingMore, error, hasMore, loadMore, refresh } = useCursorList((cursor, ctx) =>
  accountService.getTokens(props.address, { net: getNeoxNet(), type: standard.value, cursor, signal: ctx.signal })
);

function setStandard(key) {
  if (standard.value === key) return;
  standard.value = key;
}

watch(standard, () => refresh());

const tokenHash = (holding) => holding.token?.address_hash || holding.token?.address || "";
const holdingKey = (holding, i) => `${tokenHash(holding)}-${holding.token_id ?? ""}-${i}`;

function balanceOf(holding) {
  const decimals = Number(holding.token?.decimals ?? 0);
  return formatUnits(holding.value, Number.isFinite(decimals) ? decimals : 0);
}
</script>
