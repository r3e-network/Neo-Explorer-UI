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
          />

          <!-- Read Contract Tab -->
          <ContractReadTab
            v-else-if="activeTab === 'readContract'"
            :read-methods="readMethods"
            :read-method-state="readMethodState"
            :manifest="manifest"
            @toggle-method="toggleReadMethod"
            @invoke-method="invokeReadMethod"
            @update-param="updateReadParam"
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
            @connect-wallet="connectWallet"
            @disconnect-wallet="disconnectWallet"
            @clear-wc-uri="wcUri = ''"
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { contractService } from "@/services";
import { isAbortError } from "@/utils/abortError";
import { supabaseService } from "@/services/supabaseService";
import { walletService, WALLET_STATE_EVENT } from "@/services/walletService";
import { buildSourceCodeLocation, getContractDetailTabs } from "@/utils/detailRouting";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { useMethodInteraction } from "@/composables/useMethodInteraction";
import { useTransactionTracker } from "@/composables/useTransactionTracker";
import { invokeContractFunction } from "@/utils/contractInvocation";
import { normalizeHash160 } from "@/utils/walletNormalization";
import TabsNav from "@/components/common/TabsNav.vue";
import ScCallTable from "@/views/Contract/ScCallTable.vue";
import EventsTable from "@/views/Contract/EventsTable.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import ContractHeader from "@/views/Contract/components/ContractHeader.vue";
import ContractOverviewCard from "@/views/Contract/components/ContractOverviewCard.vue";
import ContractCodeTab from "@/views/Contract/components/ContractCodeTab.vue";
import ContractReadTab from "@/views/Contract/components/ContractReadTab.vue";
import ContractWriteTab from "@/views/Contract/components/ContractWriteTab.vue";

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

// Wallet state
const walletConnected = ref(false);
const walletAccount = ref(null);
const walletProvider = ref(null);
const walletConnecting = ref(false);
const walletError = ref("");
const wcUri = ref("");
const { txStatuses, track: trackTx } = useTransactionTracker();

// Restore wallet state if already connected
function syncWalletStateFromService() {
  walletConnected.value = walletService.isConnected;
  walletAccount.value = walletService.isConnected ? walletService.account : null;
  walletProvider.value = walletService.isConnected ? walletService.provider : null;
}

syncWalletStateFromService();

if (typeof window !== "undefined") {
  onMounted(() => {
    window.addEventListener(WALLET_STATE_EVENT, syncWalletStateFromService);
  });
  onBeforeUnmount(() => {
    window.removeEventListener(WALLET_STATE_EVENT, syncWalletStateFromService);
  });
}

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

// Build the optional signers array used for read-only simulations.
// When a wallet is connected we pass the connected account so contract
// methods that gate on Runtime.CheckWitness still simulate accurately —
// matches what the explorer would send for a real transaction.
function readSimulationSigners() {
  const address = walletAccount.value?.address;
  if (!walletConnected.value || !address) return null;
  const account = normalizeHash160(address);
  if (!account || account === address) return null;
  return [{ account, scopes: 1 }];
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
    invokeContractFunction(contract.value.hash, name, params, readSimulationSigners()),
  { errorFallback: t("contract.invocationFailed") },
);

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
    const args = params.map((p) => ({ type: p.type, value: p.value }));
    const result = await walletService.invoke({
      scriptHash: contract.value.hash,
      operation: name,
      args,
      scope: scope || 1,
    });
    if (result?.txid) trackTx(result.txid);
    return result;
  },
  { errorFallback: t("contract.txFailed") }
);

function invokeWriteMethod(idx, method, scope) {
  _invokeWriteMethod(idx, method, { scope });
}

function estimateGas(idx, method) {
  estimateWriteGas(idx, method, (name, params) =>
    invokeContractFunction(contract.value.hash, name, params, readSimulationSigners()),
  );
}

// Data loading
async function loadContract(hash) {
  const myGeneration = ++fetchGeneration;
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
    const fetched = await contractService.getByHashWithFallback(hash);
    if (myGeneration !== fetchGeneration) return;
    contract.value = fetched || {};
    if (!contract.value?.hash) {
      error.value = t("errors.loadContractDetails");
      return;
    }
    const [, manifestData] = await Promise.all([
      checkVerification(hash),
      contractService.getManifest(hash).catch(() => null),
    ]);
    if (myGeneration !== fetchGeneration) return;
    manifest.value = manifestData || contract.value?.manifest || null;
  } catch (err) {
    if (myGeneration !== fetchGeneration) return;
    if (isAbortError(err)) return;
    if (import.meta.env.DEV) console.error("Failed to load contract:", err);
    error.value = t("errors.loadContractDetails");
  } finally {
    if (myGeneration === fetchGeneration) loading.value = false;
  }
}

async function checkVerification(hash) {
  // Read is_verified from the indexer-cached contract metadata. The
  // legacy GetVerifiedContractByContractHash JSON-RPC queries an
  // unpopulated Mongo collection and always returns "find document(s)
  // error" post-cleanup (verified live on /contract-info).
  try {
    const metadata = await supabaseService.getContractMetadata(hash);
    contractMetadata.value = metadata || null;
    isVerified.value = Boolean(metadata?.is_verified);
  } catch (err) {
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
  walletConnecting.value = true;
  walletError.value = "";
  try {
    const result = await walletService.connect(providerName);
    if (result?.uri && result?.approval) {
      wcUri.value = result.uri;
      walletConnecting.value = false;
      const account = await result.approval;
      wcUri.value = "";
      walletConnected.value = true;
      walletAccount.value = account;
      walletProvider.value = providerName;
      return;
    }
    walletConnected.value = true;
    walletAccount.value = result;
    walletProvider.value = providerName;
  } catch (err) {
    wcUri.value = "";
    walletError.value = err?.message || t("contract.walletConnectFailed");
  } finally {
    walletConnecting.value = false;
  }
}

function disconnectWallet() {
  walletService.disconnect();
  walletConnected.value = false;
  walletAccount.value = null;
  walletProvider.value = null;
  walletError.value = "";
}
</script>
