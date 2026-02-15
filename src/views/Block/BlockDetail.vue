<template>
  <div class="block-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <Breadcrumb
        :items="[
          { label: 'Home', to: '/homepage' },
          { label: 'Blocks', to: '/blocks/1' },
          {
            label: block.index != null ? `Block #${formatNumber(block.index)}` : 'Block',
          },
        ]"
      />

      <BlockHeader
        :block="block"
        :loading="loading"
        :latest-block-height="latestBlockHeight"
        :time-ago="timeAgo"
        @navigate="navigateBlock"
      />

      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div class="etherscan-card p-6">
          <Skeleton width="30%" height="24px" class="mb-6" />
          <div class="space-y-4">
            <div v-for="i in 10" :key="i" class="flex gap-4">
              <Skeleton width="120px" height="18px" />
              <Skeleton width="60%" height="18px" />
            </div>
          </div>
        </div>
      </div>

      <ErrorState v-else-if="error" title="Block not found" :message="error" @retry="loadBlock(route.params.hash)" />

      <div v-else class="space-y-6">
        <BlockOverview :block="block" :reward="reward" v-model:show-witnesses="showWitnesses" />

        <BlockTransactionsCard
          :transactions="transactions"
          :tx-loading="txLoading"
          :block-transaction-count="blockTransactionCount"
          :empty-transactions-message="emptyTransactionsMessage"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { blockService } from "@/services";
import { formatNumber, formatAge } from "@/utils/explorerFormat";
import { NETWORK_CHANGE_EVENT } from "@/utils/env";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import BlockHeader from "./components/BlockHeader.vue";
import BlockOverview from "./components/BlockOverview.vue";
import BlockTransactionsCard from "./components/BlockTransactionsCard.vue";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const abortController = ref(null);
const block = ref({});
const reward = ref(null);
const transactions = ref([]);
const loading = ref(false);
const txLoading = ref(false);
const error = ref(null);
const showWitnesses = ref(false);
const latestBlockHeight = ref(Infinity);
const BLOCK_TX_FETCH_BATCH_SIZE = 100;
let isBackgroundRefreshing = false;
let blockRequestId = 0;
let txRequestId = 0;

// --- Computed ---
const blockTransactionCount = computed(() => {
  const declared = Number(block.value?.txcount ?? block.value?.transactioncount ?? 0);
  if (Number.isFinite(declared) && declared > 0) {
    return declared;
  }

  return transactions.value.length;
});

const emptyTransactionsMessage = computed(() =>
  blockTransactionCount.value > 0
    ? "Transactions are still indexing for this block. Please retry in a few seconds."
    : "No transactions in this block"
);

const timeAgo = computed(() => {
  if (!block.value?.timestamp) return "";
  return formatAge(block.value.timestamp);
});

// --- Methods ---
function mergeBlockData(raw, info) {
  const merged = { ...(raw || {}), ...(info || {}) };
  const mergedTxCount = Number(merged?.txcount ?? merged?.transactioncount ?? 0);

  if (Number.isFinite(mergedTxCount) && mergedTxCount > 0) {
    merged.txcount = mergedTxCount;
    merged.transactioncount = mergedTxCount;
  }

  return merged;
}

async function loadBlock(hash, { silent = false, forceRefresh = false } = {}) {
  if (!hash) return;

  const requestId = ++blockRequestId;

  if (!silent) {
    abortController.value?.abort();
    abortController.value = new AbortController();
    loading.value = true;
    error.value = null;
    reward.value = null;
    transactions.value = [];
    showWitnesses.value = false;
  }

  try {
    // Fetch block info and raw block data in parallel
    const [info, raw] = await Promise.all([
      blockService.getInfoByHash(hash, { forceRefresh }),
      blockService.getByHash(hash, { forceRefresh }),
    ]);

    if (requestId !== blockRequestId || abortController.value?.signal.aborted) return;

    if (!info && !raw) {
      if (!silent) {
        error.value = t("errors.blockNotFound");
      }
      return;
    }

    // Merge info + raw for maximum field coverage
    block.value = mergeBlockData(raw, info);
    error.value = null;

    // Fetch latest block height for next-button disabled logic
    blockService
      .getCount({ forceRefresh })
      .then((count) => {
        if (requestId !== blockRequestId || abortController.value?.signal.aborted) return;
        if (count > 0) latestBlockHeight.value = count - 1;
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn("Block count fetch failed:", err);
      });

    // Load transactions and reward in parallel (non-blocking)
    void loadTransactions({ silent, forceRefresh });
    loadReward(hash);
  } catch (err) {
    if (requestId !== blockRequestId || abortController.value?.signal.aborted) return;
    if (import.meta.env.DEV) console.error("Failed to load block details:", err);
    if (!silent) {
      error.value = t("errors.loadBlockDetails");
    }
  } finally {
    if (!silent && requestId === blockRequestId) {
      loading.value = false;
    }
  }
}

async function loadTransactions({ silent = false, forceRefresh = false } = {}) {
  const requestId = ++txRequestId;

  if (!silent) {
    txLoading.value = true;
  }

  try {
    const blockHash = block.value?.hash;
    const blockIndex = Number(block.value?.index);

    if (!blockHash) {
      if (!silent) {
        transactions.value = [];
      }
      return;
    }

    if (Array.isArray(block.value.tx) && block.value.tx.length > 0) {
      if (requestId !== txRequestId || abortController.value?.signal.aborted) return;

      transactions.value = block.value.tx;
      if (!block.value.txcount) {
        block.value.txcount = block.value.tx.length;
        block.value.transactioncount = block.value.tx.length;
      }
      return;
    }

    const declaredCount = Number(block.value?.txcount ?? block.value?.transactioncount ?? 0);

    const fetchPagedTransactions = async (fetchFn, expectedCount) => {
      let maxToLoad = expectedCount > 0 ? expectedCount : BLOCK_TX_FETCH_BATCH_SIZE;
      let loaded = 0;
      const collected = [];

      while (loaded < maxToLoad) {
        if (abortController.value?.signal.aborted) return { collected, expectedTotal: maxToLoad };

        const limit = Math.min(BLOCK_TX_FETCH_BATCH_SIZE, maxToLoad - loaded);
        const res = await fetchFn(limit, loaded);

        if (requestId !== txRequestId || abortController.value?.signal.aborted) {
          return { collected, expectedTotal: maxToLoad };
        }

        const list = Array.isArray(res?.result) ? res.result : [];
        if (loaded === 0) {
          const totalFromApi = Number(res?.totalCount || 0);
          if (Number.isFinite(totalFromApi) && totalFromApi > maxToLoad) {
            maxToLoad = totalFromApi;
          }
        }

        if (list.length === 0) {
          break;
        }

        collected.push(...list);
        loaded += list.length;

        if (list.length < limit) {
          break;
        }
      }

      return { collected, expectedTotal: maxToLoad };
    };

    let { collected, expectedTotal } = await fetchPagedTransactions(
      (limit, skip) =>
        blockService.getTransactionsByHash(blockHash, limit, skip, {
          forceRefresh,
        }),
      declaredCount
    );

    if (collected.length === 0 && Number.isFinite(blockIndex) && blockIndex >= 0 && declaredCount > 0) {
      const fallback = await fetchPagedTransactions(
        (limit, skip) =>
          blockService.getTransactionsByHeight(blockIndex, limit, skip, {
            forceRefresh,
          }),
        declaredCount
      );
      collected = fallback.collected;
      expectedTotal = fallback.expectedTotal;
    }

    if (requestId !== txRequestId || abortController.value?.signal.aborted) return;

    if (!silent || collected.length > 0 || blockTransactionCount.value === 0) {
      transactions.value = collected;
    }

    const resolvedCount = Number(block.value?.txcount ?? block.value?.transactioncount ?? 0);
    if ((!resolvedCount || resolvedCount <= 0) && collected.length > 0) {
      block.value.txcount = Math.max(collected.length, expectedTotal);
      block.value.transactioncount = block.value.txcount;
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Failed to load block transactions:", err);
  } finally {
    txLoading.value = false;
  }
}

async function loadReward(_hash) {
  try {
    const r = block.value.reward;
    if (r !== undefined && r !== null) {
      reward.value = r;
      return;
    }
    reward.value = 0;
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Failed to load block reward:", err);
  }
}

async function refreshCurrentBlockSilently() {
  if (isBackgroundRefreshing || loading.value) return;

  const hash = route.params.hash;
  if (!hash) return;

  isBackgroundRefreshing = true;

  try {
    await loadBlock(hash, { silent: true, forceRefresh: true });
  } finally {
    isBackgroundRefreshing = false;
  }
}

// Auto-refresh via composable (handles cleanup + visibility pause)
const { start: startAutoRefresh } = useAutoRefresh(() => {
  void refreshCurrentBlockSilently();
});

function handleNetworkChange() {
  startAutoRefresh();
  void refreshCurrentBlockSilently();
}

function navigateBlock(height) {
  if (height < 0) return;
  // We need to get the block hash by height, then navigate
  blockService
    .getByHeight(height)
    .then((b) => {
      if (b?.hash) {
        router.push(`/block-info/${b.hash}`).catch(() => {});
      }
    })
    .catch((err) => {
      if (import.meta.env.DEV) {
        console.warn("[BlockDetail] navigateBlock failed:", err);
      }
    });
}

onMounted(() => {
  startAutoRefresh();
  window.addEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
});

onBeforeUnmount(() => {
  window.removeEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
  abortController.value?.abort();
});

// --- Route watcher ---
watch(
  () => route.params.hash,
  (hash) => {
    if (hash) loadBlock(hash);
  },
  { immediate: true }
);
</script>
