<template>
  <div class="contract-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
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
      <div v-if="!error" class="etherscan-card">
        <div class="border-b border-card-border dark:border-card-border-dark">
          <TabsNav :tabs="tabs" v-model="activeTab" />
        </div>

        <div :id="'panel-' + activeTab" role="tabpanel" :aria-labelledby="'tab-' + activeTab" class="p-4 md:p-5">
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
            @connect-wallet="connectWallet"
            @disconnect-wallet="disconnectWallet"
            @toggle-method="toggleWriteMethod"
            @invoke-method="invokeWriteMethod"
            @update-param="updateWriteParam"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { contractService } from "@/services";
import { walletService } from "@/services/walletService";
import { buildSourceCodeLocation, getContractDetailTabs } from "@/utils/detailRouting";
import { useMethodInteraction } from "@/composables/useMethodInteraction";
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
const abortController = ref(null);
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
  invokeMethod: invokeWriteMethod,
} = useMethodInteraction(
  writeMethods,
  async (name, params) => {
    const args = params.map((p) => ({ type: p.type, value: p.value }));
    return walletService.invoke({
      scriptHash: contract.value.hash,
      operation: name,
      args,
    });
  },
  { errorFallback: t("contract.txFailed") }
);

// Data loading
async function loadContract(hash) {
  abortController.value?.abort();
  abortController.value = new AbortController();
  loading.value = true;
  error.value = null;
  manifest.value = null;
  try {
    contract.value = (await contractService.getByHash(hash)) || {};
    if (abortController.value?.signal.aborted) return;
    const [, manifestData] = await Promise.all([
      checkVerification(hash),
      contractService.getManifest(hash).catch(() => null),
    ]);
    if (abortController.value?.signal.aborted) return;
    manifest.value = manifestData;
  } catch (err) {
    if (abortController.value?.signal.aborted) return;
    if (import.meta.env.DEV) console.error("Failed to load contract:", err);
    error.value = t("errors.loadContractDetails");
  } finally {
    loading.value = false;
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

onBeforeUnmount(() => {
  abortController.value?.abort();
});

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
    const account = await walletService.connect(providerName);
    walletConnected.value = true;
    walletAccount.value = account;
    walletProvider.value = providerName;
  } catch (err) {
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
