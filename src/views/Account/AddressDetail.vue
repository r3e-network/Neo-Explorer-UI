<template>
  <div class="address-detail-page">
    <div class="page-container py-6">
      <!-- Breadcrumb -->
      <Breadcrumb
        :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.accounts'), to: '/account/1' }, { label: truncateAddr }]"
      />

      <AddressHeader
        :address="address"
        :is-contract="isContract"
        v-model:show-qr="showQr"
        :neo-balance="neoBalance"
        :gas-balance="gasBalance"
        :tx-count="txTotalCount"
        :token-count="tokenCount"
        :candidate-data="candidateData"
        :summary-loading="summaryLoading"
      />

      <div
        v-if="unresolvedDomain"
        class="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      >
        {{ $t('addressDetail.unresolvedDomain', { domain: unresolvedDomain }) }}
      </div>

      <div
        v-if="showMainnetHint"
        class="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      >
        {{ $t('addressDetail.noTestnetActivity') }}
        <button class="ml-1 font-semibold underline" @click="switchToMainnet">{{ $t('addressDetail.switchToMainnet') }}</button>
      </div>

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
            :transfer-summary-by-hash="transferSummaryByHash"
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
import { ref, computed, watch, onBeforeUnmount, defineAsyncComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { accountService } from "@/services/accountService";
import { transactionService } from "@/services/transactionService";
import { contractService } from "@/services/contractService";
import { candidateService } from "@/services/candidateService";
import { tokenService } from "@/services/tokenService";
import { isAbortError } from "@/utils/abortError";
import { NATIVE_CONTRACTS } from "@/constants";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import {
  getAddressDetailTabs,
  normalizeAccountSummary,
  pickBestCandidateVotes,
  sumCandidateVoterBalances,
  splitAddressAssets,
  normalizeAddressTransactions,
  normalizeNep17Transfers,
  normalizeNep11Transfers,
  downloadTransactionsCsv,
} from "@/utils/addressDetail";
import { usePagination } from "@/composables/usePagination";
import { useTransferSummary } from "@/composables/useTransferSummary";
import TabsNav from "@/components/common/TabsNav.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import AddressHeader from "./components/AddressHeader.vue";
import AddressTransactionsTab from "./components/AddressTransactionsTab.vue";
import { addressToScriptHash, scriptHashToAddress } from "@/utils/neoHelpers";
import { getCurrentEnv, NET_ENV, setCurrentEnv } from "@/utils/env";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { getCommittee as fetchDoraCommittee } from "@/services/doraService";
import { supabaseService } from "@/services/supabaseService";
import nnsService from "@/services/nnsService";
import { getDefaultCandidateLogoUrl, resolveCandidateLogoUrl } from "@/utils/logoOptimization";
import { isHash160Hex } from "@/utils/walletNormalization";
import { useToast } from "vue-toastification";

const AddressTokenTransfersTab = defineAsyncComponent(() => import("./components/AddressTokenTransfersTab.vue"));
const AddressNftTransfersTab = defineAsyncComponent(() => import("./components/AddressNftTransfersTab.vue"));
const AddressTokensTab = defineAsyncComponent(() => import("./components/AddressTokensTab.vue"));
const AddressNftsTab = defineAsyncComponent(() => import("./components/AddressNftsTab.vue"));
const AddressVotersTab = defineAsyncComponent(() => import("./components/AddressVotersTab.vue"));

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
let addressRequestId = 0;
const MAX_CANDIDATE_LIST_LOOKUP = 1000;
const MAX_VOTER_FALLBACK_PAGES = 10;
const MAX_VOTER_FALLBACK_ENTRIES = 2000;
const SUMMARY_LOAD_TIMEOUT_MS = 4500;
const abortController = ref(null);
const neoBalance = ref("0");
const gasBalance = ref("0");
const txCount = ref(0);
const tokenCount = ref(0);
const summaryLoading = ref(true);
const activeTab = ref("transactions");
const isCandidate = ref(false);
const candidateData = ref(null);
const tabs = computed(() =>
  getAddressDetailTabs(isCandidate.value).map((tab) => ({ ...tab, label: t(tab.labelKey) })),
);
const assets = ref([]);
const fungibleAssets = ref([]);
const nftAssets = ref([]);
const assetsLoading = ref(false);
const assetsError = ref("");
const { transferSummaryByHash, enrichTransactions } = useTransferSummary();
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
    const result = normalizeAddressTransactions(response?.result || []);
    enrichTransactions(result);
    return {
      result,
      totalCount: Number(response?.totalCount || 0),
    };
  },
  { defaultPageSize: 10, errorMessage: t("errors.loadTransactions") },
);
const isContract = ref(false);
const showQr = ref(false);
const networkHintDismissed = ref(false);
// Set when the URL is an .neo / .matrix domain that didn't resolve to an
// address (expired registration, never registered, or RPC fault). Without
// this hint the page silently renders the raw domain string with all
// stats at zero, which looks like an empty-but-real account.
const unresolvedDomain = ref("");

function withTimeout(promise, timeoutMs, message) {
  let timerId;
  const timeout = new Promise((_, reject) => {
    timerId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timerId));
}

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
    const rows = normalizeNep17Transfers(response?.result || []);

    // Enrich rows whose decimals weren't supplied by the indexer
    // (which is nearly all of them — the nep17_transfers view doesn't
    // carry a decimals column). Without this every non-NEO/GAS NEP-17
    // would render against the 0/8 fallback baked into the normalizer
    // — wrong for tokens with e.g. 6 decimals like USDT-style assets.
    // getByHashWithFallback probes the contract's decimals() method via
    // RPC when the indexer's value looks suspect.
    const needsDecimals = new Set();
    for (const r of rows) {
      const ch = String(r.tokenHash || "").toLowerCase();
      if (!ch || NATIVE_CONTRACTS[ch]) continue;
      // normalizeNep17Transfers always returns a number — treat 0
      // outside the NATIVE list as "unknown, please verify"; the
      // tokenService cache makes the repeat free.
      if (r.decimals === 0) needsDecimals.add(ch);
    }
    if (needsDecimals.size) {
      const decimalsByContract = new Map();
      await Promise.all(
        [...needsDecimals].map(async (ch) => {
          try {
            const meta = await tokenService.getByHashWithFallback(ch);
            if (meta && typeof meta.decimals !== "undefined" && meta.decimals !== null) {
              decimalsByContract.set(ch, Number(meta.decimals));
            }
          } catch (_e) {
            /* leave at 0 fallback */
          }
        }),
      );
      for (const r of rows) {
        const ch = String(r.tokenHash || "").toLowerCase();
        if (decimalsByContract.has(ch)) {
          r.decimals = decimalsByContract.get(ch);
        }
      }
    }

    return {
      result: rows,
      totalCount: Number(response?.totalCount || 0),
    };
  },
  { defaultPageSize: 10, errorMessage: t("errors.loadTokens") },
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
  { defaultPageSize: 10, errorMessage: t("errors.loadNftDetails") },
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
    // Voters are looked up by the candidate's public key (the on-chain Vote
    // notifications key voters by candidate pubkey, not address).
    const pubKey = candidateData.value?.candidatePubKey || candidateData.value?.publickey || "";
    if (!pubKey) return { result: [], totalCount: 0 };

    const response = await candidateService.getVotersByAddress(pubKey, pageSize, skip);

    // Map script hashes back to base58 addresses
    const mappedResult = (response?.result || []).map((v) => {
      let voterAddress = v.voter;
      try {
        if (voterAddress.startsWith("0x")) {
          voterAddress = scriptHashToAddress(voterAddress);
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
  { defaultPageSize: 10, errorMessage: t("addressDetail.failedLoadVoters") },
);

// --- Computed ---
const rawAddress = computed(() => route.params.accountAddress || "");

const address = computed(() => {
  const val = rawAddress.value;
  if (val.startsWith("0x") && val.length === 42) {
    const converted = scriptHashToAddress(val);
    return converted || val;
  }
  return val;
});

const truncateAddr = computed(() => {
  const value = address.value || "";
  if (!value) return "";
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
});

const showMainnetHint = computed(() => {
  if (networkHintDismissed.value) return false;
  if (getCurrentEnv() !== NET_ENV.TestT5) return false;
  if (isCandidate.value) return false;
  if (assetsLoading.value || transactionsLoading.value) return false;

  const hasBalance = Number(neoBalance.value || 0) > 0 || Number(gasBalance.value || 0) > 0;
  return !hasBalance && txTotalCount.value === 0 && tokenCount.value === 0 && assets.value.length === 0;
});

async function switchToMainnet() {
  const addr = address.value;
  if (!addr) return;
  networkHintDismissed.value = true;
  setCurrentEnv(NET_ENV.Mainnet);
  await initializeData(addr);
}

async function resolveCandidateVotes(scriptHash, candidate, currentRequestId) {
  let resolvedVotes = pickBestCandidateVotes(candidate);

  try {
    const votesResponse = await candidateService.getVotesByAddress(scriptHash);
    if (currentRequestId !== addressRequestId) return resolvedVotes;
    resolvedVotes = pickBestCandidateVotes(resolvedVotes, votesResponse);
  } catch {
    // Ignore and fallback to other sources.
  }

  if (resolvedVotes !== "0") return resolvedVotes;

  try {
    const countRaw = await candidateService.getCount();
    if (currentRequestId !== addressRequestId) return resolvedVotes;

    const count = Number(countRaw || 0);
    const limit = Number.isFinite(count) && count > 0 ? Math.min(count, MAX_CANDIDATE_LIST_LOOKUP) : 500;
    const listResponse = await candidateService.getList(limit, 0);
    if (currentRequestId !== addressRequestId) return resolvedVotes;

    const list = Array.isArray(listResponse?.result) ? listResponse.result : [];
    const matched = list.find(
      (item) => String(item?.candidate || "").toLowerCase() === String(scriptHash || "").toLowerCase(),
    );
    resolvedVotes = pickBestCandidateVotes(resolvedVotes, matched);
  } catch {
    // Ignore list fallback failures.
  }

  if (resolvedVotes !== "0") return resolvedVotes;

  try {
    const pageSize = 200;
    let skip = 0;
    let accumulatedVotes = 0n;
    let totalCount = null;

    const candidatePubKey = candidate?.candidatePubKey || candidate?.publickey || "";
    for (let page = 0; page < MAX_VOTER_FALLBACK_PAGES; page += 1) {
      const votersResponse = await candidateService.getVotersByAddress(candidatePubKey, pageSize, skip);
      if (currentRequestId !== addressRequestId) return resolvedVotes;

      const votersList = Array.isArray(votersResponse?.result) ? votersResponse.result : [];
      if (!votersList.length) break;

      accumulatedVotes += BigInt(sumCandidateVoterBalances(votersList));
      skip += votersList.length;
      if (skip >= MAX_VOTER_FALLBACK_ENTRIES) break;

      const parsedTotal = Number(votersResponse?.totalCount || 0);
      totalCount = Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : totalCount;
      if (votersList.length < pageSize || (Number.isFinite(totalCount) && totalCount > 0 && skip >= totalCount)) {
        break;
      }
    }

    if (accumulatedVotes > 0n) {
      resolvedVotes = accumulatedVotes.toString();
    }
  } catch {
    // Ignore voter-sum fallback failures.
  }

  return resolvedVotes;
}

// --- Data loading methods ---
async function loadSummary(addr) {
  const currentRequestId = addressRequestId;
  summaryLoading.value = true;
  try {
    const account = (await withTimeout(
      accountService.getByAddress(addr, { signal: abortController.value?.signal }),
      SUMMARY_LOAD_TIMEOUT_MS,
      "Address summary timed out",
    )) || {};
    if (currentRequestId !== addressRequestId) return;
    const summary = normalizeAccountSummary(account, assets.value);
    neoBalance.value = summary.neoBalance;
    gasBalance.value = summary.gasBalance;
    txCount.value = summary.txCount;
    tokenCount.value = summary.tokenCount;

    if (isHash160Hex(addr)) {
      try {
        const contract = await contractService.getByHashWithFallback(addr);
        if (currentRequestId !== addressRequestId) return;
        isContract.value = !!(contract && contract.hash);
      } catch {
        isContract.value = false;
      }
    }

    try {
      const scriptHash = addressToScriptHash(addr);
      if (scriptHash) {
        const candidate = await candidateService.getByAddress(scriptHash);
        if (currentRequestId !== addressRequestId) return;

        if (candidate && candidate.candidate) {
          isCandidate.value = true;
          candidateData.value = { ...candidate, publickey: candidate.candidatePubKey || "" };

          const votes = await resolveCandidateVotes(scriptHash, candidateData.value, currentRequestId);
          if (currentRequestId === addressRequestId && candidateData.value) {
            candidateData.value.votes = votes;
            candidateData.value.votesOfCandidate = votes;
          }

          const env = getCurrentEnv().toLowerCase();
          const isTestnet = env.includes(NET_ENV.TestT5.toLowerCase()) || env.includes("test");
          if (env === NET_ENV.Mainnet.toLowerCase() && candidateData.value.publickey) {
            candidateData.value.metaLogo = getDefaultCandidateLogoUrl(candidateData.value.publickey);
          }

          if (!isTestnet) {
            let metadataRows = [];
            try {
              metadataRows = await supabaseService.getValidatorMetadata(getCurrentEnv());
            } catch {
              metadataRows = [];
            }

            if (!Array.isArray(metadataRows) || metadataRows.length === 0) {
              try {
                metadataRows = await fetchDoraCommittee(NET_ENV.Mainnet);
              } catch {
                metadataRows = [];
              }
            }

            if (currentRequestId !== addressRequestId) return;

            if (Array.isArray(metadataRows)) {
              const targetScriptHash = (addressToScriptHash(addr) || "").toLowerCase();
              let meta = metadataRows.find((item) => {
                const scriptHash = String(item.scripthash || item.address || "").toLowerCase();
                return scriptHash && targetScriptHash && scriptHash === targetScriptHash;
              });

              if (!meta && candidateData.value.publickey) {
                meta = metadataRows.find((item) => {
                  const pubkey = item.pubkey || item.public_key || item.publicKey;
                  return pubkey && pubkey === candidateData.value.publickey;
                });
              }

              const foundPubKey = meta?.pubkey || meta?.public_key || meta?.publicKey || null;
              if (foundPubKey && !candidateData.value.publickey) {
                candidateData.value.publickey = foundPubKey;
              }

              if (meta) {
                candidateData.value.metaName = meta.name || meta.display_name;
                candidateData.value.metaLocation = meta.location;
                const logo = meta.logoUrl || meta.logo_url || meta.logo;
                if (logo) {
                  candidateData.value.metaLogo = resolveCandidateLogoUrl(logo);
                } else if (env === NET_ENV.Mainnet.toLowerCase() && candidateData.value.publickey) {
                  candidateData.value.metaLogo = getDefaultCandidateLogoUrl(candidateData.value.publickey);
                }
              }
            }
          }
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
    // getByAddress failed (e.g. legacy RPC error). Don't wipe the header:
    // the authoritative NEO/GAS balances loaded via getAssets
    // (getnep17balances) are already in assets.value. Derive the summary
    // from them so the balance stays correct instead of showing zero.
    const summary = normalizeAccountSummary({}, assets.value);
    neoBalance.value = summary.neoBalance;
    gasBalance.value = summary.gasBalance;
    txCount.value = summary.txCount;
    tokenCount.value = summary.tokenCount;
  } finally {
    if (currentRequestId === addressRequestId) summaryLoading.value = false;
  }
}

async function loadAssets(addr) {
  const currentRequestId = addressRequestId;
  assetsLoading.value = true;
  assetsError.value = "";

  try {
    const response = await accountService.getAssets(addr);
    if (currentRequestId !== addressRequestId) return;

    let rawAssets = [];
    if (Array.isArray(response)) {
      rawAssets = response;
    } else if (response && Array.isArray(response.result)) {
      rawAssets = response.result;
    }

    // Enhance assets with token metadata (since GetAssetsHeldByAddress only returns balance + hash)
    const enhancedPromises = rawAssets.map(async (asset) => {
      let hash = asset?.hash || asset?.asset || asset?.contracthash || asset?.contractHash || asset?.assethash || "";
      hash = hash.toLowerCase();
      if (!hash) return asset;
      if (!hash.startsWith("0x")) hash = "0x" + hash;

      // Fast path for known contracts
      const native = NATIVE_CONTRACTS[hash];
      const known = KNOWN_CONTRACTS[hash];

      let tokenname = asset.tokenname || asset.name;
      let symbol = asset.symbol;
      let decimals = asset.decimals;
      let standard = asset.standard || asset.type;

      if (native) {
        tokenname = tokenname || native.name;
        symbol = symbol || native.symbol;
        decimals = decimals !== undefined ? decimals : native.decimals;
        standard = standard || "NEP17";
      } else if (known) {
        tokenname = tokenname || known.name;
        symbol = symbol || known.symbol;
        decimals = decimals !== undefined ? decimals : known.decimals;
        standard = standard || "NEP17"; // Assuming KNOWN_CONTRACTS are usually NEP17 in this context
      }

      // If still missing essential info, fetch from API
      if (!tokenname || standard === undefined || decimals === undefined) {
        try {
          const info = await tokenService.getByHash(hash);
          if (info) {
            tokenname = tokenname || info.tokenname || info.name || info.symbol;
            symbol = symbol || info.symbol || info.name;
            decimals = decimals !== undefined ? decimals : info.decimals;
            standard = standard || info.type || info.standard;
          }
        } catch (e) {
          // Ignore metadata fetch error
        }
      }

      return {
        ...asset,
        tokenname: tokenname || "Unknown",
        symbol: symbol || "Unknown",
        decimals,
        standard: standard || "NEP17",
        type: standard || "NEP17",
      };
    });

    const enhancedAssets = await Promise.all(enhancedPromises);
    if (currentRequestId !== addressRequestId) return;

    assets.value = enhancedAssets;

    const split = splitAddressAssets(assets.value);
    fungibleAssets.value = split.fungibleAssets;
    nftAssets.value = split.nftAssets;
    tokenCount.value = assets.value.length;

    const assetSummary = normalizeAccountSummary({}, assets.value);
    neoBalance.value = assetSummary.neoBalance;
    gasBalance.value = assetSummary.gasBalance;
  } catch (err) {
    if (currentRequestId !== addressRequestId) return;
    // Aborted fetches (route change / re-init) aren't user failures
    if (isAbortError(err)) return;
    assetsError.value = t("addressDetail.failedLoadTokenHoldings");
  } finally {
    if (currentRequestId === addressRequestId) {
      assetsLoading.value = false;
    }
  }
}

function exportCsv() {
  try {
    downloadTransactionsCsv(transactions.value, `txns-${address.value}.csv`);
  } catch {
    toast.error(t("addressDetail.csvExportFailed"));
  }
}

// --- Initialization ---
async function initializeData(addr) {
  ++addressRequestId;
  abortController.value?.abort();
  abortController.value = new AbortController();
  networkHintDismissed.value = false;
  txPage.value = 1;
  isCandidate.value = false;
  candidateData.value = null;
  // Reset balances and counts so the previous address's numbers don't
  // linger in the header while the new summary loads. Loaders below set
  // these on success; on failure they need to start from a clean slate.
  neoBalance.value = "0";
  gasBalance.value = "0";
  txCount.value = 0;
  tokenCount.value = 0;
  isContract.value = false;
  if (activeTab.value === "voters") {
    activeTab.value = "transactions";
  }

  const txPagePromise = loadTxPage(1);
  const results = await Promise.allSettled([loadAssets(addr), loadSummary(addr), txPagePromise]);
  if (import.meta.env.DEV) {
    results.forEach((r, i) => {
      if (r.status === "rejected") console.warn(`initializeData task ${i} failed:`, r.reason);
    });
  }
}

function handleNetworkChange() {
  if (address.value) {
    void initializeData(address.value);
  }
}

useNetworkChange(handleNetworkChange);

onBeforeUnmount(() => {
  abortController.value?.abort();
});

// --- Watchers ---
watch(
  address,
  async (addr) => {
    if (!addr) return;
    // If the URL is an NNS / Matrix domain (e.g. smartwallet.neo),
    // resolve it to the on-chain address first and replace the route so
    // every downstream service call sees the canonical N… address. The
    // user can still navigate by typing the domain into search.
    const trimmed = String(addr).trim();
    if (/\.(neo|matrix)$/i.test(trimmed)) {
      try {
        const resolved = await nnsService.resolveDomain(trimmed.toLowerCase());
        if (resolved && resolved !== trimmed) {
          unresolvedDomain.value = "";
          await router.replace({ path: `/account-profile/${resolved}` });
          return; // route change re-fires this watcher with the resolved addr
        }
        // resolveDomain returns null on FAULT (e.g. expired) or no record.
        unresolvedDomain.value = trimmed;
      } catch {
        // Network/SDK error — same end-user effect as no record.
        unresolvedDomain.value = trimmed;
      }
      // The downstream loaders (transactions, transfers, assets) all key off
      // the canonical Neo address. With only a bogus domain string they'd
      // throw and surface "Unable to load transactions" errors that drown
      // out the unresolvedDomain banner. Render the empty state instead.
      summaryLoading.value = false;
      neoBalance.value = "0";
      gasBalance.value = "0";
      txCount.value = 0;
      tokenCount.value = 0;
      return;
    }
    unresolvedDomain.value = "";
    await initializeData(addr);
  },
  { immediate: true },
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
