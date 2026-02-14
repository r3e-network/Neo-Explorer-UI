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
          <nav class="flex flex-wrap" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              :id="'tab-' + tab.key"
              role="tab"
              :aria-selected="activeTab === tab.key"
              :aria-controls="'panel-' + tab.key"
              class="border-b-2 px-4 py-3 text-sm font-medium transition-colors"
              :class="
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-500 dark:text-primary-400'
                  : 'border-transparent text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200'
              "
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </nav>
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
// eslint-disable-next-line no-unused-vars
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { contractService } from "@/services";
import { walletService } from "@/services/walletService";
import { buildSourceCodeLocation, getContractDetailTabs } from "@/utils/detailRouting";
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

// State
const abortController = ref(null);
const contract = ref({});
const manifest = ref(null);
const loading = ref(false);
const error = ref(null);
const activeTab = ref("transactions");
const tabs = getContractDetailTabs();
const isVerified = ref(false);
const readMethodState = ref([]);

// Wallet state
const walletConnected = ref(false);
const walletAccount = ref(null);
const walletProvider = ref(null);
const walletConnecting = ref(false);
const walletError = ref("");
const writeMethodState = ref([]);

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
    error.value = "Failed to load contract details. Please try again.";
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

// Read Contract interaction
function toggleReadMethod(idx) {
  if (!readMethodState.value[idx]) return;
  readMethodState.value[idx].open = !readMethodState.value[idx].open;
}

async function invokeReadMethod(idx, method) {
  const state = readMethodState.value[idx];
  if (!state) return;
  state.loading = true;
  state.error = "";
  state.result = undefined;
  try {
    const params = (method.parameters || []).map((p, i) => ({
      type: p.type,
      value: state.params[i] || "",
    }));
    state.result = await contractService.invokeRead(contract.value.hash, method.name, params);
  } catch (err) {
    state.error = err?.message || "Invocation failed. Please check parameters and try again.";
  } finally {
    state.loading = false;
  }
}

function updateReadParam(methodIdx, paramIdx, value) {
  if (readMethodState.value[methodIdx]) {
    readMethodState.value[methodIdx].params[paramIdx] = value;
  }
}

function updateWriteParam(methodIdx, paramIdx, value) {
  if (writeMethodState.value[methodIdx]) {
    writeMethodState.value[methodIdx].params[paramIdx] = value;
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

// Rebuild read method state when manifest changes
watch(
  readMethods,
  (methods) => {
    readMethodState.value = methods.map(() => ({
      open: false,
      params: [],
      loading: false,
      result: undefined,
      error: "",
    }));
  },
  { immediate: true }
);

// Rebuild write method state when manifest changes
watch(
  writeMethods,
  (methods) => {
    writeMethodState.value = methods.map(() => ({
      open: false,
      params: [],
      loading: false,
      result: undefined,
      error: "",
    }));
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
    walletError.value = err?.message || "Failed to connect wallet";
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

function toggleWriteMethod(idx) {
  if (!writeMethodState.value[idx]) return;
  writeMethodState.value[idx].open = !writeMethodState.value[idx].open;
}

async function invokeWriteMethod(idx, method) {
  const state = writeMethodState.value[idx];
  if (!state) return;
  state.loading = true;
  state.error = "";
  state.result = undefined;
  try {
    const args = (method.parameters || []).map((p, i) => ({
      type: p.type,
      value: state.params[i] || "",
    }));
    const result = await walletService.invoke({
      scriptHash: contract.value.hash,
      operation: method.name,
      args,
    });
    state.result = result;
  } catch (err) {
    state.error = err?.message || "Transaction failed. Please check parameters.";
  } finally {
    state.loading = false;
  }
}
</script>
