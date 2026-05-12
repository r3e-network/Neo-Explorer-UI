<template>
  <div class="tx-detail-page">
    <div class="page-container py-6">
      <!-- Breadcrumb -->
      <Breadcrumb :items="breadcrumbs" />

      <!-- Page Header — hide while we have a not-found error so the
           "Pending" placeholder badge doesn't sit alongside the
           error banner. -->
      <TxHeader v-if="!error" :is-success="isSuccess" :tx-status="txStatus" :failure-reason="failureReason" />

      <!-- Action Summary Banner -->
      <div
        v-if="!loading && tx.hash && actionSummary"
        class="mb-6 flex items-start gap-3 rounded-xl border border-blue-200/80 bg-blue-50/80 p-4 backdrop-blur-sm dark:border-blue-800/70 dark:bg-blue-900/20"
      >
        <svg aria-hidden="true" class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="text-sm text-blue-800 dark:text-blue-300">
          {{ actionSummary }}
        </p>
      </div>

      <!-- Complex Transaction Banner -->
      <div
        v-if="!loading && isComplexTx"
        class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 backdrop-blur-sm dark:border-amber-800/70 dark:bg-amber-900/20"
      >
        <div class="flex items-center gap-2">
          <svg aria-hidden="true" class="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="text-sm font-medium text-amber-800 dark:text-amber-300">
            {{ $t('txDetail.complexBanner') }}
          </span>
        </div>
        <button
          type="button"
          class="rounded-md text-sm font-medium text-amber-600 transition-colors hover:text-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
          :aria-label="$t('txDetail.traceAria')"
          @click="activeTab = 'trace'"
        >
          {{ $t('txDetail.viewExecutionTrace') }}
        </button>
      </div>

      <!-- State Change Summary (complex transactions only) -->
      <StateChangeSummary v-if="isComplexTx" :enriched-trace="enrichedTrace" :loading="enrichedLoading" class="mb-6" />

      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div class="etherscan-card p-6">
          <Skeleton width="30%" height="24px" class="mb-6" />
          <div class="space-y-4">
            <div v-for="i in 8" :key="'skel-' + i" class="flex gap-4">
              <Skeleton width="120px" height="18px" />
              <Skeleton width="60%" height="18px" />
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <ErrorState v-else-if="error" :title="$t('txDetail.notFound')" :message="error" @retry="loadTx(txHash)" />

      <!-- Tabbed Content -->
      <div v-else-if="tx.hash" class="etherscan-card overflow-hidden">
        <!-- Tab Navigation -->
        <div class="p-3 pb-0">
          <TabsNav
            :tabs="tabs"
            v-model="activeTab"
            :aria-label="$t('txDetail.sectionsAria')"
            id-base="tx-detail"
          />
        </div>

        <div class="p-4 pt-5 md:p-5">
          <!-- Overview -->
          <section
            v-if="activeTab === 'overview'"
            id="tx-detail-overview-panel"
            role="tabpanel"
            aria-labelledby="tx-detail-overview-tab"
            tabindex="0"
            class="focus:outline-none"
          >
            <TxOverviewTab
              :tx="tx"
              :tx-status="txStatus"
              :is-success="isSuccess"
              :vm-state="vmState"
              :failure-reason="failureReason"
              :confirmations="confirmations"
              :total-fee="totalFee"
              :is-complex-tx="isComplexTx"
              :enriched-trace="enrichedTrace"
              :enriched-loading="enrichedLoading"
              :total-gas="totalGas"
              :all-transfers="allTransfers"
              v-model:show-more="showMore"
            />
          </section>

          <!-- Script & Witnesses -->
          <section
            v-else-if="activeTab === 'script'"
            id="tx-detail-script-panel"
            role="tabpanel"
            aria-labelledby="tx-detail-script-tab"
            tabindex="0"
            class="focus:outline-none"
          >
            <TxScriptTab :tx="tx" />
          </section>

          <!-- Logs -->
          <section
            v-else-if="activeTab === 'logs'"
            id="tx-detail-logs-panel"
            role="tabpanel"
            aria-labelledby="tx-detail-logs-tab"
            tabindex="0"
            class="focus:outline-none"
          >
            <TxLogsTab
              :app-log="appLog"
              :app-log-loading="appLogLoading"
              :app-log-error="appLogError"
              v-model:show-raw-app-log="showRawAppLog"
              :enriched-trace="enrichedTrace"
            />
          </section>

          <!-- Token Transfers -->
          <section
            v-else-if="activeTab === 'transfers'"
            id="tx-detail-transfers-panel"
            role="tabpanel"
            aria-labelledby="tx-detail-transfers-tab"
            tabindex="0"
            class="focus:outline-none"
          >
            <TxTransfersTab
              :all-transfers="allTransfers"
              :transfers-loading="transfersLoading"
            />
          </section>

          <!-- Internal Ops -->
          <section
            v-else-if="activeTab === 'internal'"
            id="tx-detail-internal-panel"
            role="tabpanel"
            aria-labelledby="tx-detail-internal-tab"
            tabindex="0"
            class="focus:outline-none"
          >
            <InternalOperations
              :enriched-trace="enrichedTrace"
              :loading="enrichedLoading"
            />
          </section>

          <!-- Execution Trace -->
          <section
            v-else-if="activeTab === 'trace'"
            id="tx-detail-trace-panel"
            role="tabpanel"
            aria-labelledby="tx-detail-trace-tab"
            tabindex="0"
            class="focus:outline-none"
          >
            <TxExecutionTraceTab
              :app-log="appLog"
              :app-log-loading="appLogLoading"
              :call-tree="callTree"
              :enriched-trace="enrichedTrace"
              :is-complex-tx="isComplexTx"
              :tx-hash="txHash"
            />
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { transactionService, tokenService, executionService, blockService } from "@/services";
import { isAbortError } from "@/utils/abortError";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { GAS_DECIMALS, NATIVE_CONTRACTS } from "@/constants";
import { formatGas, truncateHash, formatTokenAmount } from "@/utils/explorerFormat";
import { extractVmStateFromAppLog, extractVmStateFromObject } from "@/utils/txVmState";
import { extractFailureReasonFromAppLog } from "@/utils/txFailureReason";
import TabsNav from "@/components/common/TabsNav.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import InternalOperations from "@/components/trace/InternalOperations.vue";
import StateChangeSummary from "@/components/trace/StateChangeSummary.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import TxHeader from "./components/TxHeader.vue";
import TxOverviewTab from "./components/TxOverviewTab.vue";
import TxScriptTab from "./components/TxScriptTab.vue";
import TxLogsTab from "./components/TxLogsTab.vue";
import TxTransfersTab from "./components/TxTransfersTab.vue";
import TxExecutionTraceTab from "./components/TxExecutionTraceTab.vue";
import { scriptHashToAddress } from "@/utils/neoHelpers";

const route = useRoute();
const { t } = useI18n();

// --- Reactive State ---
let fetchGeneration = 0;
const tx = ref({});
const loading = ref(false);
const error = ref(null);
const showMore = ref(false);
const activeTab = ref("overview");

// Application log
const appLog = ref(null);
const appLogLoading = ref(false);
const appLogError = ref("");
const showRawAppLog = ref(false);

// Token transfers
const nep17Transfers = ref([]);
const nep11Transfers = ref([]);
const transfersLoading = ref(false);

// Network height for confirmations
const currentBlockHeight = ref(0);

// Enriched trace
const enrichedTrace = ref(null);
const enrichedLoading = ref(false);

// --- Computed ---
const txHash = computed(() => route.params.txhash || "");

const breadcrumbs = computed(() => [
  { label: t("breadcrumb.home"), to: "/homepage" },
  { label: t("breadcrumb.transactions"), to: "/transactions/1" },
  { label: truncateHash(txHash.value, 10, 6) },
]);

const vmState = computed(() => {
  return extractVmStateFromAppLog(appLog.value) || extractVmStateFromObject(tx.value) || "";
});

const isSuccess = computed(() => {
  const state = vmState.value;
  if (!state) return null; // unknown yet
  return state === "HALT";
});

const txStatus = computed(() => {
  if (isSuccess.value === null) return "pending";
  return isSuccess.value ? "success" : "failed";
});

const failureReason = computed(() => {
  if (vmState.value !== "FAULT") return "";
  return extractFailureReasonFromAppLog(appLog.value);
});

const confirmations = computed(() => {
  const bIndex = tx.value.blockIndex ?? tx.value.blockindex;
  if (!currentBlockHeight.value || !bIndex) return 0;
  return Math.max(0, currentBlockHeight.value - bIndex);
});

const totalFee = computed(() => {
  const net = Number(tx.value.netfee || 0);
  const sys = Number(tx.value.sysfee || 0);
  return formatGas(net + sys);
});

const allTransfers = computed(() => {
  return [...nep17Transfers.value, ...nep11Transfers.value];
});

const notificationCount = computed(() => {
  if (!appLog.value?.executions) return 0;
  return appLog.value.executions.reduce((sum, exec) => sum + (exec.notifications?.length || 0), 0);
});

const isComplexTx = computed(() => executionService.isComplexTransaction(appLog.value));
const callTree = computed(() => executionService.buildCallTree(appLog.value));

const enrichedOpsCount = computed(() => {
  if (!enrichedTrace.value?.executions) return 0;
  const opsCount = enrichedTrace.value.executions.reduce((sum, e) => sum + (e.operations?.length ?? 0), 0);
  const rawCallsCount = enrichedTrace.value.executions.reduce((sum, e) => sum + (e.contractCalls?.length ?? 0), 0);
  return Math.max(opsCount, rawCallsCount);
});

const totalGas = computed(() => {
  if (!enrichedTrace.value?.executions) return "0";
  return enrichedTrace.value.executions.reduce((sum, e) => sum + Number(e.gasConsumed || 0), 0).toString();
});

const tabs = computed(() => [
  { key: "overview", label: t("txDetail.tabOverview") },
  { key: "script", label: t("txDetail.tabScript") },
  { key: "logs", label: t("txDetail.tabLogs"), count: notificationCount.value || null },
  {
    key: "transfers",
    label: t("txDetail.tabTransfers"),
    count: allTransfers.value.length || null,
  },
  {
    key: "internal",
    label: t("txDetail.tabInternal"),
    count: enrichedOpsCount.value || null,
  },
  { key: "trace", label: t("txDetail.tabTrace") },
]);

const actionSummary = computed(() => buildActionSummary());

// --- Methods ---
function formatTransferAmount(transfer) {
  const raw = transfer.value ?? transfer.amount ?? 0;
  // Resolution order:
  //   1. The transfer row's own decimals (set by the enrichment path)
  //   2. NATIVE_CONTRACTS lookup — NEO is 0, GAS is 8; the indexer's
  //      nep17_transfers view doesn't carry decimals so without this
  //      branch NEO transfers got divided by 10^8 and rendered as e.g.
  //      "0.00002213 NEO" for a true value of 2213 NEO.
  //   3. GAS_DECIMALS as last-resort fallback for unknown tokens.
  const hash = String(transfer.contract || transfer.contractHash || "").toLowerCase();
  let decimals = transfer.decimals;
  if (decimals === undefined || decimals === null) {
    if (NATIVE_CONTRACTS[hash]) {
      decimals = NATIVE_CONTRACTS[hash].decimals;
    } else {
      decimals = GAS_DECIMALS;
    }
  }
  decimals = Number(decimals);
  return formatTokenAmount(raw, decimals, Math.min(decimals, 8));
}

function hasOracleResponseAttribute(tx) {
  return Boolean(
    tx?.attributes &&
      tx.attributes.some((a) => a?.type === "OracleResponse" || a?.usage === "OracleResponse" || a?.type === 0x11)
  );
}

function buildActionSummary() {
  if (!tx.value.hash) return "";
  if (hasOracleResponseAttribute(tx.value)) {
    return t("txDetail.actionOracle");
  }
  const transfers = allTransfers.value;
  if (transfers.length === 1) {
    const transfer = transfers[0];
    const amount = formatTransferAmount(transfer);
    const token = transfer.tokenname || transfer.symbol || t("txDetail.actionTokenFallback");
    const from = transfer.from ? truncateHash(scriptHashToAddress(transfer.from), 6, 4) : t("txDetail.actionMint");
    const to = transfer.to ? truncateHash(scriptHashToAddress(transfer.to), 6, 4) : t("txDetail.actionBurn");
    return t("txDetail.actionTransfer", { amount, token, from, to });
  }
  if (transfers.length > 1) {
    return t("txDetail.actionMultiTransfer", { count: transfers.length });
  }
  if (notificationCount.value > 0) {
    return t("txDetail.actionContractCall", { count: notificationCount.value });
  }
  return "";
}

// --- Data Loading ---
function resetState() {
  // Clear tx.value too — otherwise navigating from one tx to another that
  // fails to load shows the previous tx's overview alongside the new error
  // banner.
  tx.value = {};
  appLog.value = null;
  appLogError.value = "";
  nep17Transfers.value = [];
  nep11Transfers.value = [];
  currentBlockHeight.value = 0;
  enrichedTrace.value = null;
  showMore.value = false;
  activeTab.value = "overview";
  error.value = null;
}

async function loadTx(hash) {
  if (!hash) return;
  const myGeneration = ++fetchGeneration;
  loading.value = true;
  resetState();
  try {
    const fetched = await transactionService.getByHash(hash);
    if (myGeneration !== fetchGeneration) return;
    // Reject obviously-empty payloads. The legacy RPC returns null for an
    // unknown hash and the indexer returns {} — both leave the page
    // rendering the "Pending" skeleton with no error indication. Surface
    // it as a not-found instead.
    if (!fetched || !(fetched.hash || fetched.txid || fetched.block_index || fetched.blockindex)) {
      error.value = t("errors.txNotFound");
      return;
    }
    tx.value = fetched;
    // Fire secondary loads in parallel
    loadTransfers(hash, myGeneration).catch((err) => {
      if (import.meta.env.DEV) console.warn("[TxDetail] loadTransfers failed:", err);
    });
    loadBlockHeight().catch((err) => {
      if (import.meta.env.DEV) console.warn("[TxDetail] loadBlockHeight failed:", err);
    });
    loadEnrichedTrace(hash, myGeneration).catch((err) => {
      if (import.meta.env.DEV) console.warn("[TxDetail] loadEnrichedTrace failed:", err);
    });
  } catch (err) {
    if (myGeneration !== fetchGeneration) return;
    if (import.meta.env.DEV) console.error("Failed to load transaction:", err);
    error.value = t("errors.loadTxDetails");
  } finally {
    if (myGeneration === fetchGeneration) loading.value = false;
  }
}

async function loadEnrichedTrace(hash, gen) {
  enrichedLoading.value = true;
  appLogLoading.value = true;
  appLogError.value = "";
  try {
    enrichedTrace.value = await executionService.getEnrichedTrace(hash);
    if (gen !== fetchGeneration) return;
    appLog.value = enrichedTrace.value?.raw ?? null;
  } catch (err) {
    if (gen !== fetchGeneration) return;
    // Aborted fetches (route change / re-init) aren't user failures
    if (isAbortError(err)) return;
    enrichedTrace.value = null;
    if (import.meta.env.DEV) console.warn("Failed to load enriched trace:", err);
    try {
      const fallback = await executionService.getExecutionTrace(hash);
      if (gen !== fetchGeneration) return;
      appLog.value = fallback;
    } catch (fallbackErr) {
      // Drop the error if a newer load has superseded this one — otherwise
      // the user sees the stale "failed to load" banner on the new tx.
      if (gen !== fetchGeneration) return;
      if (isAbortError(fallbackErr)) return;
      appLogError.value = t("errors.loadAppLog");
    }
  } finally {
    if (gen === fetchGeneration) {
      enrichedLoading.value = false;
      appLogLoading.value = false;
    }
  }
}

async function loadTransfers(hash, gen) {
  transfersLoading.value = true;
  try {
    const [nep17Res, nep11Res] = await Promise.all([
      tokenService.getTransfersByTxHash(hash, 500).catch(() => ({ result: [] })),
      tokenService.getNep11TransfersByTxHash(hash, 500).catch(() => ({ result: [] })),
    ]);
    if (gen !== fetchGeneration) return;

    const rawNep17 = (nep17Res?.result || []).map((t) => ({ ...t, _standard: "NEP-17" }));

    // Enrich transfers with per-contract decimals. The indexer's
    // nep17_transfers view doesn't carry a decimals column, so without
    // this enrichment any non-native NEP-17 amount renders against the
    // 8-decimal fallback (correct for GAS, wrong for everything else
    // including NEO and most custom NEP-17s). For each unique non-native
    // contract referenced in this tx, fetch its decimals via
    // tokenService.getByHashWithFallback (which itself probes the
    // contract's decimals() method via RPC when the indexer's value
    // looks suspect).
    const contractsNeedingDecimals = new Set();
    for (const t of rawNep17) {
      if (t.decimals !== undefined && t.decimals !== null) continue;
      const ch = String(t.contract || t.contractHash || "").toLowerCase();
      if (!ch || NATIVE_CONTRACTS[ch]) continue;
      contractsNeedingDecimals.add(ch);
    }
    const decimalsByContract = new Map();
    if (contractsNeedingDecimals.size) {
      await Promise.all(
        [...contractsNeedingDecimals].map(async (ch) => {
          try {
            const meta = await tokenService.getByHashWithFallback(ch);
            if (meta && typeof meta.decimals !== "undefined" && meta.decimals !== null) {
              decimalsByContract.set(ch, Number(meta.decimals));
            }
          } catch (_e) {
            /* leave decimals null; formatTransferAmount has a fallback */
          }
        }),
      );
      if (gen !== fetchGeneration) return;
    }

    nep17Transfers.value = rawNep17.map((t) => {
      if (t.decimals !== undefined && t.decimals !== null) return t;
      const ch = String(t.contract || t.contractHash || "").toLowerCase();
      if (NATIVE_CONTRACTS[ch]) {
        return { ...t, decimals: NATIVE_CONTRACTS[ch].decimals };
      }
      if (decimalsByContract.has(ch)) {
        return { ...t, decimals: decimalsByContract.get(ch) };
      }
      return t;
    });
    nep11Transfers.value = (nep11Res?.result || []).map((t) => ({
      ...t,
      _standard: "NEP-11",
    }));
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Failed to load token transfers:", err);
  } finally {
    if (gen === fetchGeneration) transfersLoading.value = false;
  }
}

async function loadBlockHeight() {
  try {
    const count = await blockService.getCount();
    currentBlockHeight.value = count || 0;
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Failed to load block height:", err);
  }
}

let pollInterval = null;

function clearPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function handleNetworkChange() {
  if (route.params.txhash) {
    clearPolling();
    loadTx(route.params.txhash);
  }
}

useNetworkChange(handleNetworkChange);

watch(
  () => route.params.txhash,
  (hash) => {
    if (hash) {
      clearPolling();
      loadTx(hash);
    }
  },
  { immediate: true }
);

// Don't fire on the initial mount: txStatus starts as the resolved
// status of the page-load tx (often "confirmed"), so `immediate: true`
// would either no-op or — for a confirmed tx — try to clearPolling
// before any interval was scheduled. Watching after mount is enough.
watch(txStatus, (newStatus) => {
  if (newStatus === 'pending') {
    if (!pollInterval) {
      const intervalMs = 3000;
      pollInterval = setInterval(() => {
        if (route.params.txhash) {
          loadTx(route.params.txhash);
        }
      }, intervalMs);
    }
  } else {
    clearPolling();
  }
});

onUnmounted(() => {
  clearPolling();
});
</script>
