<template>
  <div class="address-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <!-- Breadcrumb -->
      <Breadcrumb
        :items="[{ label: 'Home', to: '/homepage' }, { label: 'Addresses', to: '/account/1' }, { label: truncateAddr }]"
      />

      <!-- Address header -->
      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-orange-100 text-orange-500 dark:bg-orange-900/40 dark:text-orange-400">
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="page-title">Address</h1>
            <span
              v-if="isContract"
              class="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
            >
              Contract
            </span>
          </div>
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="font-hash break-all text-sm text-text-secondary dark:text-gray-400">{{ address }}</span>
            <CopyButton :text="address" />
            <button
              class="p-1 text-gray-400 transition-colors hover:text-primary-500 dark:text-gray-500 dark:hover:text-primary-400"
              title="Show QR Code"
              aria-label="Toggle QR code display"
              @click="showQr = !showQr"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 14h1v1h-1zM14 17h1v1h-1zM20 17h1v1h-1zM17 20h1v1h-1z"
                />
              </svg>
            </button>
          </div>
          <!-- QR code placeholder -->
          <div
            v-if="showQr"
            class="mt-2 inline-block rounded-lg border border-card-border bg-white p-4 dark:border-card-border-dark dark:bg-gray-800"
          >
            <div class="flex flex-col items-center gap-2">
              <svg
                class="h-16 w-16 text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 14h1v1h-1zM14 17h1v1h-1zM20 17h1v1h-1zM17 20h1v1h-1z"
                />
              </svg>
              <p class="max-w-[200px] break-all text-center font-hash text-xs text-text-secondary dark:text-gray-400">
                {{ address }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Balance overview cards -->
      <div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="stat-card">
          <p class="stat-label">NEO Balance</p>
          <p class="stat-value">{{ formatBalanceValue(neoBalance) }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">GAS Balance</p>
          <p class="stat-value">{{ formatGasDisplay(gasBalance) }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Transactions</p>
          <p class="stat-value">{{ formatNumber(txCount) }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Token Holdings</p>
          <p class="stat-value">{{ formatNumber(tokenCount) }}</p>
        </div>
      </div>

      <div class="etherscan-card">
        <div class="card-header">
          <nav class="flex flex-wrap" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              role="tab"
              :aria-selected="activeTab === tab.key"
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

        <div class="p-4 md:p-5">
          <section v-if="activeTab === 'transactions'">
            <div v-if="transactionsLoading" class="space-y-2">
              <Skeleton v-for="index in 6" :key="index" height="46px" />
            </div>

            <ErrorState
              v-else-if="transactionsError"
              title="Unable to load transactions"
              :message="transactionsError"
              @retry="loadTxPage(1)"
            />

            <EmptyState
              v-else-if="!transactions.length"
              message="No transactions found"
              description="This address has no indexed transaction history yet."
            />

            <div v-else class="space-y-4">
              <div class="flex items-center justify-between">
                <p class="text-sm text-text-secondary dark:text-gray-400">
                  Latest {{ transactions.length }} from a total of
                  <span class="font-medium text-text-primary dark:text-gray-300">{{ formatNumber(txTotalCount) }}</span>
                  transactions
                </p>
                <button class="btn-outline flex items-center gap-1 px-2.5 py-1.5 text-xs" @click="exportCsv">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  CSV Export
                </button>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[900px]">
                  <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
                    <tr>
                      <th class="table-header-cell">Txn Hash</th>
                      <th class="table-header-cell">Method</th>
                      <th class="table-header-cell">Block</th>
                      <th class="table-header-cell">Age</th>
                      <th class="table-header-cell">From</th>
                      <th class="w-12 px-2 py-3 text-center font-medium text-text-secondary dark:text-gray-400"></th>
                      <th class="table-header-cell">To</th>
                      <th class="table-header-cell-right">Value</th>
                      <th class="table-header-cell-right">Txn Fee</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                    <tr
                      v-for="tx in transactions"
                      :key="tx.hash"
                      class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td class="table-cell">
                        <router-link
                          :to="`/transaction-info/${tx.hash}`"
                          :title="tx.hash"
                          class="font-hash text-sm etherscan-link"
                        >
                          {{ truncateHash(tx.hash, 10, 6) }}
                        </router-link>
                      </td>
                      <td class="table-cell">
                        <span
                          class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {{ getTxMethod(tx) }}
                        </span>
                      </td>
                      <td class="table-cell">
                        <router-link
                          v-if="tx.blockIndex"
                          :to="`/block-info/${tx.blockIndex}`"
                          class="text-sm etherscan-link"
                        >
                          {{ formatNumber(tx.blockIndex) }}
                        </router-link>
                        <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
                      </td>
                      <td class="table-cell-secondary">
                        {{ formatAge(tx.blocktime) }}
                      </td>
                      <td class="table-cell">
                        <router-link
                          v-if="tx.sender && tx.sender !== address"
                          :to="`/account-profile/${tx.sender}`"
                          class="font-hash text-sm etherscan-link"
                        >
                          {{ truncateHash(tx.sender, 8, 6) }}
                        </router-link>
                        <span v-else-if="tx.sender" class="font-hash text-sm text-text-primary dark:text-gray-300">
                          {{ truncateHash(tx.sender, 8, 6) }}
                        </span>
                        <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
                      </td>
                      <td class="px-2 py-3 text-center">
                        <span
                          class="inline-block min-w-[40px] rounded-full px-2 py-0.5 text-xs font-semibold"
                          :class="getDirection(tx.sender, '').cssClass"
                        >
                          {{ getDirection(tx.sender, "").label }}
                        </span>
                      </td>
                      <td class="table-cell">
                        <span class="font-hash text-sm text-text-primary dark:text-gray-300">
                          {{ truncateHash(address, 8, 6) }}
                        </span>
                      </td>
                      <td class="table-cell text-right">
                        {{ formatTxValue(tx) }}
                      </td>
                      <td class="table-cell-secondary text-right">
                        {{ formatTxFee(tx) }}
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

          <section v-else-if="activeTab === 'tokenTransfers'">
            <div v-if="nep17Loading" class="space-y-2">
              <Skeleton v-for="index in 6" :key="index" height="46px" />
            </div>

            <ErrorState
              v-else-if="nep17Error"
              title="Unable to load token transfers"
              :message="nep17Error"
              @retry="loadNep17Transfers(1)"
            />

            <EmptyState
              v-else-if="!nep17Transfers.length"
              message="No token transfers found"
              description="No NEP-17 transfer records were found for this address."
            />

            <div v-else class="space-y-4">
              <p class="text-sm text-text-secondary dark:text-gray-400">
                Latest {{ nep17Transfers.length }} NEP-17 token transfers
              </p>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[850px]">
                  <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
                    <tr>
                      <th class="table-header-cell">Txn Hash</th>
                      <th class="table-header-cell">Age</th>
                      <th class="table-header-cell">From</th>
                      <th class="w-12 px-2 py-3 text-center font-medium text-text-secondary dark:text-gray-400"></th>
                      <th class="table-header-cell">To</th>
                      <th class="table-header-cell-right">Amount</th>
                      <th class="table-header-cell">Token</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                    <tr
                      v-for="(transfer, idx) in nep17Transfers"
                      :key="`nep17-${transfer.txHash}-${idx}`"
                      class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td class="table-cell">
                        <router-link
                          :to="`/transaction-info/${transfer.txHash}`"
                          :title="transfer.txHash"
                          class="font-hash text-sm etherscan-link"
                        >
                          {{ truncateHash(transfer.txHash, 10, 6) }}
                        </router-link>
                      </td>
                      <td class="table-cell-secondary">
                        {{ formatAge(transfer.timestamp) }}
                      </td>
                      <td class="table-cell">
                        <router-link
                          v-if="transfer.from && !isSelf(transfer.from)"
                          :to="`/account-profile/${transfer.from}`"
                          class="font-hash text-sm etherscan-link"
                        >
                          {{ truncateHash(transfer.from, 8, 6) }}
                        </router-link>
                        <span v-else-if="transfer.from" class="font-hash text-sm text-text-primary dark:text-gray-300">
                          {{ truncateHash(transfer.from, 8, 6) }}
                        </span>
                        <span v-else class="text-sm text-gray-400 dark:text-gray-500">Null</span>
                      </td>
                      <td class="px-2 py-3 text-center">
                        <span
                          class="inline-block min-w-[40px] rounded-full px-2 py-0.5 text-xs font-semibold"
                          :class="getDirection(transfer.from, transfer.to).cssClass"
                        >
                          {{ getDirection(transfer.from, transfer.to).label }}
                        </span>
                      </td>
                      <td class="table-cell">
                        <router-link
                          v-if="transfer.to && !isSelf(transfer.to)"
                          :to="`/account-profile/${transfer.to}`"
                          class="font-hash text-sm etherscan-link"
                        >
                          {{ truncateHash(transfer.to, 8, 6) }}
                        </router-link>
                        <span v-else-if="transfer.to" class="font-hash text-sm text-text-primary dark:text-gray-300">
                          {{ truncateHash(transfer.to, 8, 6) }}
                        </span>
                        <span v-else class="text-sm text-gray-400 dark:text-gray-500">Null</span>
                      </td>
                      <td class="table-cell text-right">
                        {{ formatTransferAmount(transfer.amount, transfer.decimals) }}
                      </td>
                      <td class="table-cell">
                        <router-link
                          v-if="transfer.tokenHash"
                          :to="`/nep17-token-info/${transfer.tokenHash}`"
                          class="text-sm etherscan-link"
                        >
                          {{ transfer.tokenName }}
                        </router-link>
                        <span v-else class="table-cell-secondary">
                          {{ transfer.tokenName }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="border-t border-card-border pt-3 dark:border-card-border-dark">
                <EtherscanPagination
                  :page="nep17Page"
                  :total-pages="nep17TotalPages"
                  :page-size="nep17PageSize"
                  :total="nep17TotalCount"
                  @update:page="goToNep17Page"
                  @update:page-size="changeNep17PageSize"
                />
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'nftTransfers'">
            <div v-if="nep11Loading" class="space-y-2">
              <Skeleton v-for="index in 6" :key="index" height="46px" />
            </div>

            <ErrorState
              v-else-if="nep11Error"
              title="Unable to load NFT transfers"
              :message="nep11Error"
              @retry="loadNep11Transfers(1)"
            />

            <EmptyState
              v-else-if="!nep11Transfers.length"
              message="No NFT transfers found"
              description="No NEP-11 transfer records were found for this address."
            />

            <div v-else class="space-y-4">
              <p class="text-sm text-text-secondary dark:text-gray-400">
                Latest {{ nep11Transfers.length }} NEP-11 (NFT) transfers
              </p>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[850px]">
                  <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
                    <tr>
                      <th class="table-header-cell">Txn Hash</th>
                      <th class="table-header-cell">Age</th>
                      <th class="table-header-cell">From</th>
                      <th class="w-12 px-2 py-3 text-center font-medium text-text-secondary dark:text-gray-400"></th>
                      <th class="table-header-cell">To</th>
                      <th class="table-header-cell">Token ID</th>
                      <th class="table-header-cell">Collection</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                    <tr
                      v-for="(transfer, idx) in nep11Transfers"
                      :key="`nep11-${transfer.txHash}-${idx}`"
                      class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td class="table-cell">
                        <router-link
                          :to="`/transaction-info/${transfer.txHash}`"
                          :title="transfer.txHash"
                          class="font-hash text-sm etherscan-link"
                        >
                          {{ truncateHash(transfer.txHash, 12, 8) }}
                        </router-link>
                      </td>
                      <td class="table-cell-secondary">
                        {{ formatAge(transfer.timestamp) }}
                      </td>
                      <td class="table-cell">
                        <router-link
                          v-if="transfer.from"
                          :to="`/account-profile/${transfer.from}`"
                          class="font-hash text-sm etherscan-link"
                        >
                          {{ truncateHash(transfer.from, 10, 6) }}
                        </router-link>
                        <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span
                          class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                          :class="getDirection(transfer.from, transfer.to).cssClass"
                        >
                          {{ getDirection(transfer.from, transfer.to).label }}
                        </span>
                      </td>
                      <td class="table-cell">
                        <router-link
                          v-if="transfer.to"
                          :to="`/account-profile/${transfer.to}`"
                          class="font-hash text-sm etherscan-link"
                        >
                          {{ truncateHash(transfer.to, 10, 6) }}
                        </router-link>
                        <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
                      </td>
                      <td class="table-cell-secondary font-hash">
                        {{ transfer.tokenId ? truncateHash(transfer.tokenId, 8, 4) : "-" }}
                      </td>
                      <td class="table-cell">
                        <router-link
                          v-if="transfer.tokenHash"
                          :to="`/nft-token-info/${transfer.tokenHash}`"
                          class="text-sm etherscan-link"
                        >
                          {{ transfer.tokenName }}
                        </router-link>
                        <span v-else class="table-cell-secondary">{{
                          transfer.tokenName
                        }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="border-t border-card-border pt-3 dark:border-card-border-dark">
                <EtherscanPagination
                  :page="nep11Page"
                  :total-pages="nep11TotalPages"
                  :page-size="nep11PageSize"
                  :total="nep11TotalCount"
                  @update:page="goToNep11Page"
                  @update:page-size="changeNep11PageSize"
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
                    <th class="table-header-cell">Token</th>
                    <th class="table-header-cell">Standard</th>
                    <th class="table-header-cell-right">Balance</th>
                    <th class="table-header-cell-right">Value (USD)</th>
                    <th class="table-header-cell">Contract</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                  <tr
                    v-for="asset in sortedFungibleAssets()"
                    :key="assetKey(asset)"
                    class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td class="table-cell">
                      <div class="flex items-center gap-2">
                        <span
                          class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                          :class="tokenColor(assetDisplayName(asset))"
                        >
                          {{ tokenInitial(assetDisplayName(asset)) }}
                        </span>
                        <span class="text-sm font-medium text-text-primary dark:text-gray-300">
                          {{ assetDisplayName(asset) }}
                        </span>
                      </div>
                    </td>
                    <td class="table-cell-secondary">
                      {{ assetStandard(asset) }}
                    </td>
                    <td class="table-cell text-right">
                      {{ assetBalance(asset) }}
                    </td>
                    <td class="table-cell-secondary text-right italic">-</td>
                    <td class="table-cell">
                      <router-link
                        v-if="assetHash(asset)"
                        :to="assetTokenRoute(asset)"
                        class="font-hash text-sm etherscan-link"
                      >
                        {{ truncateHash(assetHash(asset), 12, 8) }}
                      </router-link>
                      <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-else-if="activeTab === 'nfts'">
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
                    <th class="table-header-cell">Collection</th>
                    <th class="table-header-cell">Standard</th>
                    <th class="table-header-cell-right">Balance</th>
                    <th class="table-header-cell">Contract</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                  <tr
                    v-for="asset in nftAssets"
                    :key="assetKey(asset)"
                    class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td class="table-cell font-medium">
                      {{ assetDisplayName(asset) }}
                    </td>
                    <td class="table-cell-secondary">
                      {{ assetStandard(asset) }}
                    </td>
                    <td class="table-cell text-right">
                      {{ assetBalance(asset) }}
                    </td>
                    <td class="table-cell">
                      <router-link
                        v-if="assetHash(asset)"
                        :to="assetTokenRoute(asset)"
                        class="font-hash text-sm etherscan-link"
                      >
                        {{ truncateHash(assetHash(asset), 12, 8) }}
                      </router-link>
                      <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
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
  getTransferDirection,
  parseTxMethod,
  downloadTransactionsCsv,
  getPageCount,
} from "@/utils/addressDetail";
import { formatAge, truncateHash, formatNumber, formatBalance } from "@/utils/explorerFormat";
import { usePagination } from "@/composables/usePagination";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import CopyButton from "@/components/common/CopyButton.vue";

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

// --- Helper methods (exposed to template) ---
function assetHash(asset) {
  return asset?.hash || asset?.contracthash || asset?.contractHash || asset?.assethash || "";
}

function assetStandard(asset) {
  return String(asset?.standard || asset?.type || "Unknown");
}

function assetDisplayName(asset) {
  return asset?.tokenname || asset?.name || asset?.symbol || "Unknown";
}

function assetBalance(asset) {
  const raw = asset?.balance ?? asset?.amount ?? asset?.quantity ?? asset?.totalbalance;
  if (raw === undefined || raw === null || raw === "") return "-";
  const num = Number(raw);
  if (Number.isFinite(num)) return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
  return String(raw);
}

function assetTokenRoute(asset) {
  const hash = assetHash(asset);
  const standard = assetStandard(asset).toUpperCase();
  if (standard.includes("NEP11")) return `/nft-token-info/${hash}`;
  return `/nep17-token-info/${hash}`;
}

function assetKey(asset) {
  return `${assetHash(asset)}-${assetDisplayName(asset)}-${assetBalance(asset)}`;
}

function getDirection(from, to) {
  return getTransferDirection(from, to, address.value);
}

function getTxMethod(tx) {
  return parseTxMethod(tx);
}

function exportCsv() {
  downloadTransactionsCsv(transactions.value, `txns-${address.value}.csv`);
}

function formatTransferAmount(amount, decimals = 8) {
  const raw = Number(amount || 0);
  if (!Number.isFinite(raw)) return "0";
  const divisor = Math.pow(10, decimals);
  return (raw / divisor).toLocaleString(undefined, { maximumFractionDigits: decimals });
}

function tokenInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}

function tokenColor(name) {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-red-500",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function sortedFungibleAssets() {
  return [...fungibleAssets.value].sort((a, b) => {
    const balA = Number(a?.balance ?? a?.amount ?? 0);
    const balB = Number(b?.balance ?? b?.amount ?? 0);
    return balB - balA;
  });
}

function formatBalanceValue(value) {
  return formatBalance(value, 8);
}

function formatGasDisplay(value) {
  return formatBalance(value, 8);
}

function isSelf(addr) {
  return (addr || "").toLowerCase() === (address.value || "").toLowerCase();
}

function formatTxValue(tx) {
  const val = Number(tx?.value ?? tx?.amount ?? 0);
  if (!val) return "-";
  return val.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function formatTxFee(tx) {
  const net = Number(tx?.netfee || 0);
  const sys = Number(tx?.sysfee || 0);
  const total = net + sys;
  if (!total) return "-";
  const decimals = 8;
  return (total / Math.pow(10, decimals)).toFixed(Math.min(decimals, 6));
}

// --- Initialization ---
async function initializeData(addr) {
  abortController.value?.abort();
  abortController.value = new AbortController();
  txPage.value = 1;
  await Promise.all([loadSummary(addr), loadAssets(addr), loadTxPage(1)]);
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
