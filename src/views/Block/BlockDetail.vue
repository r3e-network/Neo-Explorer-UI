<template>
  <div class="block-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <Breadcrumb
        :items="[
          { label: $t('breadcrumb.home'), to: '/homepage' },
          { label: $t('breadcrumb.blocks'), to: '/blocks/1' },
          {
            label:
              block.index != null
                ? $t('blockDetail.breadcrumbBlockN', { n: formatNumber(block.index) })
                : $t('blockDetail.breadcrumbBlock'),
          },
        ]"
      />

      <BlockHeader
        v-if="!error"
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

      <ErrorState v-else-if="error" :title="$t('blockDetail.notFound')" :message="error" @retry="loadBlock(route.params.hash)" />

      <div v-else class="space-y-6">
        <BlockOverview :block="block" :transactions="transactions" :reward="reward" v-model:show-witnesses="showWitnesses" />

        <!-- Tab Navigation -->
        <div class="etherscan-card overflow-hidden">
          <div class="p-3 pb-0">
            <TabsNav
              :tabs="tabs"
              v-model="activeTab"
              :aria-label="$t('blockDetail.sectionsAria')"
              id-base="block-detail"
            />
          </div>

          <div class="p-0">
            <!-- Transactions Tab -->
            <section
              v-if="activeTab === 'transactions'"
              id="block-detail-transactions-panel"
              role="tabpanel"
              aria-labelledby="block-detail-transactions-tab"
              tabindex="0"
              class="focus:outline-none"
            >
              <BlockTransactionsInline
                :transactions="transactions"
                :tx-loading="txLoading"
                :block-transaction-count="blockTransactionCount"
                :empty-transactions-message="emptyTransactionsMessage"
              />
            </section>

            <!-- Block Logs Tab -->
            <section
              v-else-if="activeTab === 'logs'"
              id="block-detail-logs-panel"
              role="tabpanel"
              aria-labelledby="block-detail-logs-tab"
              tabindex="0"
              class="focus:outline-none"
            >
              <BlockLogsInline
                :app-log="blockAppLog"
                :app-log-loading="blockAppLogLoading"
                :app-log-error="blockAppLogError"
                :enriched-trace="blockEnrichedTrace"
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { blockService, executionService } from "@/services";
import { formatNumber, formatAge } from "@/utils/explorerFormat";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import TabsNav from "@/components/common/TabsNav.vue";
import BlockHeader from "./components/BlockHeader.vue";
import BlockOverview from "./components/BlockOverview.vue";
import BlockTransactionsInline from "./components/BlockTransactionsInline.vue";
import BlockLogsInline from "./components/BlockLogsInline.vue";

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
const activeTab = ref("transactions");
const BLOCK_TX_FETCH_BATCH_SIZE = 100;
let isBackgroundRefreshing = false;
let blockRequestId = 0;
let txRequestId = 0;

// Block application log state
const blockAppLog = ref(null);
const blockAppLogLoading = ref(false);
const blockAppLogError = ref("");
const blockEnrichedTrace = ref(null);

// --- Computed ---
const blockTransactionCount = computed(() => {
  const declared = Number(block.value?.txcount ?? block.value?.transactioncount ?? 0);
  if (Number.isFinite(declared) && declared > 0) {
    return declared;
  }

  return transactions.value.length;
});

const blockLogNotificationCount = computed(() => {
  if (!blockAppLog.value?.executions) return 0;
  return blockAppLog.value.executions.reduce(
    (sum, exec) => sum + (exec.notifications?.length || 0),
    0,
  );
});

const emptyTransactionsMessage = computed(() =>
  blockTransactionCount.value > 0
    ? t("blocks.detail.txStillIndexing")
    : t("blocks.detail.noTransactions")
);

const timeAgo = computed(() => {
  if (!block.value?.timestamp) return "";
  return formatAge(block.value.timestamp);
});

const tabs = computed(() => [
  {
    key: "transactions",
    label: t("blocks.detail.tabTransactions"),
    count: blockTransactionCount.value || null,
  },
  {
    key: "logs",
    label: t("blocks.detail.tabLogs"),
    count: blockLogNotificationCount.value || null,
  },
]);

function computeTransactionFeeTotals(items = []) {
  return (Array.isArray(items) ? items : []).reduce(
    (sum, tx) => ({
      sysfee: sum.sysfee + Number(tx?.sysfee ?? tx?.systemFee ?? tx?.sys_fee ?? 0),
      netfee: sum.netfee + Number(tx?.netfee ?? tx?.networkFee ?? tx?.net_fee ?? 0),
    }),
    { sysfee: 0, netfee: 0 },
  );
}

// --- Methods ---
function mergeBlockData(raw, info) {
  const merged = { ...(raw || {}), ...(info || {}) };
  const mergedTxCount = Number(merged?.txcount ?? merged?.transactioncount ?? 0);

  if (Number.isFinite(mergedTxCount) && mergedTxCount > 0) {
    merged.txcount = mergedTxCount;
    merged.transactioncount = mergedTxCount;
  }

  // Preserve the official state root across silent refreshes — it's
  // fetched separately via getstateroot and isn't part of the raw/info
  // payloads, so it would otherwise be wiped on every auto-refresh tick
  // and re-flicker into "--" before the next async resolve completes.
  const sameBlock = Number(block.value?.index) === Number(merged.index);
  if (sameBlock && block.value?.stateroot && !merged.stateroot) {
    merged.stateroot = block.value.stateroot;
  }

  return merged;
}

async function resolveBlockParam(param) {
  if (!param) return null;
  if (/^\d+$/.test(String(param).trim())) {
    const height = Number(param);
    const block = await blockService.getByHeight(height);
    return block?.hash || null;
  }
  return param;
}

async function loadBlock(param, { silent = false, forceRefresh = false } = {}) {
  if (!param) return;

  const requestId = ++blockRequestId;

  if (!silent) {
    abortController.value?.abort();
    abortController.value = new AbortController();
    loading.value = true;
    error.value = null;
    // Clear block.value so the prior block's header doesn't flash next to
    // the new block's loading skeleton on rapid navigation.
    block.value = {};
    reward.value = null;
    transactions.value = [];
    showWitnesses.value = false;
    blockAppLog.value = null;
    blockAppLogError.value = "";
    blockEnrichedTrace.value = null;
  }

  try {
    const hash = await resolveBlockParam(param);
    if (requestId !== blockRequestId || abortController.value?.signal.aborted) return;

    if (!hash) {
      if (!silent) error.value = t("errors.blockNotFound");
      return;
    }

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

    // Fetch the official state root (non-blocking; not all nodes expose it).
    if (Number.isFinite(Number(block.value.index))) {
      blockService
        .getStateRoot(block.value.index, { forceRefresh })
        .then((stateroot) => {
          if (requestId !== blockRequestId || abortController.value?.signal.aborted) return;
          if (stateroot) block.value = { ...block.value, stateroot };
        })
        .catch((err) => {
          if (import.meta.env.DEV) console.warn("Block state root fetch failed:", err);
        });
    }

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

    // Load transactions, reward, and block logs in parallel (non-blocking)
    void loadTransactions({ silent, forceRefresh });
    loadReward(hash);
    void loadBlockAppLog(block.value.hash, requestId);
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

async function loadBlockAppLog(blockHash, requestId) {
  if (!blockHash) return;

  blockAppLogLoading.value = true;
  blockAppLogError.value = "";

  try {
    const enriched = await executionService.getEnrichedBlockTrace(blockHash);
    if (requestId !== blockRequestId) return;

    if (enriched) {
      blockAppLog.value = enriched.raw;
      blockEnrichedTrace.value = enriched;
    } else {
      // Try plain fetch without enrichment
      const appLog = await executionService.getBlockApplicationLog(blockHash);
      if (requestId !== blockRequestId) return;
      blockAppLog.value = appLog;
    }
  } catch (err) {
    if (requestId !== blockRequestId) return;
    if (import.meta.env.DEV) console.warn("Failed to load block application log:", err);

    // Fallback: try plain fetch
    try {
      const appLog = await executionService.getBlockApplicationLog(blockHash);
      if (requestId !== blockRequestId) return;
      blockAppLog.value = appLog;
    } catch {
      blockAppLogError.value = "Failed to load block application log.";
    }
  } finally {
    if (requestId === blockRequestId) {
      blockAppLogLoading.value = false;
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

    const directSysFee = Number(block.value?.sysfee ?? block.value?.systemFee ?? block.value?.totalSysFee);
    const directNetFee = Number(block.value?.netfee ?? block.value?.networkFee ?? block.value?.totalNetFee);
    const hasDirectSysFee = Number.isFinite(directSysFee);
    const hasDirectNetFee = Number.isFinite(directNetFee);
    const shouldBackfillFeeTotals =
      collected.length > 0 &&
      (!hasDirectSysFee || !hasDirectNetFee || (directSysFee === 0 && directNetFee === 0));

    if (shouldBackfillFeeTotals) {
      const totals = computeTransactionFeeTotals(collected);
      block.value.sysfee = totals.sysfee;
      block.value.netfee = totals.netfee;
    }

    const resolvedCount = Number(block.value?.txcount ?? block.value?.transactioncount ?? 0);
    if ((!resolvedCount || resolvedCount <= 0) && collected.length > 0) {
      block.value.txcount = Math.max(collected.length, expectedTotal);
      block.value.transactioncount = block.value.txcount;
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Failed to load block transactions:", err);
  } finally {
    if (requestId === txRequestId) txLoading.value = false;
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
});

useNetworkChange(handleNetworkChange);

onBeforeUnmount(() => {
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
