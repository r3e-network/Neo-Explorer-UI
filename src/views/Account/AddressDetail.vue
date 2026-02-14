<template>
  <div class="address-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
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
      />

      <div class="etherscan-card">
        <div class="card-header">
          <nav class="flex flex-wrap" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              :id="'tab-' + tab.key"
              role="tab"
              :aria-selected="activeTab === tab.key"
              :aria-controls="'panel-' + tab.key"
              class="tab-btn border-b-2 px-4 py-3"
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
            @retry="loadNep17Transfers(1)"
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
            @retry="loadNep11Transfers(1)"
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { accountService, transactionService, contractService } from "@/services";
import {
  getAddressDetailTabs,
  normalizeAccountSummary,
  splitAddressAssets,
  normalizeAddressTransactions,
  normalizeNep17Transfers,
  normalizeNep11Transfers,
  downloadTransactionsCsv,
  getPageCount,
} from "@/utils/addressDetail";
import { usePagination } from "@/composables/usePagination";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import AddressHeader from "./components/AddressHeader.vue";
import AddressTransactionsTab from "./components/AddressTransactionsTab.vue";
import AddressTokenTransfersTab from "./components/AddressTokenTransfersTab.vue";
import AddressNftTransfersTab from "./components/AddressNftTransfersTab.vue";
import AddressTokensTab from "./components/AddressTokensTab.vue";
import AddressNftsTab from "./components/AddressNftsTab.vue";

const route = useRoute();

// --- Reactive state ---
const abortController = ref(null);
const neoBalance = ref("0");
const gasBalance = ref("0");
const txCount = ref(0);
const tokenCount = ref(0);
const activeTab = ref("transactions");
const tabs = getAddressDetailTabs();
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
  { defaultPageSize: 10 }
);
const isContract = ref(false);
const showQr = ref(false);

// NEP-17 Token Transfers
const nep17Transfers = ref([]);
const nep17Loading = ref(false);
const nep17Error = ref("");
const nep17Page = ref(1);
const nep17PageSize = ref(10);
const nep17TotalCount = ref(0);
const nep17TotalPages = ref(1);

// NEP-11 NFT Transfers
const nep11Transfers = ref([]);
const nep11Loading = ref(false);
const nep11Error = ref("");
const nep11Page = ref(1);
const nep11PageSize = ref(10);
const nep11TotalCount = ref(0);
const nep11TotalPages = ref(1);

// --- Computed ---
const address = computed(() => route.params.accountAddress);

const truncateAddr = computed(() => {
  const value = address.value || "";
  if (!value) return "";
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
});

// --- Data loading methods ---
async function loadSummary(addr) {
  try {
    const account = (await accountService.getByAddress(addr)) || {};
    const summary = normalizeAccountSummary(account, assets.value);
    neoBalance.value = summary.neoBalance;
    gasBalance.value = summary.gasBalance;
    txCount.value = summary.txCount;
    tokenCount.value = summary.tokenCount;

    try {
      const contract = await contractService.getByHash(addr);
      isContract.value = !!(contract && contract.hash);
    } catch {
      isContract.value = false;
    }
  } catch {
    neoBalance.value = "0";
    gasBalance.value = "0";
    txCount.value = 0;
  }
}

async function loadAssets(addr) {
  assetsLoading.value = true;
  assetsError.value = "";

  try {
    const result = await accountService.getAssets(addr);
    assets.value = Array.isArray(result) ? result : [];

    const split = splitAddressAssets(assets.value);
    fungibleAssets.value = split.fungibleAssets;
    nftAssets.value = split.nftAssets;
    tokenCount.value = assets.value.length;
  } catch {
    assets.value = [];
    fungibleAssets.value = [];
    nftAssets.value = [];
    assetsError.value = "Failed to load token balances. Please try again.";
  } finally {
    assetsLoading.value = false;
  }
}

async function loadNep17Transfers(page = 1, addr = address.value) {
  if (!addr) return;
  nep17Loading.value = true;
  nep17Error.value = "";
  try {
    const safePage = Math.max(1, Number(page) || 1);
    const skip = (safePage - 1) * nep17PageSize.value;
    const response = await accountService.getNep17Transfers(addr, nep17PageSize.value, skip);
    nep17Transfers.value = normalizeNep17Transfers(response?.result || []);
    nep17TotalCount.value = Number(response?.totalCount || 0);
    nep17TotalPages.value = getPageCount(nep17TotalCount.value, nep17PageSize.value);
    nep17Page.value = safePage > nep17TotalPages.value ? nep17TotalPages.value : safePage;
  } catch {
    nep17Transfers.value = [];
    nep17TotalCount.value = 0;
    nep17TotalPages.value = 1;
    nep17Error.value = "Failed to load token transfers. Please try again.";
  } finally {
    nep17Loading.value = false;
  }
}

function goToNep17Page(page) {
  if (page < 1 || page > nep17TotalPages.value || page === nep17Page.value) return;
  loadNep17Transfers(page);
}

function changeNep17PageSize(size) {
  nep17PageSize.value = size;
  loadNep17Transfers(1);
}

async function loadNep11Transfers(page = 1, addr = address.value) {
  if (!addr) return;
  nep11Loading.value = true;
  nep11Error.value = "";
  try {
    const safePage = Math.max(1, Number(page) || 1);
    const skip = (safePage - 1) * nep11PageSize.value;
    const response = await accountService.getNep11Transfers(addr, nep11PageSize.value, skip);
    nep11Transfers.value = normalizeNep11Transfers(response?.result || []);
    nep11TotalCount.value = Number(response?.totalCount || 0);
    nep11TotalPages.value = getPageCount(nep11TotalCount.value, nep11PageSize.value);
    nep11Page.value = safePage > nep11TotalPages.value ? nep11TotalPages.value : safePage;
  } catch {
    nep11Transfers.value = [];
    nep11TotalCount.value = 0;
    nep11TotalPages.value = 1;
    nep11Error.value = "Failed to load NFT transfers. Please try again.";
  } finally {
    nep11Loading.value = false;
  }
}

function goToNep11Page(page) {
  if (page < 1 || page > nep11TotalPages.value || page === nep11Page.value) return;
  loadNep11Transfers(page);
}

function changeNep11PageSize(size) {
  nep11PageSize.value = size;
  loadNep11Transfers(1);
}

function exportCsv() {
  downloadTransactionsCsv(transactions.value, `txns-${address.value}.csv`);
}

// --- Initialization ---
async function initializeData(addr) {
  abortController.value?.abort();
  abortController.value = new AbortController();
  txPage.value = 1;
  const results = await Promise.allSettled([loadSummary(addr), loadAssets(addr), loadTxPage(1)]);
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
    loadNep17Transfers(1);
  }
  if (tab === "nftTransfers" && !nep11Transfers.value.length && !nep11Loading.value) {
    loadNep11Transfers(1);
  }
});
</script>
