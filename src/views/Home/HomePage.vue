<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section relative border-b border-white/10 bg-header-bg/95">
      <div class="hero-overlay"></div>
      <div class="page-container relative z-30 py-10 md:py-14">
        <div class="mx-auto max-w-3xl text-center">
          <h1 class="text-balance text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {{ $t("homePage.heroTitle") }}
          </h1>
          <p class="mt-2 text-sm text-white/70">{{ $t("homePage.heroSubtitle") }}</p>
          <div class="relative z-30 mt-6">
            <SearchBox mode="full" :loading="searchLoading" @search="handleSearch" />
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Cards (overlapping hero) -->
    <HomeStats
      :neo-price="neoPrice"
      :gas-price="gasPrice"
      :neo-price-change="neoPriceChange"
      :gas-price-change="gasPriceChange"
      :market-cap="marketCap"
      :price-unavailable="priceUnavailable"
      :tx-count="txCount"
      :block-count="blockCount"
      :latest-block-timestamp="latestBlocks[0]?.timestamp"
      :validated-state-root="validatedStateRoot"
      :tps="tps"
      @fetch-latest="handleFetchLatest"
    />

    <!-- Latest Blocks + Latest Transactions -->
    <section class="page-shell">
      <div class="page-container py-1">
        <div class="grid items-start gap-4 lg:grid-cols-2">
          <LatestBlocks
            :blocks="latestBlocks"
            :loading="blocksLoading"
            :error="blocksError"
            :validated-state-root="validatedStateRoot"
            @retry="loadLatestData"
          />
          <LatestTransactions
            :transactions="latestTxs"
            :transfer-summary-by-hash="transferSummaryByHash"
            :loading="txsLoading"
            :error="txsError"
            @retry="loadLatestData"
          />
        </div>
        <div class="mt-4">
          <BlockTimeChart
            :blocks="blockTimeBlocks"
            :loading="blockTimeLoading"
            test-id="home-block-time-chart"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
defineOptions({ name: "HomePage" });

import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import SearchBox from "@/components/common/SearchBox.vue";
import HomeStats from "./components/HomeStats.vue";
import LatestBlocks from "./components/LatestBlocks.vue";
import LatestTransactions from "./components/LatestTransactions.vue";
import BlockTimeChart from "@/components/common/BlockTimeChart.vue";
import { blockService } from "@/services/blockService";
import { rpcToBlock, toHomeBlockView } from "@/adapters/blocks";
import { transactionService } from "@/services/transactionService";
import { searchService } from "@/services/searchService";
import { indexerReadService } from "@/services/indexerReadService";
import { getLatestBlocks as getNetworkLatestBlocks } from "@/services/networkMonitorService";
import { statsService } from "@/services/statsService";
import { createExplorerQueryKey, fetchFreshQuery } from "@/query/freshness";
import { usePriceCache } from "@/composables/usePriceCache";
import { resolveSearchLocation } from "@/utils/searchRouting";
import { resolveSearchResultWithTimeout } from "@/utils/searchLookup";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { useRealtimeHead } from "@/composables/useRealtimeHead";
import { useRealtimeTransactions } from "@/composables/useRealtimeTransactions";
import { useTransferSummary } from "@/composables/useTransferSummary";
import { useCommittee } from "@/composables/useCommittee";
import { isAbortError } from "@/utils/abortError";
import { resolveNetworkName } from "@/utils/env";

const router = useRouter();
const { fetchPrices } = usePriceCache();
const { transferSummaryByHash, enrichTransactions, clearTransferSummaries } = useTransferSummary();
const { loadCommittee } = useCommittee();

// State
const blocksLoading = ref(true);
const txsLoading = ref(true);
const searchLoading = ref(false);
const blocksError = ref(false);
const txsError = ref(false);
const blockCount = ref(0);
const txCount = ref(0);
const latestBlocks = ref([]);
const latestTxs = ref([]);
const blockTimeBlocks = ref([]);
const blockTimeLoading = ref(true);
const validatedStateRoot = ref(null);
const neoPrice = ref(0);
const gasPrice = ref(0);
const neoPriceChange = ref(0);
const gasPriceChange = ref(0);
const marketCap = ref(0);
const priceUnavailable = ref(false);
const tps = ref(0);
let isRefreshing = false;
let lastFetchLatestTime = 0;
let loadGeneration = 0;
// Generation counter for fire-and-forget summary updates. The summary
// promise is intentionally NOT awaited inside loadLatestData (so blocks +
// transactions can render before the summary count lands), but that
// means a slow summary from refresh N can resolve after refresh N+1
// already finished. The counter lets each handler bail if a newer
// refresh has run since.
let summaryGeneration = 0;
const HOMEPAGE_REFRESH_INTERVAL_MS = 3_000;
const HOMEPAGE_AGGREGATE_WAIT_MS = 2_200;
const HOMEPAGE_VALIDATOR_IDENTITY_WAIT_MS = 1500;
const HOMEPAGE_BLOCK_LIMIT = 6;
const HOMEPAGE_TRANSACTION_LIMIT = 6;
const BLOCK_TIME_CHART_LIMIT = 70;
const blockDetailsByHash = new Map();

function createLoadContext() {
  const network = resolveNetworkName();
  const generation = ++loadGeneration;
  return { generation, network };
}

function isCurrentLoadContext(context) {
  return (
    context &&
    context.generation === loadGeneration &&
    resolveNetworkName() === context.network
  );
}

function clearNetworkScopedHomeState() {
  loadGeneration += 1;
  summaryGeneration += 1;
  blockDetailsByHash.clear();
  clearTransferSummaries?.();
  latestBlocks.value = [];
  latestTxs.value = [];
  blockTimeBlocks.value = [];
  blockTimeLoading.value = true;
  validatedStateRoot.value = null;
  blockCount.value = 0;
  txCount.value = 0;
  tps.value = 0;
  blocksError.value = false;
  txsError.value = false;
  blocksLoading.value = true;
  txsLoading.value = true;
}

function isFreshHomepageSummary(summary) {
  if (!summary || typeof summary !== "object") return false;

  const totalBlocks = Number(summary.total_block_count ?? summary.last_indexed_block ?? 0);
  const lagBlocks = Number(summary.lag_blocks ?? summary.lagBlocks ?? Number.POSITIVE_INFINITY);
  const freshnessSeconds = Number(
    summary.freshness_seconds ?? summary.freshnessSeconds ?? Number.POSITIVE_INFINITY,
  );

  return (
    Number.isFinite(totalBlocks) &&
    totalBlocks > 0 &&
    Number.isFinite(lagBlocks) &&
    lagBlocks <= 2 &&
    Number.isFinite(freshnessSeconds) &&
    freshnessSeconds <= 30
  );
}

function getLatestKnownHeight() {
  const latestIndex = Number(latestBlocks.value?.[0]?.index);
  const latestBlockHeight = Number.isFinite(latestIndex) && latestIndex >= 0 ? latestIndex : 0;
  const validatedRootHeight = Number(
    validatedStateRoot.value?.validatedrootindex ?? validatedStateRoot.value?.index ?? 0,
  );
  const latestValidatedRootHeight =
    validatedStateRoot.value?.validated && Number.isFinite(validatedRootHeight) && validatedRootHeight >= 0
      ? validatedRootHeight
      : 0;
  return Math.max(latestBlockHeight, latestValidatedRootHeight);
}

function resolveLiveBlockHeight(candidateHeight) {
  const candidate = Number(candidateHeight || 0);
  return Math.max(candidate, getLatestKnownHeight());
}

function latestHeightFromBlockCount(totalBlocks) {
  const count = Number(totalBlocks);
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.max(0, Math.floor(count) - 1);
}

function latestHeightFromSummary(summary) {
  const indexedHeight = Number(summary?.last_indexed_block ?? summary?.lastIndexedBlock);
  if (Number.isFinite(indexedHeight) && indexedHeight >= 0) return indexedHeight;
  return latestHeightFromBlockCount(summary?.total_block_count ?? summary?.totalBlockCount);
}

function applyValidatedStateRoot(root) {
  if (!root?.validated || !Number.isFinite(Number(root.validatedrootindex))) return;
  validatedStateRoot.value = root;
  blockCount.value = resolveLiveBlockHeight(blockCount.value);
}

async function loadValidatedStateRoot(forceRefresh = false, context = null) {
  const requestContext = context || { generation: loadGeneration, network: resolveNetworkName() };
  try {
    const root = await blockService.getValidatedStateRoot({ forceRefresh, network: requestContext.network });
    if (!isCurrentLoadContext(requestContext)) return;
    applyValidatedStateRoot(root);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Failed to load validated state root:", err);
  }
}

function normalizeBlockTimeHeight(block = {}) {
  const height = Number(block.height ?? block.index ?? block.block_index ?? block.blockindex);
  return Number.isFinite(height) && height > 0 ? height : 0;
}

function normalizeBlockTimeTimestamp(block = {}) {
  const raw = Number(block.timestamp ?? block.blocktime ?? block.time_ms ?? block.block_time_ms ?? block.time ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw > 1e12 ? raw : raw * 1000;
}

function normalizeBlockTimeTxCount(block = {}, fallback = {}) {
  const source = Array.isArray(block.tx)
    ? block.tx.length
    : block.tx ??
      block.txcount ??
      block.transactioncount ??
      block.tx_count ??
      block.transaction_count ??
      fallback.tx ??
      fallback.txcount ??
      fallback.transactioncount ??
      fallback.tx_count ??
      fallback.transaction_count ??
      0;
  const count = Number(source);
  return Number.isFinite(count) ? count : 0;
}

function normalizeBlockTimePrimary(block = {}, fallback = {}) {
  const primary = Number(block.primaryNode ?? block.primary_node ?? block.primary ?? fallback.primaryNode ?? fallback.primary_node ?? fallback.primary);
  return Number.isFinite(primary) && primary >= 0 ? primary : null;
}

function normalizeBlockTimeInterval(block = {}, fallback = {}) {
  const candidates = [
    block.interval,
    block.blockInterval,
    block.block_interval,
    fallback.interval,
    fallback.blockInterval,
    fallback.block_interval,
  ];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    const interval = Number(candidate);
    if (Number.isFinite(interval) && interval > 0) return interval;
  }

  return null;
}

function hasUsableBlockTimeInterval(row = {}) {
  return Number(row.interval) > 0;
}

function normalizeBlockTimeRow(block = {}, fallback = {}) {
  const height = normalizeBlockTimeHeight(block) || normalizeBlockTimeHeight(fallback);
  if (!height) return null;

  const timestampMs = normalizeBlockTimeTimestamp(block) || normalizeBlockTimeTimestamp(fallback);
  const interval = normalizeBlockTimeInterval(block, fallback);
  const primaryNode = normalizeBlockTimePrimary(block, fallback);
  const nextConsensus =
    block.nextConsensus ??
    block.next_consensus ??
    block.nextconsensus ??
    fallback.nextConsensus ??
    fallback.next_consensus ??
    fallback.nextconsensus ??
    "";

  return {
    ...fallback,
    ...block,
    height,
    timestampMs,
    time: timestampMs || block.time || fallback.time,
    interval,
    tx: normalizeBlockTimeTxCount(block, fallback),
    primaryNode,
    primary_node: primaryNode,
    primary: primaryNode ?? block.primary ?? fallback.primary,
    nextConsensus,
    next_consensus: nextConsensus,
    nextconsensus: nextConsensus,
  };
}

function mergeBlockTimeRows(...rowSets) {
  const byHeight = new Map();
  for (const rows of rowSets) {
    for (const row of Array.isArray(rows) ? rows : []) {
      const normalized = normalizeBlockTimeRow(row, byHeight.get(normalizeBlockTimeHeight(row)));
      if (normalized?.height) {
        byHeight.set(normalized.height, normalized);
      }
    }
  }

  const sortedRows = [...byHeight.values()].sort((a, b) => a.height - b.height);
  const sortedByHeight = new Map(sortedRows.map((row) => [row.height, row]));

  return sortedRows
    .map((row) => {
      if (hasUsableBlockTimeInterval(row)) return row;
      const previous = sortedByHeight.get(row.height - 1);
      if (previous?.timestampMs && row.timestampMs) {
        const interval = (row.timestampMs - previous.timestampMs) / 1000;
        if (Number.isFinite(interval) && interval > 0) return { ...row, interval };
      }
      return row;
    })
    .filter(hasUsableBlockTimeInterval)
    .slice(-BLOCK_TIME_CHART_LIMIT);
}

function normalizeHomeBlockTimeRows(blocks = [], fallbackRows = []) {
  const fallbackByHeight = new Map(
    (Array.isArray(fallbackRows) ? fallbackRows : [])
      .map((row) => [normalizeBlockTimeHeight(row), row])
      .filter(([height]) => height > 0),
  );
  const rows = (Array.isArray(blocks) ? blocks : [])
    .map((block) => normalizeBlockTimeRow(block, fallbackByHeight.get(normalizeBlockTimeHeight(block))))
    .filter(Boolean)
    .sort((a, b) => a.height - b.height);
  const byHeight = new Map(rows.map((row) => [row.height, row]));

  return rows.map((row) => {
    const previous = byHeight.get(row.height - 1);
    if (previous?.timestampMs && row.timestampMs) {
      const interval = (row.timestampMs - previous.timestampMs) / 1000;
      if (Number.isFinite(interval) && interval > 0) return { ...row, interval };
    }
    return row;
  });
}

function publishLatestBlockTimeFromHomeBlocks(blocks = []) {
  const homeRows = normalizeHomeBlockTimeRows(blocks, blockTimeBlocks.value);
  if (!homeRows.length) return;
  blockTimeBlocks.value = mergeBlockTimeRows(blockTimeBlocks.value, homeRows);
  blockTimeLoading.value = false;
}

async function loadBlockTimeChart(context = null) {
  const requestContext = context || { generation: loadGeneration, network: resolveNetworkName() };
  if (!blockTimeBlocks.value.length) {
    blockTimeLoading.value = true;
  }

  try {
    const rows = await getNetworkLatestBlocks(requestContext.network);
    if (!isCurrentLoadContext(requestContext)) return;
    const monitorRows = Array.isArray(rows) ? rows : [];
    const homeRows = normalizeHomeBlockTimeRows(latestBlocks.value, monitorRows);
    blockTimeBlocks.value = mergeBlockTimeRows(monitorRows, homeRows);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[HomePage] loadBlockTimeChart failed:", err);
  } finally {
    if (isCurrentLoadContext(requestContext)) {
      blockTimeLoading.value = false;
    }
  }
}

function softTimeout(promise, timeoutMs, fallbackValue = null) {
  let timer = null;
  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
    }),
  ]);
}

function waitForHomepageValidatorIdentity() {
  return softTimeout(
    Promise.resolve()
      .then(() => loadCommittee())
      .catch(() => null),
    HOMEPAGE_VALIDATOR_IDENTITY_WAIT_MS,
    null,
  );
}

function extractHeightFromBlocks(blocks = []) {
  const latestIndex = Number(blocks?.[0]?.index);
  if (!Number.isFinite(latestIndex) || latestIndex < 0) return 0;
  return latestIndex;
}

function handleFetchLatest() {
  const now = Date.now();
  // Throttle aggressively when overdue, to prevent spamming the node
  // only fetch once every 3 seconds while waiting for a late block
  if (now - lastFetchLatestTime > 3000) {
    lastFetchLatestTime = now;
    loadLatestData(true);
  }
}

function hasSameOrderedHashes(currentList = [], nextList = []) {
  if (currentList.length !== nextList.length) return false;

  for (let index = 0; index < currentList.length; index += 1) {
    if ((currentList[index]?.hash || "") !== (nextList[index]?.hash || "")) {
      return false;
    }
  }

  return true;
}

function hasSameOrderedTransactions(currentList = [], nextList = []) {
  if (!hasSameOrderedHashes(currentList, nextList)) return false;

  for (let index = 0; index < currentList.length; index += 1) {
    const current = currentList[index] || {};
    const next = nextList[index] || {};

    const currentVmState = String(current.vmstate || current.vm_state || "")
      .trim()
      .toUpperCase();
    const nextVmState = String(next.vmstate || next.vm_state || "")
      .trim()
      .toUpperCase();
    if (currentVmState !== nextVmState) return false;

    const currentStatus = String(current.status || "")
      .trim()
      .toLowerCase();
    const nextStatus = String(next.status || "")
      .trim()
      .toLowerCase();
    if (currentStatus !== nextStatus) return false;

    const currentTime = Number(current.blocktime ?? current.timestamp ?? current.time ?? 0);
    const nextTime = Number(next.blocktime ?? next.timestamp ?? next.time ?? 0);
    if (currentTime !== nextTime) return false;
  }

  return true;
}

function mergeUniqueTransactions(primary = [], secondary = [], limit = 6) {
  const rows = [];
  const seen = new Set();

  const append = (items = []) => {
    for (const tx of items) {
      const hash = String(tx?.hash || "").trim();
      if (!hash || seen.has(hash)) continue;
      seen.add(hash);
      rows.push(tx);
      if (rows.length >= limit) return;
    }
  };

  append(primary);
  if (rows.length < limit) append(secondary);
  return rows;
}

// Route block summaries through the shared blocks anti-corruption layer so
// the snake_case/camelCase/legacy coalescing lives in exactly one place. The
// canonical model is mapped back to the same legacy view this page produced
// before (hash/index/timestamp/txcount/primary/sysfee/netfee/tx/consensus
// aliases), so the rendered fields are unchanged.
function normalizeBlockSummary(block = {}) {
  return toHomeBlockView(rpcToBlock(block || {}));
}

function normalizeHomepageTransaction(tx = {}) {
  return {
    ...tx,
    hash: tx.hash || tx.txid || "",
    blocktime: tx.blocktime ?? tx.timestamp ?? tx.block_time_ms ?? tx.time_ms ?? 0,
    sender: tx.sender || tx.sender_address || "",
    sysfee: tx.sysfee ?? tx.sys_fee ?? 0,
    netfee: tx.netfee ?? tx.net_fee ?? 0,
    validUntilBlock: tx.validUntilBlock ?? tx.valid_until_block,
    contractHash: tx.contractHash || tx.contract_hash || "",
    vmstate: tx.vmstate || tx.vm_state || "",
    status: tx.status || (String(tx.vmstate || tx.vm_state || "").toUpperCase() === "HALT" ? "success" : ""),
  };
}

function computeBlockFeeTotals(block = {}) {
  const directSysFee = Number(block.sysfee ?? block.systemFee ?? block.sys_fee ?? block.totalSysFee);
  const directNetFee = Number(block.netfee ?? block.networkFee ?? block.net_fee ?? block.totalNetFee);
  const txList = Array.isArray(block.tx) ? block.tx : [];
  const txCount = Number(
    block.txcount ??
      block.transactioncount ??
      block.txCount ??
      block.transactionCount ??
      block.tx_count ??
      block.transaction_count ??
      txList.length,
  );

  const hasDirectSysFee = Number.isFinite(directSysFee);
  const hasDirectNetFee = Number.isFinite(directNetFee);
  const shouldUseTxFallback =
    txList.length > 0 &&
    txCount > 0 &&
    (!hasDirectSysFee || !hasDirectNetFee || (directSysFee === 0 && directNetFee === 0));

  if (!shouldUseTxFallback) {
    return {
      sysfee: hasDirectSysFee ? directSysFee : undefined,
      netfee: hasDirectNetFee ? directNetFee : undefined,
    };
  }

  return txList.reduce(
    (sum, tx) => ({
      sysfee: sum.sysfee + Number(tx?.sysfee ?? tx?.systemFee ?? tx?.sys_fee ?? 0),
      netfee: sum.netfee + Number(tx?.netfee ?? tx?.networkFee ?? tx?.net_fee ?? 0),
    }),
    { sysfee: 0, netfee: 0 },
  );
}

// Data loading
async function loadData() {
  blocksLoading.value = true;
  txsLoading.value = true;

  // Prices are external and lightweight; keep non-blocking.
  void loadPrices();

  try {
    // First paint should ride the Worker-warmed 15s hot cache. Realtime head
    // updates below reconcile freshness without making the critical path add
    // `_ts` cache-busters or fan out to cold fallback requests.
    await loadLatestData(false);
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load homepage data:", err);
  }
}

async function loadLatestData(forceRefresh = false) {
  if (isRefreshing) return;
  isRefreshing = true;
  const context = createLoadContext();
  try {
    blocksError.value = false;
    txsError.value = false;
    blocksLoading.value = true;
    txsLoading.value = true;

    const requestOptions = { forceRefresh, network: context.network };
    void loadValidatedStateRoot(forceRefresh, context);
    void loadBlockTimeChart(context);
    // First paint can use the hot Worker cache, but realtime/SSE refreshes
    // must bypass it. Otherwise the home cards can sit on a 15-30s old
    // aggregate payload while the chain is producing a block every ~3s.
    const aggregateRequestOptions = requestOptions;
    const mySummaryGen = ++summaryGeneration;
    const validatorIdentityPromise = waitForHomepageValidatorIdentity();
    // Fastest path: one read-api payload for all home-page critical data.
    // If the deployed read-api does not have this endpoint yet, every caller
    // below falls back to the older per-resource APIs.
    const homePayloadPromise = fetchFreshQuery({
      forceRefresh: aggregateRequestOptions.forceRefresh,
      queryKey: createExplorerQueryKey("home.aggregate", { limit: HOMEPAGE_TRANSACTION_LIMIT, network: context.network }),
      queryFn: ({ forceRefresh: queryForceRefresh }) =>
        indexerReadService.getExplorerHome(HOMEPAGE_TRANSACTION_LIMIT, {
          forceRefresh: queryForceRefresh,
          network: context.network,
        }),
      source: "home.aggregate",
      staleTime: HOMEPAGE_REFRESH_INTERVAL_MS,
    }).catch(() => null);
    const fastHomePayloadPromise = softTimeout(homePayloadPromise, HOMEPAGE_AGGREGATE_WAIT_MS, null);
    const fetchSummary = () =>
      fetchFreshQuery({
        forceRefresh: requestOptions.forceRefresh,
        queryKey: createExplorerQueryKey("network.summary", { network: context.network }),
        queryFn: ({ forceRefresh: queryForceRefresh }) =>
          indexerReadService.getSummary({ forceRefresh: queryForceRefresh, network: context.network }),
        source: "network.summary",
        staleTime: HOMEPAGE_REFRESH_INTERVAL_MS,
      });
    const summaryPromise = fastHomePayloadPromise
      .then((homePayload) => homePayload?.summary || fetchSummary().catch(() => null))
      .catch(() => fetchSummary().catch(() => null));

    // Single server — fetch directly from indexer, one fallback to RPC.
    const fetchLatestBlocks = async () => {
      try {
        const homePayload = await fastHomePayloadPromise;
        const homeRows = Array.isArray(homePayload?.latest_blocks)
          ? homePayload.latest_blocks.map(normalizeBlockSummary).slice(0, HOMEPAGE_BLOCK_LIMIT)
          : [];
        if (homeRows.length > 0) {
          return {
            result: homeRows,
            totalCount: Number(
              homePayload?.paging?.blocks_total ??
                homePayload?.summary?.total_block_count ??
                homeRows.length,
            ),
          };
        }

        const indexerRes = await indexerReadService.getBlocks(HOMEPAGE_BLOCK_LIMIT, 0, requestOptions);
        const rows = Array.isArray(indexerRes?.data) ? indexerRes.data.map(normalizeBlockSummary) : [];
        if (rows.length > 0) {
          return {
            result: rows,
            totalCount: Number(indexerRes?.paging?.total ?? rows.length),
          };
        }
      } catch {
        // single fallback to RPC
      }
      return blockService.getList(HOMEPAGE_BLOCK_LIMIT, 0, { ...requestOptions, enrichMissingFields: true });
    };

    // Single server — fetch directly from indexer, one fallback to RPC.
    const fetchLatestTransactions = async () => {
      try {
        const homePayload = await fastHomePayloadPromise;
        const homeRows = Array.isArray(homePayload?.latest_transactions)
          ? homePayload.latest_transactions.map(normalizeHomepageTransaction).slice(0, HOMEPAGE_TRANSACTION_LIMIT)
          : [];
        if (homeRows.length > 0) {
          return {
            result: homeRows,
            totalCount: Number(
              homePayload?.paging?.transactions_total ??
                homePayload?.summary?.total_tx_count ??
                homeRows.length,
            ),
          };
        }

        const indexerRes = await indexerReadService.getTransactions(HOMEPAGE_TRANSACTION_LIMIT, 0, requestOptions);
        const rows = Array.isArray(indexerRes?.data) ? indexerRes.data.map(normalizeHomepageTransaction) : [];
        if (rows.length > 0) {
          return {
            result: rows,
            totalCount: Number(indexerRes?.paging?.total ?? rows.length),
          };
        }
      } catch {
        // single fallback to RPC
      }
      try {
        const txListRes = await transactionService.getList(HOMEPAGE_TRANSACTION_LIMIT, 0, requestOptions);
        const rows = Array.isArray(txListRes?.result) ? txListRes.result : [];
        return {
          result: rows,
          totalCount: Number(txListRes?.totalCount ?? rows.length),
        };
      } catch {
        return { result: [], totalCount: 0 };
      }
    };

    const blocksPromise = fetchLatestBlocks()
      .then(async (blocksRes) => {
        if (!isCurrentLoadContext(context)) return;
        if (!blocksRes) return;
        const nextBlocks = (blocksRes?.result || []).map((rawBlock) => {
          const block = normalizeBlockSummary(rawBlock);
          const cachedDetails = blockDetailsByHash.get(block.hash);
          return cachedDetails ? { ...block, ...cachedDetails } : block;
        });
        await validatorIdentityPromise;
        if (!isCurrentLoadContext(context)) return;
        if (!hasSameOrderedHashes(latestBlocks.value, nextBlocks)) {
          latestBlocks.value = nextBlocks;
        }
        publishLatestBlockTimeFromHomeBlocks(nextBlocks);

        const latestHeight = extractHeightFromBlocks(nextBlocks);
        if (latestHeight > 0) {
          blockCount.value = resolveLiveBlockHeight(latestHeight);
        }

        updateTps();
        void hydrateLatestBlocks(nextBlocks, requestOptions, context);
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        if (!isCurrentLoadContext(context)) return;
        blocksError.value = true;
      })
      .finally(() => {
        if (!isCurrentLoadContext(context)) return;
        blocksLoading.value = false;
      });

    void summaryPromise.then((summary) => {
      if (!isCurrentLoadContext(context)) return;
      if (mySummaryGen !== summaryGeneration) return;
      if (!summary || !isFreshHomepageSummary(summary)) return;
      blockCount.value = resolveLiveBlockHeight(latestHeightFromSummary(summary));
      txCount.value = Number(summary.total_tx_count || 0);
    }).catch(() => {});

    const fastTxsPromise = (async () => {
      const previousRows = Array.isArray(latestTxs.value) ? latestTxs.value : [];
      const previousConfirmedRows = previousRows.filter((tx) => tx?.status !== "pending");
      let confirmedRows = [];
      try {
        const txsRes = await fetchLatestTransactions();
        if (!isCurrentLoadContext(context)) return;
        confirmedRows = Array.isArray(txsRes?.result) ? txsRes.result : [];
      } catch (err) {
        if (!isCurrentLoadContext(context)) return;
        if (previousRows.length) {
          if (!hasSameOrderedTransactions(latestTxs.value, previousRows)) {
            latestTxs.value = previousRows;
          }
          return;
        }
        throw err;
      }

      // Keep list continuity during transient sparse RPC responses.
      if (!isCurrentLoadContext(context)) return;
      const initialRows = mergeUniqueTransactions(confirmedRows, previousConfirmedRows, HOMEPAGE_TRANSACTION_LIMIT);
      if (!initialRows.length && previousRows.length) {
        if (!hasSameOrderedTransactions(latestTxs.value, previousRows)) {
          latestTxs.value = previousRows;
        }
        return;
      }

      if (!hasSameOrderedTransactions(latestTxs.value, initialRows)) {
        latestTxs.value = initialRows;
      }
      if (initialRows.length) {
        const nonPendingInitial = initialRows.filter((tx) => tx.status !== "pending");
        if (nonPendingInitial.length) {
          void enrichTransactions(nonPendingInitial, { maxItems: HOMEPAGE_TRANSACTION_LIMIT });
        }
      }

      // Live homepage snapshot removed — single server, indexer is the source of truth.
    })()
      .catch((err) => {
        if (isAbortError(err)) return;
        if (!isCurrentLoadContext(context)) return;
        if (import.meta.env.DEV) console.warn("txs load err:", err);
        txsError.value = true;
      })
      .finally(() => {
        if (!isCurrentLoadContext(context)) return;
        txsLoading.value = false;
      });

    await Promise.allSettled([blocksPromise, fastTxsPromise]);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Failed to load latest blocks/transactions:", err);
  } finally {
    if (isCurrentLoadContext(context)) {
      isRefreshing = false;
    } else if (resolveNetworkName() === context.network) {
      isRefreshing = false;
    }
  }
}

// On Mainnet most 3-second blocks are empty, so a rolling 20-block window
// (≈60s) almost always produces 0 TPS even when activity is normal. Compute
// from the 24h rolling tx count instead — it always returns a meaningful
// non-zero number while the chain has any traffic.
function updateTps() {
  if (latestBlocks.value.length < 2) {
    if (tps.value <= 0) tps.value = 0;
    return;
  }

  const newest = latestBlocks.value[0];
  const oldest = latestBlocks.value[latestBlocks.value.length - 1];

  let newestTime = newest.timestamp || 0;
  let oldestTime = oldest.timestamp || 0;
  if (newestTime > 1e10) newestTime /= 1000;
  if (oldestTime > 1e10) oldestTime /= 1000;

  const timeDiff = Math.max(1, newestTime - oldestTime);
  const totalTxs = latestBlocks.value.reduce((sum, b) => sum + (b.txcount || b.transactioncount || 0), 0);
  const live = totalTxs / timeDiff;
  // Only override the 24h-average baseline (loadAvgTps) when the recent
  // window actually has activity worth reporting.
  if (live > 0) tps.value = live;
}

async function loadAvgTps(context = null) {
  const requestContext = context || { generation: loadGeneration, network: resolveNetworkName() };
  try {
    const rows = await statsService.getDailyAnalytics(2, { network: requestContext.network });
    if (!isCurrentLoadContext(requestContext)) return;
    // Prefer the most recent fully-elapsed UTC day; fall back to today if
    // it's the only row that exists (very early in the day) or has data.
    const recent = rows.length ? rows[rows.length - 2] || rows[rows.length - 1] : null;
    const txs = Number(recent?.tx_count) || 0;
    if (txs > 0) tps.value = txs / 86400;
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Failed to load daily TPS baseline:", err);
  }
}

async function hydrateLatestBlocks(blocks = [], requestOptions = {}, context = null) {
  if (context && !isCurrentLoadContext(context)) return;
  const missing = blocks.filter((block) => {
    if (!block?.hash || blockDetailsByHash.has(block.hash)) return false;
    const missingConsensus = !block.nextconsensus && !block.nextConsensus && !block.speaker && !block.validator;
    const missingPrimary = block.primary === undefined;
    const txCount = Number(block.txcount ?? block.transactioncount ?? block.tx_count ?? block.transaction_count ?? 0);
    const hasTransactions = Number.isFinite(txCount) && txCount > 0;
    const missingFees =
      hasTransactions &&
      block.sysfee === undefined &&
      block.systemFee === undefined &&
      block.sys_fee === undefined &&
      block.totalSysFee === undefined;
    const missingNetFee =
      hasTransactions &&
      block.netfee === undefined &&
      block.networkFee === undefined &&
      block.net_fee === undefined &&
      block.totalNetFee === undefined;
    return missingConsensus || missingFees || missingNetFee || missingPrimary;
  });

  if (!missing.length) return;

  const hydratedEntries = await Promise.all(
    missing.map(async (block) => {
      try {
        const full = await blockService.getByHeight(block.index, requestOptions);
        if (!full) return null;

      let feeTotals = {
        sysfee: full.sysfee ?? full.systemFee ?? full.sys_fee ?? full.totalSysFee,
        netfee: full.netfee ?? full.networkFee ?? full.net_fee ?? full.totalNetFee,
      };

      const normalizedFeeTotals = {
        sysfee: Number(feeTotals.sysfee),
        netfee: Number(feeTotals.netfee),
      };

      const txCount = Number(block.txcount ?? block.transactioncount ?? 0);
      const shouldFetchTransactions =
        txCount > 0 &&
        (!Number.isFinite(normalizedFeeTotals.sysfee) ||
          !Number.isFinite(normalizedFeeTotals.netfee) ||
          (normalizedFeeTotals.sysfee === 0 && normalizedFeeTotals.netfee === 0));

      if (shouldFetchTransactions) {
        const txRes = await blockService.getTransactionsByHeight(block.index, txCount, 0, requestOptions);
        const txs = Array.isArray(txRes?.result) ? txRes.result : [];
        if (txs.length > 0) {
          full.tx = txs;
        }
      }

      return {
          hash: block.hash,
          details: {
            primary: full.primary,
            nextconsensus: full.nextconsensus ?? full.nextConsensus ?? full.speaker ?? full.validator,
            speaker: full.speaker ?? full.nextconsensus ?? full.nextConsensus ?? full.validator,
            validator: full.validator ?? full.speaker ?? full.nextconsensus ?? full.nextConsensus,
            ...computeBlockFeeTotals(full),
          },
        };
      } catch {
        return null;
      }
    }),
  );

  if (context && !isCurrentLoadContext(context)) return;

  const validEntries = hydratedEntries.filter((entry) => entry && entry.hash);
  if (!validEntries.length) return;

  for (const entry of validEntries) {
    blockDetailsByHash.set(entry.hash, entry.details);
  }

  latestBlocks.value = latestBlocks.value.map((block) => {
    const details = blockDetailsByHash.get(block.hash);
    return details ? { ...block, ...details } : block;
  });
  publishLatestBlockTimeFromHomeBlocks(latestBlocks.value);
  updateTps();
}

async function loadPrices() {
  try {
    const data = await fetchPrices();
    neoPrice.value = data.neo;
    gasPrice.value = data.gas;
    neoPriceChange.value = data.neoChange;
    gasPriceChange.value = data.gasChange;
    marketCap.value = data.marketCap;
    priceUnavailable.value = Boolean(data.pricingUnavailable);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[HomePage] loadPrices failed:", err);
  }
}

// Search
async function handleSearch(inputValue) {
  const query = (inputValue || "").trim();
  if (!query) return;

  searchLoading.value = true;
  try {
    const result = await resolveSearchResultWithTimeout((q) => searchService.search(q), query);
    const location = resolveSearchLocation(query, result);
    if (location) router.push(location).catch(() => {});
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Search failed, using fallback routing:", err);
    const fallback = resolveSearchLocation(query, null);
    if (fallback) router.push(fallback).catch(() => {});
  } finally {
    searchLoading.value = false;
  }
}

// Auto-refresh via composable (handles cleanup + visibility pause)
let avgTpsTickCounter = 0;
const { start: startAutoRefresh } = useRealtimeHead(() => {
  void loadLatestData(true);
  // Refresh the 24h-baseline TPS once a minute so a slow first-call timeout
  // (3s indexer budget vs occasional cold-cache latency) self-recovers without
  // a page reload, and the value tracks the day's running tx_count.
  avgTpsTickCounter += 1;
  if (avgTpsTickCounter % 20 === 0 || tps.value === 0) {
    void loadAvgTps({ generation: loadGeneration, network: resolveNetworkName() });
  }
}, { intervalMs: HOMEPAGE_REFRESH_INTERVAL_MS });

// Realtime transaction stream: prepend each confirmed block's transactions to
// the list so the home page updates live between head-driven refreshes. The
// full list is still reconciled by loadLatestData on each head, so this is a
// responsiveness enhancement, not the source of truth.
const { start: startRealtimeTransactions } = useRealtimeTransactions((payload) => {
  if (payload?.network && String(payload.network).toLowerCase() !== resolveNetworkName()) return;
  if (!payload || !Array.isArray(payload.transactions)) return;
  const newRows = payload.transactions.map(normalizeHomepageTransaction).filter(Boolean);
  if (!newRows.length) return;
  const previous = Array.isArray(latestTxs.value) ? latestTxs.value : [];
  // Prepend new txs, drop duplicates by txid, cap at the home page's 6 rows.
  const seen = new Set();
  const merged = [...newRows, ...previous]
    .filter((tx) => {
      const id = tx?.txid || tx?.hash;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 6);
  latestTxs.value = merged;
}, { immediate: true });

function handleNetworkChange() {
  clearNetworkScopedHomeState();
  isRefreshing = false;
  void loadCommittee(true);
  void loadLatestData(true);
  startAutoRefresh();
  startRealtimeTransactions();
}

// Lifecycle
onMounted(() => {
  void loadData();
  void loadAvgTps();
  startAutoRefresh();
});

useNetworkChange(handleNetworkChange);

// Clean up network change listener (auto-refresh cleanup is handled by composable)
onBeforeUnmount(() => {});
</script>

<style scoped>
.hero-section {
  background-image:
    radial-gradient(circle at 15% 20%, rgba(74, 180, 238, 0.26), transparent 36%),
    radial-gradient(circle at 78% 8%, rgba(0, 229, 153, 0.16), transparent 28%),
    linear-gradient(180deg, #0f1f3d 0%, #162a4b 100%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 26px 26px;
  opacity: 0.28;
}
</style>
