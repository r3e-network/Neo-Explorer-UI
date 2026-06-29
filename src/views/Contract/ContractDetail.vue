<template>
  <div class="contract-detail-page">
    <div class="page-container py-6">
      <!-- Breadcrumb -->
      <Breadcrumb
        :items="[
          { label: $t('breadcrumb.home'), to: '/homepage' },
          { label: $t('breadcrumb.contracts'), to: '/contracts/1' },
          { label: contract.name || $t('breadcrumb.contractDetail') },
        ]"
      />

      <!-- Contract Header — hidden on error so the placeholder
           "Unknown Contract / -" row doesn't sit alongside the
           not-found banner. -->
      <ContractHeader
        v-if="!error && hasContract"
        :contract="contract" :metadata="contractMetadata"
        :is-verified="isVerified"
        :supported-standards="supportedStandards"
        @copy-hash="copyHash"
      />

      <div v-else-if="!error" class="etherscan-card mb-6 p-6">
        <div class="animate-pulse space-y-4" role="status" aria-live="polite">
          <div class="h-8 w-56 rounded bg-surface-muted"></div>
          <div class="h-4 w-full max-w-xl rounded bg-surface-muted"></div>
          <span class="sr-only">{{ $t("contractDetail.loadingDetails") }}</span>
        </div>
      </div>

      <!-- Error State -->
      <ErrorState v-if="error" :title="$t('contractDetail.notFound')" :message="error" @retry="loadContract(route.params.hash)" />

      <!-- Overview Card -->
      <ContractOverviewCard
        v-if="!error && hasContract"
        :contract="contract"
        :metadata="contractMetadata"
        :manifest="manifest"
        :is-verified="isVerified"
        :supported-standards="supportedStandards"
        :methods-count="methodsCount"
        :events-count="eventsCount"
        class="mb-6"
      />

      <!-- Tabs Card -->
      <div v-if="!error && hasContract" class="etherscan-card overflow-hidden">
        <div class="p-3 pb-0">
          <TabsNav :tabs="tabs" v-model="activeTab" />
        </div>

        <div :id="'panel-' + activeTab" role="tabpanel" :aria-labelledby="'tab-' + activeTab" class="p-4 pt-5 md:p-5">
          <div v-if="!contract.hash" class="py-8 text-center text-mid">
            {{ $t("contractDetail.loadingDetails") }}
          </div>

          <!-- Transactions Tab -->
          <div v-else-if="activeTab === 'transactions'">
            <ScCallTable :key="`sc-${contract.hash}`" :contract-hash="contract.hash" />
          </div>

          <!-- Events Tab -->
          <div v-else-if="activeTab === 'events'">
            <EventsTable :key="`events-${contract.hash}`" :contract-hash="contract.hash" />
          </div>

          <!-- Code / Source Tab -->
          <ContractCodeTab
            v-else-if="activeTab === 'code'"
            :contract-hash="contract.hash"
            :update-counter="contract.updatecounter || 0"
            :source-code-location="sourceCodeLocation"
            :manifest="manifest"
            :supported-standards="supportedStandards"
            :contract-state="contract"
          />

          <!-- Read Contract Tab -->
          <ContractReadTab
            v-else-if="activeTab === 'readContract'"
            :read-methods="readMethods"
            :read-method-state="readMethodState"
            :auto-read-state="autoReadState"
            :manifest="manifest"
            @toggle-method="toggleReadMethod"
            @invoke-method="invokeReadMethod"
            @update-param="updateReadParam"
            @refresh-auto-read="refreshAutoReadMethod"
          />

          <!-- Write Contract Tab -->
          <ContractWriteTab
            v-else-if="activeTab === 'writeContract'"
            :write-methods="writeMethods"
            :write-method-state="writeMethodState"
            :manifest="manifest"
            :wallet-connected="walletConnected"
            :wallet-account="walletAccount"
            :wallet-provider="walletProvider"
            :wallet-connecting="walletConnecting"
            :wallet-error="walletError"
            :wc-uri="wcUri"
            :tx-statuses="txStatuses"
            :available-wallet-providers="writeAvailableProviders"
            :wallet-provider-availability-loaded="writeWalletAvailabilityLoaded"
            @connect-wallet="connectWallet"
            @disconnect-wallet="disconnectWallet"
            @clear-wc-uri="cancelPendingWriteWalletConnectApproval"
            @toggle-method="toggleWriteMethod"
            @invoke-method="invokeWriteMethod"
            @update-param="updateWriteParam"
            @estimate-gas="estimateGas"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent, watch, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { contractService } from "@/services/contractService";
import { isAbortError } from "@/utils/abortError";
import { supabaseService } from "@/services/supabaseService";
import { WALLET_STATE_EVENT } from "@/constants/walletEvents";
import { buildSourceCodeLocation, getContractDetailTabs } from "@/utils/detailRouting";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { useMethodInteraction } from "@/composables/useMethodInteraction";
import { useTransactionTracker } from "@/composables/useTransactionTracker";
import { invokeContractFunction } from "@/utils/contractInvocation";
import { createSimulationFaultError, isSimulationFault } from "@/utils/transactionSimulation";
import { normalizeHash160 } from "@/utils/walletNormalization";
import { connectedAccount } from "@/utils/walletState";
import { loadWalletService } from "@/utils/lazyServices";
import { resolveNetworkName } from "@/utils/env";
import { getProviderInstallUrl, getProviderUnavailableReasonKey } from "@/utils/walletProviderMeta";
import TabsNav from "@/components/common/TabsNav.vue";
import ScCallTable from "@/views/Contract/ScCallTable.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import ContractHeader from "@/views/Contract/components/ContractHeader.vue";
import ContractOverviewCard from "@/views/Contract/components/ContractOverviewCard.vue";

const EventsTable = defineAsyncComponent(() => import("@/views/Contract/EventsTable.vue"));
const ContractCodeTab = defineAsyncComponent(() => import("@/views/Contract/components/ContractCodeTab.vue"));
const ContractReadTab = defineAsyncComponent(() => import("@/views/Contract/components/ContractReadTab.vue"));
const ContractWriteTab = defineAsyncComponent(() => import("@/views/Contract/components/ContractWriteTab.vue"));

const route = useRoute();
const { t } = useI18n();
let fetchGeneration = 0;
const contract = ref({});
const contractMetadata = ref(null);
const manifest = ref(null);
const loading = ref(false);
const error = ref(null);
const activeTab = ref("transactions");
const tabs = computed(() =>
  getContractDetailTabs().map((tab) => ({ key: tab.key, label: t(tab.labelKey) })),
);
const isVerified = ref(false);
const hasContract = computed(() => Boolean(contract.value?.hash));
const contractNetwork = ref(resolveNetworkName());

// Wallet state
const walletConnected = ref(false);
const walletAccount = ref(null);
const walletProvider = ref(null);
const walletConnecting = ref(false);
const walletError = ref("");
const wcUri = ref("");
const writeAvailableProviders = ref([]);
const writeWalletAvailabilityLoaded = ref(false);
const { txStatuses, track: trackTx } = useTransactionTracker();
let walletServicePromise = null;
let writeWalletConnectionAttemptId = 0;
let pendingWriteWalletConnectService = null;

function getWalletService() {
  if (!walletServicePromise) {
    walletServicePromise = loadWalletService();
  }
  return walletServicePromise;
}

function beginWriteWalletConnectionAttempt() {
  writeWalletConnectionAttemptId += 1;
  wcUri.value = "";
  pendingWriteWalletConnectService?.cancelPendingConnection?.();
  pendingWriteWalletConnectService = null;
  return writeWalletConnectionAttemptId;
}

function cancelPendingWriteWalletConnectApproval() {
  writeWalletConnectionAttemptId += 1;
  wcUri.value = "";
  const walletService = pendingWriteWalletConnectService;
  pendingWriteWalletConnectService = null;
  walletService?.cancelPendingConnection?.();
}

function isCurrentWriteWalletConnectionAttempt(attemptId) {
  return attemptId === writeWalletConnectionAttemptId;
}

function syncWalletStateSnapshot(snapshot = {}) {
  const account = snapshot.account || null;
  const address = account?.address || connectedAccount.value || "";
  const connected = Boolean(snapshot.connected ?? address);

  walletConnected.value = connected;
  walletAccount.value = connected ? account || { address } : null;
  walletProvider.value = connected ? snapshot.provider || account?.label || walletProvider.value || "" : null;
}

function handleWalletStateEvent(event) {
  syncWalletStateSnapshot(event?.detail || {});
}

async function syncWalletStateFromService() {
  const walletService = await getWalletService();
  syncWalletStateSnapshot({
    connected: walletService.isConnected,
    account: walletService.account,
    provider: walletService.provider,
  });
}

async function refreshWriteWalletAvailability(walletServiceArg = null) {
  try {
    const walletService = walletServiceArg || await getWalletService();
    writeAvailableProviders.value = typeof walletService.getAvailableProviders === "function"
      ? walletService.getAvailableProviders()
      : [];
    writeWalletAvailabilityLoaded.value = true;
  } catch {
    writeAvailableProviders.value = [];
    writeWalletAvailabilityLoaded.value = false;
  }
}

function refreshVisibleWriteWalletAvailability() {
  if (activeTab.value !== "writeContract" || walletConnected.value) return;
  refreshWriteWalletAvailability().catch(() => {});
}

function handleWriteWalletVisibilityChange() {
  if (document.visibilityState === "visible") refreshVisibleWriteWalletAvailability();
}

syncWalletStateSnapshot();

if (typeof window !== "undefined") {
  onMounted(() => {
    window.addEventListener(WALLET_STATE_EVENT, handleWalletStateEvent);
    window.addEventListener("focus", refreshVisibleWriteWalletAvailability);
    window.addEventListener("NEOLine.NEO.EVENT.READY", refreshVisibleWriteWalletAvailability);
    window.addEventListener("NEOLine.N3.EVENT.READY", refreshVisibleWriteWalletAvailability);
    window.addEventListener("ethereum#initialized", refreshVisibleWriteWalletAvailability);
    document.addEventListener("visibilitychange", handleWriteWalletVisibilityChange);
  });
  onBeforeUnmount(() => {
    window.removeEventListener(WALLET_STATE_EVENT, handleWalletStateEvent);
    window.removeEventListener("focus", refreshVisibleWriteWalletAvailability);
    window.removeEventListener("NEOLine.NEO.EVENT.READY", refreshVisibleWriteWalletAvailability);
    window.removeEventListener("NEOLine.N3.EVENT.READY", refreshVisibleWriteWalletAvailability);
    window.removeEventListener("ethereum#initialized", refreshVisibleWriteWalletAvailability);
    document.removeEventListener("visibilitychange", handleWriteWalletVisibilityChange);
  });
}

watch(connectedAccount, () => {
  syncWalletStateSnapshot();
});

watch(activeTab, (tab) => {
  if (tab === "writeContract" && connectedAccount.value) {
    syncWalletStateFromService().catch(() => {});
  }
  if (tab === "writeContract") {
    refreshWriteWalletAvailability().catch(() => {});
  }
});

// Computed - source code link
const sourceCodeLocation = computed(() =>
  buildSourceCodeLocation(contract.value.hash, contract.value.updatecounter || 0)
);

// Computed - manifest-derived data
const supportedStandards = computed(() => {
  if (!manifest.value) return [];
  const raw = manifest.value.supportedstandards || manifest.value.supportedStandards || [];
  return Array.isArray(raw) ? raw : [];
});

const abiMethods = computed(() => {
  const abi = manifest.value?.abi;
  return abi && Array.isArray(abi.methods) ? abi.methods : [];
});

const abiEvents = computed(() => {
  const abi = manifest.value?.abi;
  return abi && Array.isArray(abi.events) ? abi.events : [];
});

const methodsCount = computed(() => abiMethods.value.length);
const eventsCount = computed(() => abiEvents.value.length);
const readMethods = computed(() => abiMethods.value.filter((m) => m.safe === true));
const writeMethods = computed(() => abiMethods.value.filter((m) => m.safe !== true));
const autoReadableMethods = computed(() =>
  readMethods.value.filter((method) => Array.isArray(method.parameters) ? method.parameters.length === 0 : true)
);
const autoReadableMethodKey = computed(() =>
  [
    contractNetwork.value,
    contract.value?.hash || "",
    ...autoReadableMethods.value.map((method) => method.name),
  ].join("|")
);
const autoReadState = ref({});
let autoReadGeneration = 0;

// Build the optional signers array used for read-only simulations.
// When a wallet is connected we pass the connected account so contract
// methods that gate on Runtime.CheckWitness still simulate accurately —
// matches what the explorer would send for a real transaction.
function readSimulationSigners(scope = 1) {
  const address = walletAccount.value?.address;
  if (!walletConnected.value || !address) return null;
  const account = normalizeHash160(address);
  if (!account || account === address) return null;
  return [{ account, scopes: scope || 1 }];
}

// Read contract interaction via composable
const {
  methodState: readMethodState,
  toggleMethod: toggleReadMethod,
  updateParam: updateReadParam,
  invokeMethod: invokeReadMethod,
} = useMethodInteraction(
  readMethods,
  (name, params) =>
    invokeContractFunction(contract.value.hash, name, params, readSimulationSigners(), { network: contractNetwork.value }),
  { errorFallback: t("contract.invocationFailed") },
);

function initializeAutoReadState(methods = autoReadableMethods.value) {
  const next = {};
  for (const method of methods) {
    next[method.name] = autoReadState.value[method.name] || {
      loading: false,
      result: undefined,
      error: "",
      refreshedAt: null,
    };
  }
  autoReadState.value = next;
}

async function refreshAutoReadMethod(methodName) {
  const method = autoReadableMethods.value.find((item) => item.name === methodName);
  const hash = contract.value?.hash;
  if (!method || !hash) return;

  if (!autoReadState.value[method.name]) initializeAutoReadState();
  const state = autoReadState.value[method.name];
  const generation = autoReadGeneration;
  state.loading = true;
  state.error = "";
  try {
    const result = await invokeContractFunction(hash, method.name, [], null, { network: contractNetwork.value });
    if (generation !== autoReadGeneration) return;
    state.result = result;
    state.refreshedAt = Date.now();
  } catch (err) {
    if (generation !== autoReadGeneration) return;
    state.error = err?.message || t("contract.invocationFailed");
  } finally {
    if (generation === autoReadGeneration) state.loading = false;
  }
}

async function refreshAutoReadableMethods() {
  const methods = autoReadableMethods.value;
  autoReadGeneration++;
  initializeAutoReadState(methods);
  await Promise.allSettled(methods.map((method) => refreshAutoReadMethod(method.name)));
}

watch(autoReadableMethodKey, () => {
  if (!contract.value?.hash || autoReadableMethods.value.length === 0) {
    autoReadGeneration++;
    autoReadState.value = {};
    return;
  }
  refreshAutoReadableMethods().catch(() => {});
});

// Write contract interaction via composable
const {
  methodState: writeMethodState,
  toggleMethod: toggleWriteMethod,
  updateParam: updateWriteParam,
  invokeMethod: _invokeWriteMethod,
  estimateGas: estimateWriteGas,
} = useMethodInteraction(
  writeMethods,
  async (name, params, { scope } = {}) => {
    const selectedScope = scope || 1;
    const simulation = await invokeContractFunction(
      contract.value.hash,
      name,
      params,
      readSimulationSigners(selectedScope),
      { network: contractNetwork.value },
    );
    if (isSimulationFault(simulation)) {
      throw createSimulationFaultError(simulation, { operation: name });
    }
    const walletService = await getWalletService();
    const args = params.map((p) => ({ type: p.type, value: p.value }));
    const result = await walletService.invoke({
      scriptHash: contract.value.hash,
      operation: name,
      args,
      scope: selectedScope,
    });
    if (result?.txid) trackTx(result.txid, { network: contractNetwork.value });
    return result;
  },
  { errorFallback: t("contract.txFailed") }
);

function invokeWriteMethod(idx, method, scope) {
  _invokeWriteMethod(idx, method, { scope });
}

function estimateGas(idx, method) {
  estimateWriteGas(idx, method, (name, params) =>
    invokeContractFunction(contract.value.hash, name, params, readSimulationSigners(), { network: contractNetwork.value }),
  );
}

// Data loading
async function loadContract(hash, network = null) {
  const myGeneration = ++fetchGeneration;
  const requestNetwork = resolveNetworkName(network);
  contractNetwork.value = requestNetwork;
  loading.value = true;
  error.value = null;
  manifest.value = null;
  contractMetadata.value = null;
  // Clear contract.value so the previous contract's header doesn't flash
  // while the new fetch resolves; also drop verification state so the prior
  // green badge doesn't linger across navigation.
  contract.value = {};
  isVerified.value = false;
  try {
    const fetched = await contractService.getByHashWithFallback(hash, { network: requestNetwork });
    if (myGeneration !== fetchGeneration || resolveNetworkName() !== requestNetwork) return;
    contract.value = fetched || {};
    if (!contract.value?.hash) {
      error.value = t("errors.loadContractDetails");
      return;
    }
    const [, manifestData] = await Promise.all([
      checkVerification(hash, requestNetwork),
      contractService.getManifest(hash, { network: requestNetwork }).catch(() => null),
    ]);
    if (myGeneration !== fetchGeneration || resolveNetworkName() !== requestNetwork) return;
    manifest.value = manifestData || contract.value?.manifest || null;
  } catch (err) {
    if (myGeneration !== fetchGeneration || resolveNetworkName() !== requestNetwork) return;
    if (isAbortError(err)) return;
    if (import.meta.env.DEV) console.error("Failed to load contract:", err);
    error.value = t("errors.loadContractDetails");
  } finally {
    if (myGeneration === fetchGeneration && resolveNetworkName() === requestNetwork) loading.value = false;
  }
}

async function checkVerification(hash, network = null) {
  const requestNetwork = resolveNetworkName(network);
  // Read is_verified from the indexer-cached contract metadata. The
  // legacy GetVerifiedContractByContractHash JSON-RPC queries an
  // unpopulated Mongo collection and always returns "find document(s)
  // error" post-cleanup (verified live on /contract-info).
  try {
    const metadata = await supabaseService.getContractMetadata(hash, requestNetwork);
    if (resolveNetworkName() !== requestNetwork) return;
    contractMetadata.value = metadata || null;
    isVerified.value = Boolean(metadata?.is_verified);
  } catch (err) {
    if (resolveNetworkName() !== requestNetwork) return;
    if (import.meta.env.DEV) console.warn("Contract verification check failed:", err);
    isVerified.value = false;
  }
}

function copyHash() {
  if (contract.value?.hash) navigator.clipboard.writeText(contract.value.hash).catch(() => {});
}

function handleNetworkChange() {
  const hash = route.params.hash;
  if (hash) loadContract(hash);
}

useNetworkChange(handleNetworkChange);

// Route watcher - load contract on hash change
watch(
  () => route.params.hash,
  (hash) => {
    if (hash) loadContract(hash);
  },
  { immediate: true }
);

// --- Wallet Methods ---
async function connectWallet(providerName) {
  const connectionAttemptId = beginWriteWalletConnectionAttempt();
  walletConnecting.value = true;
  walletError.value = "";
  try {
    const walletService = await getWalletService();
    await refreshWriteWalletAvailability(walletService);
    if (writeWalletAvailabilityLoaded.value && !writeAvailableProviders.value.includes(providerName)) {
      const installUrl = getProviderInstallUrl(providerName);
      if (installUrl && typeof window !== "undefined" && typeof window.open === "function") {
        window.open(installUrl, "_blank", "noopener,noreferrer");
        return;
      }
      walletError.value = t(getProviderUnavailableReasonKey(providerName));
      return;
    }

    const result = await walletService.connect(providerName);
    if (!isCurrentWriteWalletConnectionAttempt(connectionAttemptId)) return;
    if (result?.uri && result?.approval) {
      pendingWriteWalletConnectService = walletService;
      wcUri.value = result.uri;
      walletConnecting.value = false;
      try {
        const account = await result.approval;
        if (!isCurrentWriteWalletConnectionAttempt(connectionAttemptId) || !account?.address) return;
        pendingWriteWalletConnectService = null;
        wcUri.value = "";
        walletConnected.value = true;
        walletAccount.value = account;
        walletProvider.value = providerName;
      } catch (err) {
        if (!isCurrentWriteWalletConnectionAttempt(connectionAttemptId)) return;
        pendingWriteWalletConnectService = null;
        wcUri.value = "";
        walletError.value = err?.message || t("contract.walletConnectFailed");
      }
      return;
    }
    if (!isCurrentWriteWalletConnectionAttempt(connectionAttemptId)) return;
    walletConnected.value = true;
    walletAccount.value = result;
    walletProvider.value = providerName;
  } catch (err) {
    if (!isCurrentWriteWalletConnectionAttempt(connectionAttemptId)) return;
    wcUri.value = "";
    pendingWriteWalletConnectService = null;
    walletError.value = err?.message || t("contract.walletConnectFailed");
  } finally {
    if (isCurrentWriteWalletConnectionAttempt(connectionAttemptId)) walletConnecting.value = false;
  }
}

async function disconnectWallet() {
  cancelPendingWriteWalletConnectApproval();
  const walletService = await getWalletService();
  walletService.disconnect();
  walletConnected.value = false;
  walletAccount.value = null;
  walletProvider.value = null;
  walletError.value = "";
}
</script>
