<template>
  <div class="contract-detail-page">
    <div class="page-container py-6">
      <!-- Breadcrumb -->
      <Breadcrumb
        :items="[
          { label: 'Home', to: '/homepage' },
          { label: 'Contracts', to: '/contracts/1' },
          { label: contract.name || 'Contract' },
        ]"
      />

      <!-- Contract Header -->
      <ContractHeader
        :contract="contract"
        :is-verified="isVerified"
        :supported-standards="supportedStandards"
        @copy-hash="copyHash"
      />

      <!-- Error State -->
      <ErrorState v-if="error" title="Contract not found" :message="error" @retry="loadContract(route.params.hash)" />

      <!-- Overview Card -->
      <ContractOverviewCard
        v-if="!error"
        :contract="contract"
        :is-verified="isVerified"
        :supported-standards="supportedStandards"
        :methods-count="methodsCount"
        :events-count="eventsCount"
        class="mb-6"
      />

      <!-- Tabs Card -->
      <div v-if="!error" class="etherscan-card overflow-hidden">
        <div class="p-3 pb-0">
          <TabsNav :tabs="tabs" v-model="activeTab" />
        </div>

        <div :id="'panel-' + activeTab" role="tabpanel" :aria-labelledby="'tab-' + activeTab" class="p-4 pt-5 md:p-5">
          <div v-if="!contract.hash" class="py-8 text-center text-text-secondary dark:text-gray-400">
            Loading contract details...
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
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { contractService } from "@/services";
import { walletService } from "@/services/walletService";
import { buildSourceCodeLocation, getContractDetailTabs } from "@/utils/detailRouting";
import { useMethodInteraction } from "@/composables/useMethodInteraction";
import { useTransactionTracker } from "@/composables/useTransactionTracker";
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
const manifest = ref(null);
const loading = ref(false);
const error = ref(null);
const activeTab = ref("transactions");
const tabs = getContractDetailTabs();
const isVerified = ref(false);

// Wallet state
const walletConnected = ref(false);
const walletAccount = ref(null);
const walletProvider = ref(null);
const walletConnecting = ref(false);
const walletError = ref("");
const wcUri = ref("");
const { txStatuses, track: trackTx } = useTransactionTracker();

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

// Read contract interaction via composable
const {
  methodState: readMethodState,
  toggleMethod: toggleReadMethod,
  updateParam: updateReadParam,
  invokeMethod: invokeReadMethod,
} = useMethodInteraction(readMethods, (name, params) => contractService.invokeRead(contract.value.hash, name, params), {
  errorFallback: t("contract.invocationFailed"),
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
  estimateWriteGas(idx, method, (name, params) => contractService.invokeRead(contract.value.hash, name, params));
}

// Data loading
async function loadContract(hash) {
  const myGeneration = ++fetchGeneration;
  loading.value = true;
  error.value = null;
  manifest.value = null;
  try {
    contract.value = (await contractService.getByHash(hash)) || {};
    if (myGeneration !== fetchGeneration) return;
    const [, manifestData] = await Promise.all([
      checkVerification(hash),
      contractService.getManifest(hash).catch(() => null),
    ]);
    if (myGeneration !== fetchGeneration) return;
    manifest.value = manifestData;
  } catch (err) {
    if (myGeneration !== fetchGeneration) return;
    if (import.meta.env.DEV) console.error("Failed to load contract:", err);
    error.value = t("errors.loadContractDetails");
  } finally {
    if (myGeneration === fetchGeneration) loading.value = false;
  }
}

async function checkVerification(hash) {
  try {
    const verified = await contractService.getVerifiedByHash(hash, contract.value.updatecounter || 0);
    isVerified.value = !!(verified && verified.hash);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Contract verification check failed:", err);
    isVerified.value = false;
  }
}

function copyHash() {
  if (contract.value?.hash) navigator.clipboard.writeText(contract.value.hash).catch(() => {});
}

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
