<template>
  <div class="tx-detail-page">
    <div class="page-container py-6">
      <!-- Breadcrumb -->
      <Breadcrumb :items="breadcrumbs" />

      <!-- Page Header -->
      <TxHeader :is-success="isSuccess" :tx-status="txStatus" />

      <!-- Action Summary Banner -->
      <div
        v-if="!loading && tx.hash && actionSummary"
        class="mb-6 flex items-start gap-3 rounded-xl border border-blue-200/80 bg-blue-50/80 p-4 backdrop-blur-sm dark:border-blue-800/70 dark:bg-blue-900/20"
      >
        <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg class="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="text-sm font-medium text-amber-800 dark:text-amber-300">
            Complex transaction involving multiple contracts.
          </span>
        </div>
        <button
          type="button"
          class="rounded-md text-sm font-medium text-amber-600 transition-colors hover:text-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
          aria-label="Switch to execution trace tab"
          @click="activeTab = 'trace'"
        >
          View Execution Trace &rarr;
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
      <ErrorState v-else-if="error" title="Transaction not found" :message="error" @retry="loadTx(txHash)" />

      <!-- Tabbed Content -->
      <div v-else-if="tx.hash" class="etherscan-card overflow-hidden">
        <!-- Tab Navigation -->
        <div class="p-3 pb-0">
          <TabsNav
            :tabs="tabs"
            v-model="activeTab"
            aria-label="Transaction detail sections"
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
              :confirmations="confirmations"
              :total-fee="totalFee"
              :is-complex-tx="isComplexTx"
              :enriched-trace="enrichedTrace"
              :enriched-loading="enrichedLoading"
              :total-gas="totalGas"
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
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { transactionService, tokenService, executionService, blockService } from "@/services";
import { GAS_DECIMALS } from "@/constants";
import { formatGas, truncateHash } from "@/utils/explorerFormat";
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
  { label: "Home", to: "/homepage" },
  { label: "Transactions", to: "/transactions/1" },
  { label: truncateHash(txHash.value, 10, 6) },
]);

const isSuccess = computed(() => {
  const state = tx.value?.vmstate;
  if (!state) return null; // unknown yet
  return state === "HALT";
});

const txStatus = computed(() => {
  if (isSuccess.value === null) return "pending";
  return isSuccess.value ? "success" : "failed";
});

const confirmations = computed(() => {
  if (!currentBlockHeight.value || !tx.value.blockIndex) return 0;
  return Math.max(0, currentBlockHeight.value - tx.value.blockIndex);
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
  return enrichedTrace.value.executions.reduce((sum, e) => sum + (e.operations?.length ?? 0), 0);
});

const totalGas = computed(() => {
  if (!enrichedTrace.value?.executions) return "0";
  return enrichedTrace.value.executions.reduce((sum, e) => sum + Number(e.gasConsumed || 0), 0).toString();
});

const tabs = computed(() => [
  { key: "overview", label: "Overview" },
  { key: "script", label: "Script & Witnesses" },
  { key: "logs", label: "Logs", count: notificationCount.value || null },
  {
    key: "transfers",
    label: "Token Transfers",
    count: allTransfers.value.length || null,
  },
  {
    key: "internal",
    label: "Internal Ops",
    count: enrichedOpsCount.value || null,
  },
  { key: "trace", label: "Execution Trace" },
]);

const actionSummary = computed(() => buildActionSummary());

// --- Methods ---
function formatTransferAmount(t) {
  const raw = Number(t.value || t.amount || 0);
  const decimals = Number(t.decimals ?? GAS_DECIMALS);
  if (decimals === 0) return String(raw);
  return (raw / Math.pow(10, decimals)).toFixed(Math.min(decimals, 8));
}

function buildActionSummary() {
  if (!tx.value.hash) return "";
  const transfers = allTransfers.value;
  if (transfers.length === 1) {
    const t = transfers[0];
    const amount = formatTransferAmount(t);
    const token = t.tokenname || t.symbol || "Token";
    const from = t.from ? truncateHash(t.from, 6, 4) : "Mint";
    const to = t.to ? truncateHash(t.to, 6, 4) : "Burn";
    return `Transfer ${amount} ${token} from ${from} to ${to}`;
  }
  if (transfers.length > 1) {
    return `${transfers.length} token transfers in this transaction`;
  }
  if (notificationCount.value > 0) {
    return "Contract Call with " + notificationCount.value + " notification(s)";
  }
  return "";
}

// --- Data Loading ---
function resetState() {
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
    tx.value = (await transactionService.getByHash(hash)) || {};
    if (myGeneration !== fetchGeneration) return;
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
    enrichedTrace.value = null;
    if (import.meta.env.DEV) console.warn("Failed to load enriched trace:", err);
    try {
      const fallback = await executionService.getExecutionTrace(hash);
      if (gen !== fetchGeneration) return;
      appLog.value = fallback;
    } catch {
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
      tokenService.getTransfersByTxHash(hash).catch(() => ({ result: [] })),
      tokenService.getNep11TransfersByTxHash(hash).catch(() => ({ result: [] })),
    ]);
    if (gen !== fetchGeneration) return;
    nep17Transfers.value = (nep17Res?.result || []).map((t) => ({
      ...t,
      _standard: "NEP-17",
    }));
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

watch(
  () => route.params.txhash,
  (hash) => {
    if (hash) loadTx(hash);
  },
  { immediate: true }
);
</script>
