<template>
  <div class="address-detail-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6">
      <nav class="mb-4 flex items-center text-sm text-text-secondary dark:text-gray-400">
        <router-link to="/homepage" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/account/1" class="hover:text-primary-500">Addresses</router-link>
        <span class="mx-2">/</span>
        <span class="max-w-[220px] truncate text-text-primary dark:text-gray-300">{{ truncateAddr }}</span>
      </nav>

      <div class="mb-6 flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-500">
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
        </div>

        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-semibold text-text-primary dark:text-gray-100">Address</h1>
            <span
              v-if="isContract"
              class="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
            >
              Contract
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm text-text-secondary dark:text-gray-400">{{ address }}</span>
            <button @click="copyAddress" class="text-gray-400 hover:text-primary-500">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="info-card">
          <p class="info-label">NEO Balance</p>
          <p class="info-value">{{ formatBalanceValue(neoBalance) }}</p>
        </div>
        <div class="info-card">
          <p class="info-label">GAS Balance</p>
          <p class="info-value">{{ formatBalanceValue(gasBalance) }}</p>
        </div>
        <div class="info-card">
          <p class="info-label">Transactions</p>
          <p class="info-value">{{ formatNumber(txCount) }}</p>
        </div>
        <div class="info-card">
          <p class="info-label">Tokens</p>
          <p class="info-value">{{ formatNumber(tokenCount) }}</p>
        </div>
      </div>

      <div class="etherscan-card">
        <div class="border-b border-card-border dark:border-card-border-dark">
          <nav class="flex flex-wrap">
            <button
              v-for="tab in tabs"
              :key="tab.key"
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

        <div class="p-4 md:p-5">
          <section v-if="activeTab === 'transactions'">
            <div v-if="transactionsLoading" class="space-y-2">
              <Skeleton v-for="index in 6" :key="index" height="46px" />
            </div>

            <ErrorState
              v-else-if="transactionsError"
              title="Unable to load transactions"
              :message="transactionsError"
              @retry="loadTransactions(1)"
            />

            <EmptyState
              v-else-if="!transactions.length"
              message="No transactions found"
              description="This address has no indexed transaction history yet."
            />

            <div v-else class="space-y-4">
              <div class="overflow-x-auto">
                <table class="w-full min-w-[760px]">
                  <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
                    <tr>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Txn Hash</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Age</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Sender</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Status</th>
                      <th class="px-4 py-3 text-right font-medium text-text-secondary">Size</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                    <tr
                      v-for="tx in transactions"
                      :key="tx.hash"
                      class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td class="px-4 py-3">
                        <router-link
                          :to="`/transactionInfo/${tx.hash}`"
                          :title="tx.hash"
                          class="font-mono text-sm etherscan-link"
                        >
                          {{ truncateHash(tx.hash, 12, 8) }}
                        </router-link>
                      </td>
                      <td class="px-4 py-3 text-sm text-text-secondary dark:text-gray-400">
                        {{ formatAge(tx.blocktime) }}
                      </td>
                      <td class="px-4 py-3">
                        <router-link
                          v-if="tx.sender"
                          :to="`/accountprofile/${tx.sender}`"
                          class="font-mono text-sm text-text-primary hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400"
                        >
                          {{ truncateHash(tx.sender, 10, 6) }}
                        </router-link>
                        <span v-else class="text-sm text-gray-400">-</span>
                      </td>
                      <td class="px-4 py-3">
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="txStatusClass(tx.vmstate)">
                          {{ txStatusText(tx.vmstate) }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-right text-sm text-text-secondary dark:text-gray-400">
                        {{ formatNumber(tx.size) }} B
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="border-t border-card-border pt-3 dark:border-card-border-dark">
                <EtherscanPagination
                  :page="txPage"
                  :total-pages="txTotalPages"
                  :page-size="txPageSize"
                  :total="txTotalCount"
                  @update:page="goToTxPage"
                  @update:page-size="changeTxPageSize"
                />
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'tokens'">
            <div v-if="assetsLoading" class="space-y-2">
              <Skeleton v-for="index in 5" :key="index" height="46px" />
            </div>

            <ErrorState
              v-else-if="assetsError"
              title="Unable to load token holdings"
              :message="assetsError"
              @retry="loadAssets(address)"
            />

            <EmptyState
              v-else-if="!fungibleAssets.length"
              message="No token holdings"
              description="No NEP-17 balances were found for this address."
            />

            <div v-else class="overflow-x-auto">
              <table class="w-full min-w-[700px]">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
                  <tr>
                    <th class="px-4 py-3 text-left font-medium text-text-secondary">Token</th>
                    <th class="px-4 py-3 text-left font-medium text-text-secondary">Standard</th>
                    <th class="px-4 py-3 text-right font-medium text-text-secondary">Balance</th>
                    <th class="px-4 py-3 text-left font-medium text-text-secondary">Contract</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                  <tr
                    v-for="asset in fungibleAssets"
                    :key="assetKey(asset)"
                    class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td class="px-4 py-3 text-sm font-medium text-text-primary dark:text-gray-300">
                      {{ assetDisplayName(asset) }}
                    </td>
                    <td class="px-4 py-3 text-sm text-text-secondary dark:text-gray-400">
                      {{ assetStandard(asset) }}
                    </td>
                    <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                      {{ assetBalance(asset) }}
                    </td>
                    <td class="px-4 py-3">
                      <router-link
                        v-if="assetHash(asset)"
                        :to="assetTokenRoute(asset)"
                        class="font-mono text-sm etherscan-link"
                      >
                        {{ truncateHash(assetHash(asset), 12, 8) }}
                      </router-link>
                      <span v-else class="text-sm text-gray-400">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-else>
            <div v-if="assetsLoading" class="space-y-2">
              <Skeleton v-for="index in 5" :key="index" height="46px" />
            </div>

            <ErrorState
              v-else-if="assetsError"
              title="Unable to load NFT holdings"
              :message="assetsError"
              @retry="loadAssets(address)"
            />

            <EmptyState
              v-else-if="!nftAssets.length"
              message="No NFT holdings"
              description="No NEP-11 balances were found for this address."
            />

            <div v-else class="overflow-x-auto">
              <table class="w-full min-w-[700px]">
                <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
                  <tr>
                    <th class="px-4 py-3 text-left font-medium text-text-secondary">Collection</th>
                    <th class="px-4 py-3 text-left font-medium text-text-secondary">Standard</th>
                    <th class="px-4 py-3 text-right font-medium text-text-secondary">Balance</th>
                    <th class="px-4 py-3 text-left font-medium text-text-secondary">Contract</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                  <tr
                    v-for="asset in nftAssets"
                    :key="assetKey(asset)"
                    class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td class="px-4 py-3 text-sm font-medium text-text-primary dark:text-gray-300">
                      {{ assetDisplayName(asset) }}
                    </td>
                    <td class="px-4 py-3 text-sm text-text-secondary dark:text-gray-400">
                      {{ assetStandard(asset) }}
                    </td>
                    <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                      {{ assetBalance(asset) }}
                    </td>
                    <td class="px-4 py-3">
                      <router-link
                        v-if="assetHash(asset)"
                        :to="assetTokenRoute(asset)"
                        class="font-mono text-sm etherscan-link"
                      >
                        {{ truncateHash(assetHash(asset), 12, 8) }}
                      </router-link>
                      <span v-else class="text-sm text-gray-400">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { accountService, transactionService, contractService } from "@/services";
import {
  getAddressDetailTabs,
  normalizeAccountSummary,
  splitAddressAssets,
  normalizeAddressTransactions,
  getPageCount,
} from "@/utils/addressDetail";
import { formatAge, truncateHash } from "@/utils/explorerFormat";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";

export default {
  name: "AddressDetailNew",
  components: {
    EmptyState,
    ErrorState,
    Skeleton,
    EtherscanPagination,
  },
  data() {
    return {
      neoBalance: "0",
      gasBalance: "0",
      txCount: 0,
      tokenCount: 0,
      activeTab: "transactions",
      tabs: getAddressDetailTabs(),
      assets: [],
      fungibleAssets: [],
      nftAssets: [],
      assetsLoading: false,
      assetsError: "",
      transactions: [],
      transactionsLoading: false,
      transactionsError: "",
      txPage: 1,
      txPageSize: 10,
      txTotalCount: 0,
      txTotalPages: 1,
      isContract: false,
    };
  },
  computed: {
    address() {
      return this.$route.params.accountAddress;
    },
    truncateAddr() {
      const value = this.address || "";
      if (!value) return "";
      return `${value.slice(0, 10)}...${value.slice(-8)}`;
    },
  },
  watch: {
    address: {
      immediate: true,
      async handler(addr) {
        if (!addr) {
          return;
        }

        await this.initializeData(addr);
      },
    },
  },
  methods: {
    async initializeData(addr) {
      this.txPage = 1;
      await Promise.all([this.loadSummary(addr), this.loadAssets(addr), this.loadTransactions(1, addr)]);
    },

    async loadSummary(addr) {
      try {
        const account = (await accountService.getByAddress(addr)) || {};
        const summary = normalizeAccountSummary(account, this.assets);
        this.neoBalance = summary.neoBalance;
        this.gasBalance = summary.gasBalance;
        this.txCount = summary.txCount;
        this.tokenCount = summary.tokenCount;

        // Detect contract address
        try {
          const contract = await contractService.getByHash(addr);
          this.isContract = !!(contract && contract.hash);
        } catch {
          this.isContract = false;
        }
      } catch (error) {
        this.neoBalance = "0";
        this.gasBalance = "0";
        this.txCount = 0;
      }
    },

    async loadAssets(addr) {
      this.assetsLoading = true;
      this.assetsError = "";

      try {
        const assets = await accountService.getAssets(addr);
        this.assets = Array.isArray(assets) ? assets : [];

        const { fungibleAssets, nftAssets } = splitAddressAssets(this.assets);
        this.fungibleAssets = fungibleAssets;
        this.nftAssets = nftAssets;
        this.tokenCount = this.assets.length;
      } catch (error) {
        this.assets = [];
        this.fungibleAssets = [];
        this.nftAssets = [];
        this.assetsError = "Failed to load token balances. Please try again.";
      } finally {
        this.assetsLoading = false;
      }
    },

    async loadTransactions(page = 1, address = this.address) {
      if (!address) {
        return;
      }

      this.transactionsLoading = true;
      this.transactionsError = "";

      try {
        const safePage = Math.max(1, Number(page) || 1);
        const skip = (safePage - 1) * this.txPageSize;
        const response = await transactionService.getByAddress(address, this.txPageSize, skip);

        this.transactions = normalizeAddressTransactions(response?.result || []);
        this.txTotalCount = Number(response?.totalCount || 0);
        this.txTotalPages = getPageCount(this.txTotalCount, this.txPageSize);
        this.txPage = safePage > this.txTotalPages ? this.txTotalPages : safePage;
        this.txCount = Math.max(this.txCount, this.txTotalCount);
      } catch (error) {
        this.transactions = [];
        this.txTotalCount = 0;
        this.txTotalPages = 1;
        this.transactionsError = "Failed to load transaction history. Please try again.";
      } finally {
        this.transactionsLoading = false;
      }
    },

    goToTxPage(page) {
      if (page < 1 || page > this.txTotalPages || page === this.txPage) {
        return;
      }

      this.loadTransactions(page);
    },

    changeTxPageSize(size) {
      this.txPageSize = size;
      this.loadTransactions(1);
    },

    txStatusText(vmstate) {
      const state = String(vmstate || "").toUpperCase();
      if (!state) {
        return "Unknown";
      }

      return state === "HALT" ? "Success" : state;
    },

    txStatusClass(vmstate) {
      const state = String(vmstate || "").toUpperCase();
      if (state === "HALT") {
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300";
      }

      if (!state) {
        return "bg-gray-100 text-text-secondary dark:bg-gray-800 dark:text-gray-300";
      }

      return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300";
    },

    assetHash(asset) {
      return asset?.hash || asset?.contracthash || asset?.contractHash || asset?.assethash || "";
    },

    assetStandard(asset) {
      return String(asset?.standard || asset?.type || "Unknown");
    },

    assetDisplayName(asset) {
      return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
    },

    assetBalance(asset) {
      const raw = asset?.balance ?? asset?.amount ?? asset?.quantity ?? asset?.totalbalance;

      if (raw === undefined || raw === null || raw === "") {
        return "-";
      }

      const num = Number(raw);
      if (Number.isFinite(num)) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
      }

      return String(raw);
    },

    assetTokenRoute(asset) {
      const hash = this.assetHash(asset);
      const standard = this.assetStandard(asset).toUpperCase();

      if (standard.includes("NEP11")) {
        return `/NFTtokeninfo/${hash}`;
      }

      return `/NEP17tokeninfo/${hash}`;
    },

    assetKey(asset) {
      return `${this.assetHash(asset)}-${this.assetDisplayName(asset)}-${this.assetBalance(asset)}`;
    },

    copyAddress() {
      if (this.address) {
        navigator.clipboard.writeText(this.address);
      }
    },

    formatAge,
    truncateHash,

    formatNumber(value) {
      return Number(value || 0).toLocaleString();
    },

    formatBalanceValue(value) {
      const num = Number(value || 0);
      if (!Number.isFinite(num)) {
        return String(value || "0");
      }

      return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
    },
  },
};
</script>

<style scoped>
.info-card {
  @apply rounded-lg border border-card-border bg-white p-4 shadow-sm dark:border-card-border-dark dark:bg-gray-900;
}

.info-label {
  @apply mb-1 text-sm text-text-secondary dark:text-gray-400;
}

.info-value {
  @apply text-xl font-semibold text-text-primary dark:text-gray-100;
}
</style>
