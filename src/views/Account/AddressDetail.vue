<template>
  <div class="address-detail-page">
    <div class="page-container py-6">
      <!-- Breadcrumb -->
      <Breadcrumb
        :items="[{ label: 'Home', to: '/homepage' }, { label: 'Addresses', to: '/account/1' }, { label: truncateAddr }]"
      />

      <AddressHeader
        :address="address"
        :is-contract="isContract"
        v-model:show-qr="showQr"
        :neo-balance="neoBalance"
        :gas-balance="gasBalance"
        :tx-count="txCount"
        :token-count="tokenCount"
        :candidate-data="candidateData"
      />

      <div class="etherscan-card overflow-hidden">
        <div class="p-3 pb-0">
          <TabsNav :tabs="tabs" v-model="activeTab" />
        </div>

        <div :id="'panel-' + activeTab" role="tabpanel" :aria-labelledby="'tab-' + activeTab" class="p-4 pt-5 md:p-5">
          <AddressTransactionsTab
            v-if="activeTab === 'transactions'"
            :address="address"
            :transactions="transactions"
            :loading="transactionsLoading"
            :error="transactionsError"
            :page="txPage"
            :total-pages="txTotalPages"
            :page-size="txPageSize"
            :total-count="txTotalCount"
            @go-to-page="goToTxPage"
            @change-page-size="changeTxPageSize"
            @export-csv="exportCsv"
          />

          <AddressTokenTransfersTab
            v-else-if="activeTab === 'tokenTransfers'"
            :address="address"
            :transfers="nep17Transfers"
            :loading="nep17Loading"
            :error="nep17Error"
            :page="nep17Page"
            :total-pages="nep17TotalPages"
            :page-size="nep17PageSize"
            :total-count="nep17TotalCount"
            @go-to-page="goToNep17Page"
            @change-page-size="changeNep17PageSize"
            @retry="loadNep17Page(1)"
          />

          <AddressNftTransfersTab
            v-else-if="activeTab === 'nftTransfers'"
            :address="address"
            :transfers="nep11Transfers"
            :loading="nep11Loading"
            :error="nep11Error"
            :page="nep11Page"
            :total-pages="nep11TotalPages"
            :page-size="nep11PageSize"
            :total-count="nep11TotalCount"
            @go-to-page="goToNep11Page"
            @change-page-size="changeNep11PageSize"
            @retry="loadNep11Page(1)"
          />

          <AddressTokensTab
            v-else-if="activeTab === 'tokens'"
            :assets="fungibleAssets"
            :loading="assetsLoading"
            :error="assetsError"
            @retry="loadAssets(address)"
          />

          <AddressNftsTab
            v-else-if="activeTab === 'nfts'"
            :assets="nftAssets"
            :loading="assetsLoading"
            :error="assetsError"
            @retry="loadAssets(address)"
          />

          <AddressVotersTab
            v-else-if="activeTab === 'voters'"
            :address="address"
            :voters="voters"
            :loading="votersLoading"
            :error="votersError"
            :page="votersPage"
            :total-pages="votersTotalPages"
            :page-size="votersPageSize"
            :total-count="votersTotalCount"
            @go-to-page="goToVotersPage"
            @change-page-size="changeVotersPageSize"
            @retry="loadVotersPage(1)"
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
import { accountService, transactionService, contractService, candidateService } from "@/services";
import {
  getAddressDetailTabs,
  normalizeAccountSummary,
  splitAddressAssets,
  normalizeAddressTransactions,
  normalizeNep17Transfers,
  normalizeNep11Transfers,
  downloadTransactionsCsv,
} from "@/utils/addressDetail";
import { usePagination } from "@/composables/usePagination";
import TabsNav from "@/components/common/TabsNav.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import AddressHeader from "./components/AddressHeader.vue";
import AddressTransactionsTab from "./components/AddressTransactionsTab.vue";
import AddressTokenTransfersTab from "./components/AddressTokenTransfersTab.vue";
import AddressNftTransfersTab from "./components/AddressNftTransfersTab.vue";
import AddressTokensTab from "./components/AddressTokensTab.vue";
import AddressNftsTab from "./components/AddressNftsTab.vue";
import AddressVotersTab from "./components/AddressVotersTab.vue";
import { addressToScriptHash, scriptHashHexToAddress, publicKeyToAddress } from "@/utils/neoHelpers";
import { getCurrentEnv, NET_ENV } from '@/utils/env';
import { cachedRequest } from '@/services/cache';

const route = useRoute();
const { t } = useI18n();
let addressRequestId = 0;
const abortController = ref(null);
const neoBalance = ref("0");
const gasBalance = ref("0");
const txCount = ref(0);
const tokenCount = ref(0);
const activeTab = ref("transactions");
const isCandidate = ref(false);
const candidateData = ref(null);
const tabs = computed(() => getAddressDetailTabs(isCandidate.value));
const assets = ref([]);
const fungibleAssets = ref([]);
const nftAssets = ref([]);
const assetsLoading = ref(false);
const assetsError = ref("");
// Transactions pagination via composable
const {
  items: transactions,
  loading: transactionsLoading,
  error: transactionsError,
  currentPage: txPage,
  pageSize: txPageSize,
  totalCount: txTotalCount,
  totalPages: txTotalPages,
  loadPage: loadTxPage,
  goToPage: goToTxPage,
  changePageSize: changeTxPageSize,
} = usePagination(
  async (pageSize, skip) => {
    const addr = address.value;
    if (!addr) return { result: [], totalCount: 0 };
    const response = await transactionService.getByAddress(addr, pageSize, skip);
    return {
      result: normalizeAddressTransactions(response?.result || []),
      totalCount: Number(response?.totalCount || 0),
    };
  },
  { defaultPageSize: 10, errorMessage: t("errors.loadTransactions") }
);
const isContract = ref(false);
const showQr = ref(false);

// NEP-17 Token Transfers via composable
const {
  items: nep17Transfers,
  loading: nep17Loading,
  error: nep17Error,
  currentPage: nep17Page,
  pageSize: nep17PageSize,
  totalCount: nep17TotalCount,
  totalPages: nep17TotalPages,
  loadPage: loadNep17Page,
  goToPage: goToNep17Page,
  changePageSize: changeNep17PageSize,
} = usePagination(
  async (pageSize, skip) => {
    const addr = address.value;
    if (!addr) return { result: [], totalCount: 0 };
    const response = await accountService.getNep17Transfers(addr, pageSize, skip);
    return {
      result: normalizeNep17Transfers(response?.result || []),
      totalCount: Number(response?.totalCount || 0),
    };
  },
  { defaultPageSize: 10, errorMessage: t("errors.loadTokens") }
);

// NEP-11 NFT Transfers via composable
const {
  items: nep11Transfers,
  loading: nep11Loading,
  error: nep11Error,
  currentPage: nep11Page,
  pageSize: nep11PageSize,
  totalCount: nep11TotalCount,
  totalPages: nep11TotalPages,
  loadPage: loadNep11Page,
  goToPage: goToNep11Page,
  changePageSize: changeNep11PageSize,
} = usePagination(
  async (pageSize, skip) => {
    const addr = address.value;
    if (!addr) return { result: [], totalCount: 0 };
    const response = await accountService.getNep11Transfers(addr, pageSize, skip);
    return {
      result: normalizeNep11Transfers(response?.result || []),
      totalCount: Number(response?.totalCount || 0),
    };
  },
  { defaultPageSize: 10, errorMessage: t("errors.loadNftDetails") }
);

// Voters via composable
const {
  items: voters,
  loading: votersLoading,
  error: votersError,
  currentPage: votersPage,
  pageSize: votersPageSize,
  totalCount: votersTotalCount,
  totalPages: votersTotalPages,
  loadPage: loadVotersPage,
  goToPage: goToVotersPage,
  changePageSize: changeVotersPageSize,
} = usePagination(
  async (pageSize, skip) => {
    const addr = address.value;
    if (!addr) return { result: [], totalCount: 0 };
    
    const scriptHash = addressToScriptHash(addr);
    if (!scriptHash) return { result: [], totalCount: 0 };

    const response = await candidateService.getVotersByAddress(scriptHash, pageSize, skip);
    
    // Map script hashes back to base58 addresses
    const mappedResult = (response?.result || []).map(v => {
      let voterAddress = v.voter;
      try {
        if (voterAddress.startsWith('0x')) {
          voterAddress = scriptHashHexToAddress(voterAddress.slice(2));
        }
      } catch (e) {
        // keep original if fails
      }
      return { ...v, voterAddress };
    });

    return {
      result: mappedResult,
      totalCount: Number(response?.totalCount || 0),
    };
  },
  { defaultPageSize: 10, errorMessage: "Failed to load voters" }
);

// --- Computed ---
const address = computed(() => route.params.accountAddress);

const truncateAddr = computed(() => {
  const value = address.value || "";
  if (!value) return "";
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
});

// --- Data loading methods ---
async function loadSummary(addr) {
  const currentRequestId = addressRequestId;
  try {
    const account = (await accountService.getByAddress(addr)) || {};
    if (currentRequestId !== addressRequestId) return;
    const summary = normalizeAccountSummary(account, assets.value);
    neoBalance.value = summary.neoBalance;
    gasBalance.value = summary.gasBalance;
    txCount.value = summary.txCount;
    tokenCount.value = summary.tokenCount;

    try {
      const contract = await contractService.getByHash(addr);
      if (currentRequestId !== addressRequestId) return;
      isContract.value = !!(contract && contract.hash);
    } catch {
      isContract.value = false;
    }

    try {
      const scriptHash = addressToScriptHash(addr);
      if (scriptHash) {
        const candidate = await candidateService.getByAddress(scriptHash);
        if (currentRequestId !== addressRequestId) return;
        
        if (candidate && candidate.candidate) {
          isCandidate.value = true;
          candidateData.value = { ...candidate, publickey: candidate.candidatePubKey || '' };
          
          const env = getCurrentEnv().toLowerCase();
          if (env === NET_ENV.Mainnet.toLowerCase() && candidateData.value.publickey) {
             candidateData.value.metaLogo = `https://governance.neo.org/logo/${candidateData.value.publickey}.png`;
          }
          
          // Fetch Dora metadata
          const doraEnv = env.includes(NET_ENV.TestT5.toLowerCase()) ? "testnet" : "mainnet";
          const url = `https://dora.coz.io/api/v1/neo3/${doraEnv}/committee`;
          
          cachedRequest(
            `dora_metadata_${doraEnv}`,
            () => fetch(url).then(r => r.ok ? r.json() : []),
            300000 // 5 mins
          ).then((data) => {
            if (currentRequestId !== addressRequestId) return;
            if (Array.isArray(data)) {
              // Try to find by converting pubkey to address
              let meta = null;
              let foundPubKey = null;
              for (const item of data) {
                if (item.pubkey) {
                  try {
                    const itemAddr = publicKeyToAddress(item.pubkey);
                    if (itemAddr === addr || addressToScriptHash(itemAddr) === addressToScriptHash(addr)) {
                      meta = item;
                      foundPubKey = item.pubkey;
                      break;
                    }
                  } catch (e) {
                    // Ignore decode errors
                  }
                }
              }
              
              if (foundPubKey && !candidateData.value.publickey) {
                candidateData.value.publickey = foundPubKey;
              }
              
              if (meta) {
                candidateData.value.metaName = meta.name;
                candidateData.value.metaLocation = meta.location;
                if (meta.logo) {
                  candidateData.value.metaLogo = meta.logo.startsWith("http") 
                    ? meta.logo 
                    : `https://filesend.ngd.network/gate/get/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc/${meta.logo}`;
                } else if (env === NET_ENV.Mainnet.toLowerCase() && candidateData.value.publickey) {
                  candidateData.value.metaLogo = `https://governance.neo.org/logo/${candidateData.value.publickey}.png`;
                }
              } else if (env === NET_ENV.Mainnet.toLowerCase() && candidateData.value.publickey) {
                candidateData.value.metaLogo = `https://governance.neo.org/logo/${candidateData.value.publickey}.png`;
              }
            }
          }).catch(() => {});
        } else {
          isCandidate.value = false;
          candidateData.value = null;
        }
      }
    } catch {
      isCandidate.value = false;
      candidateData.value = null;
    }
  } catch {
    if (currentRequestId !== addressRequestId) return;
    neoBalance.value = "0";
    gasBalance.value = "0";
    txCount.value = 0;
  }
}

async function loadAssets(addr) {
  const currentRequestId = addressRequestId;
  assetsLoading.value = true;
  assetsError.value = "";

  try {
    const result = await accountService.getAssets(addr);
    if (currentRequestId !== addressRequestId) return;
    assets.value = Array.isArray(result) ? result : [];

    const split = splitAddressAssets(assets.value);
    fungibleAssets.value = split.fungibleAssets;
    nftAssets.value = split.nftAssets;
    tokenCount.value = assets.value.length;
  } catch {
    if (currentRequestId !== addressRequestId) return;
    assets.value = [];
    fungibleAssets.value = [];
    nftAssets.value = [];
    assetsError.value = t("errors.loadTokenBalances");
  } finally {
    if (currentRequestId === addressRequestId) {
      assetsLoading.value = false;
    }
  }
}

function exportCsv() {
  downloadTransactionsCsv(transactions.value, `txns-${address.value}.csv`);
}

// --- Initialization ---
async function initializeData(addr) {
  ++addressRequestId;
  abortController.value?.abort();
  abortController.value = new AbortController();
  txPage.value = 1;
  isCandidate.value = false;
  candidateData.value = null;
  if (activeTab.value === 'voters') {
    activeTab.value = 'transactions';
  }
  
  // Load assets first so loadSummary can use them to extract NEO/GAS balances
  await loadAssets(addr);
  const results = await Promise.allSettled([loadSummary(addr), loadTxPage(1)]);
  if (import.meta.env.DEV) {
    results.forEach((r, i) => {
      if (r.status === "rejected") console.warn(`initializeData task ${i} failed:`, r.reason);
    });
  }
}

onBeforeUnmount(() => {
  abortController.value?.abort();
});

// --- Watchers ---
watch(
  address,
  async (addr) => {
    if (!addr) return;
    await initializeData(addr);
  },
  { immediate: true }
);

watch(activeTab, (tab) => {
  if (tab === "tokenTransfers" && !nep17Transfers.value.length && !nep17Loading.value) {
    loadNep17Page(1);
  }
  if (tab === "nftTransfers" && !nep11Transfers.value.length && !nep11Loading.value) {
    loadNep11Page(1);
  }
  if (tab === "voters" && !voters.value.length && !votersLoading.value && isCandidate.value) {
    loadVotersPage(1);
  }
});
</script>
