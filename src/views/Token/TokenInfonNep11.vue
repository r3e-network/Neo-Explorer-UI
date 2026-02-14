<template>
  <div class="mx-auto max-w-[1400px] px-4 py-6">
    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <Skeleton height="40px" />
      <div class="etherscan-card p-6">
        <Skeleton v-for="i in 8" :key="i" height="24px" class="mb-3" />
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="py-12">
      <ErrorState :message="error" @retry="reloadToken" />
    </div>

    <template v-else>
      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h1 class="page-title">Token Detail</h1>
            <span
              v-if="updateCounter === -1"
              class="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
            >
              Destroyed
            </span>
          </div>
          <p class="page-subtitle">NEP-11 Non-Fungible Token</p>
        </div>
        <button class="btn-outline ml-auto" aria-label="View contract details" @click="getContract(token_info['hash'])">
          View Contract
        </button>
      </div>

      <!-- Overview Card -->
      <TokenOverviewCard
        :token-info="token_info"
        :decimal="decimal"
        :copied="copied"
        @copy-hash="copyHash"
        @view-contract="getContract"
      />

      <!-- Tabs -->
      <div v-if="updateCounter !== -1">
        <div class="etherscan-card mb-0">
          <div class="card-header">
            <nav class="flex flex-wrap gap-1" role="tablist">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                role="tab"
                :aria-selected="activeName === tab.key"
                :class="['tab-btn', activeName === tab.key ? 'tab-btn-active' : 'tab-btn-inactive']"
                @click="activeName = tab.key"
              >
                {{ tab.label }}
              </button>
            </nav>
          </div>
        </div>

        <!-- Tab: NFT Tokens -->
        <div v-show="activeName === 'nfts'">
          <nft-token
            v-if="token_info['totalsupply'] !== 0"
            :contract-hash="token_id"
            :decimal="decimal === '' ? 0 : decimal"
          />
          <div v-else class="etherscan-card p-6 text-center text-sm text-text-muted">No NFT tokens found</div>
        </div>

        <!-- Tab: Top Holders -->
        <div v-show="activeName === 'holders'">
          <token-holder v-if="token_info['holders']" :contract-hash="token_id" :format-balance="false" />
          <div v-else class="etherscan-card p-6 text-center text-sm text-text-muted">No holders found</div>
        </div>

        <!-- Tab: Contract Info -->
        <div v-show="activeName === 'contract'">
          <ContractInfoTab :manifest="manifest" @query="onQuery" @decode="decode" @update-param="onUpdateParam" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { tokenService, contractService } from "@/services";
import { COPY_FEEDBACK_TIMEOUT_MS } from "@/constants";
import NftToken from "./NftTokens";
import TokenHolder from "./TokenHolder";
import TokenOverviewCard from "./components/TokenOverviewCard.vue";
import ContractInfoTab from "./components/ContractInfoTab.vue";
import { responseConverter } from "@/store/util";
import { invokeContractFunction } from "@/utils/contractInvocation";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const route = useRoute();
const router = useRouter();

// data() -> refs
const token_id = ref("");
const isLoading = ref(true);
const error = ref(null);
const token_info = ref({});
const manifest = ref({});
const decimal = ref("");
const activeName = ref("nfts");
const tabs = [
  { key: "nfts", label: "NFT Tokens" },
  { key: "holders", label: "Top Holders" },
  { key: "contract", label: "Contract Info" },
];
const updateCounter = ref(0);
const copied = ref(false);
const abortController = ref(null);

// Timer cleanup for copyHash setTimeout
let copyTimer = null;
onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer);
  abortController.value?.abort();
});

// methods -> functions
function decode(index) {
  if (manifest.value["abi"]["methods"][index]["isRaw"]) {
    manifest.value["abi"]["methods"][index]["isRaw"] = false;
    manifest.value["abi"]["methods"][index]["button"] = "Raw";
  } else {
    manifest.value["abi"]["methods"][index]["isRaw"] = true;
    manifest.value["abi"]["methods"][index]["button"] = "Decode";
  }
}

function onUpdateParam({ methodIndex, paramIndex, value }) {
  manifest.value["abi"]["methods"][methodIndex]["parameters"][paramIndex].value = value;
}

function copyHash(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      copied.value = true;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copied.value = false;
      }, COPY_FEEDBACK_TIMEOUT_MS);
    })
    .catch(() => {});
}

function loadAllData() {
  abortController.value?.abort();
  abortController.value = new AbortController();

  isLoading.value = true;
  activeName.value = "nfts";
  manifest.value = "";
  updateCounter.value = 0;
  getToken(token_id.value);
  getContractManifest(token_id.value);
  getContractUpdateCounter(token_id.value);
}

function getContract(hash) {
  router.push(`/contract-info/${hash}`).catch(() => {});
}

function getToken(id) {
  error.value = null;
  tokenService
    .getByHash(id)
    .then((res) => {
      if (abortController.value?.signal.aborted) return;
      decimal.value = res?.decimals;
      token_info.value = res || {};
      isLoading.value = false;
    })
    .catch((err) => {
      if (abortController.value?.signal.aborted) return;
      error.value = "Failed to load token information. Please try again.";
      isLoading.value = false;
      if (import.meta.env.DEV) console.error("Failed to load token:", err);
    });
}

function reloadToken() {
  const tokenId = route.params.hash;
  if (tokenId) {
    isLoading.value = true;
    getToken(tokenId);
  }
}

function getContractUpdateCounter(contract_id) {
  contractService
    .getByHash(contract_id)
    .then((res) => {
      if (abortController.value?.signal.aborted) return;
      updateCounter.value = res?.updatecounter;
    })
    .catch(() => {
      // Service layer handles error logging
    });
}

function onQuery(index) {
  manifest.value["abi"]["methods"][index]["result"] = "";
  manifest.value["abi"]["methods"][index]["error"] = "";
  const name = manifest.value["abi"]["methods"][index]["name"];
  const params = manifest.value["abi"]["methods"][index]["parameters"];

  invokeContractFunction(token_id.value, name, params)
    .then((res) => {
      if (res?.["exception"] != null) {
        manifest.value["abi"]["methods"][index]["error"] = res["exception"];
      } else {
        const stack = Array.isArray(res?.["stack"]) ? res["stack"] : [];
        const temp = JSON.parse(JSON.stringify(stack));
        manifest.value["abi"]["methods"][index]["isRaw"] = true;
        manifest.value["abi"]["methods"][index]["button"] = "Decode";
        manifest.value["abi"]["methods"][index]["raw"] = stack;
        manifest.value["abi"]["methods"][index]["display"] = JSON.parse(JSON.stringify(temp, responseConverter));
      }
    })
    .catch((err) => {
      manifest.value["abi"]["methods"][index]["error"] =
        err?.message || err?.toString?.() || "Failed to invoke function";
    });
}

function getContractManifest(id) {
  contractService
    .getByHash(id)
    .then((res) => {
      if (abortController.value?.signal.aborted) return;
      manifest.value = JSON.parse(res?.manifest || "{}");
    })
    .catch(() => {
      // Service layer handles error logging
    });
}

// Watch route changes (replaces created + watch.$route)
watch(
  () => route.params.hash,
  (newHash) => {
    if (newHash) {
      token_id.value = newHash;
      loadAllData();
    }
  },
  { immediate: true }
);
</script>
