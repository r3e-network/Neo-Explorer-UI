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
              <div class="flex items-center justify-end">
                <button
                  class="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                  @click="exportCsv"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download CSV Export
                </button>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[760px]">
                  <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
                    <tr>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Txn Hash</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Method</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Age</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Sender</th>
                      <th class="px-4 py-3 text-center font-medium text-text-secondary">Dir</th>
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
                          :to="`/transaction-info/${tx.hash}`"
                          :title="tx.hash"
                          class="font-mono text-sm etherscan-link"
                        >
                          {{ truncateHash(tx.hash, 12, 8) }}
                        </router-link>
                      </td>
                      <td class="px-4 py-3">
                        <span
                          class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {{ getTxMethod(tx) }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-sm text-text-secondary dark:text-gray-400">
                        {{ formatAge(tx.blocktime) }}
                      </td>
                      <td class="px-4 py-3">
                        <router-link
                          v-if="tx.sender"
                          :to="`/account-profile/${tx.sender}`"
                          class="font-mono text-sm text-text-primary hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400"
                        >
                          {{ truncateHash(tx.sender, 10, 6) }}
                        </router-link>
                        <span v-else class="text-sm text-gray-400">-</span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span
                          class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                          :class="getDirection(tx.sender, '').cssClass"
                        >
                          {{ getDirection(tx.sender, "").label }}
                        </span>
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
              <div class="overflow-x-auto">
                <table class="w-full min-w-[800px]">
                  <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
                    <tr>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Txn Hash</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Age</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">From</th>
                      <th class="px-4 py-3 text-center font-medium text-text-secondary">Dir</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">To</th>
                      <th class="px-4 py-3 text-right font-medium text-text-secondary">Amount</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Token</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                    <tr
                      v-for="(transfer, idx) in nep17Transfers"
                      :key="`nep17-${transfer.txHash}-${idx}`"
                      class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td class="px-4 py-3">
                        <router-link
                          :to="`/transaction-info/${transfer.txHash}`"
                          :title="transfer.txHash"
                          class="font-mono text-sm etherscan-link"
                        >
                          {{ truncateHash(transfer.txHash, 12, 8) }}
                        </router-link>
                      </td>
                      <td class="px-4 py-3 text-sm text-text-secondary dark:text-gray-400">
                        {{ formatAge(transfer.timestamp) }}
                      </td>
                      <td class="px-4 py-3">
                        <router-link
                          v-if="transfer.from"
                          :to="`/account-profile/${transfer.from}`"
                          class="font-mono text-sm text-text-primary hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400"
                        >
                          {{ truncateHash(transfer.from, 10, 6) }}
                        </router-link>
                        <span v-else class="text-sm text-gray-400">-</span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span
                          class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                          :class="getDirection(transfer.from, transfer.to).cssClass"
                        >
                          {{ getDirection(transfer.from, transfer.to).label }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <router-link
                          v-if="transfer.to"
                          :to="`/account-profile/${transfer.to}`"
                          class="font-mono text-sm text-text-primary hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400"
                        >
                          {{ truncateHash(transfer.to, 10, 6) }}
                        </router-link>
                        <span v-else class="text-sm text-gray-400">-</span>
                      </td>
                      <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                        {{ formatTransferAmount(transfer.amount, transfer.decimals) }}
                      </td>
                      <td class="px-4 py-3">
                        <router-link
                          v-if="transfer.tokenHash"
                          :to="`/nep17-token-info/${transfer.tokenHash}`"
                          class="text-sm etherscan-link"
                        >
                          {{ transfer.tokenName }}
                        </router-link>
                        <span v-else class="text-sm text-text-secondary dark:text-gray-400">{{
                          transfer.tokenName
                        }}</span>
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
              <div class="overflow-x-auto">
                <table class="w-full min-w-[800px]">
                  <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
                    <tr>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Txn Hash</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Age</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">From</th>
                      <th class="px-4 py-3 text-center font-medium text-text-secondary">Dir</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">To</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Token ID</th>
                      <th class="px-4 py-3 text-left font-medium text-text-secondary">Collection</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                    <tr
                      v-for="(transfer, idx) in nep11Transfers"
                      :key="`nep11-${transfer.txHash}-${idx}`"
                      class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td class="px-4 py-3">
                        <router-link
                          :to="`/transaction-info/${transfer.txHash}`"
                          :title="transfer.txHash"
                          class="font-mono text-sm etherscan-link"
                        >
                          {{ truncateHash(transfer.txHash, 12, 8) }}
                        </router-link>
                      </td>
                      <td class="px-4 py-3 text-sm text-text-secondary dark:text-gray-400">
                        {{ formatAge(transfer.timestamp) }}
                      </td>
                      <td class="px-4 py-3">
                        <router-link
                          v-if="transfer.from"
                          :to="`/account-profile/${transfer.from}`"
                          class="font-mono text-sm text-text-primary hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400"
                        >
                          {{ truncateHash(transfer.from, 10, 6) }}
                        </router-link>
                        <span v-else class="text-sm text-gray-400">-</span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span
                          class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                          :class="getDirection(transfer.from, transfer.to).cssClass"
                        >
                          {{ getDirection(transfer.from, transfer.to).label }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <router-link
                          v-if="transfer.to"
                          :to="`/account-profile/${transfer.to}`"
                          class="font-mono text-sm text-text-primary hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400"
                        >
                          {{ truncateHash(transfer.to, 10, 6) }}
                        </router-link>
                        <span v-else class="text-sm text-gray-400">-</span>
                      </td>
                      <td class="px-4 py-3 font-mono text-sm text-text-secondary dark:text-gray-400">
                        {{ transfer.tokenId ? truncateHash(transfer.tokenId, 8, 4) : "-" }}
                      </td>
                      <td class="px-4 py-3">
                        <router-link
                          v-if="transfer.tokenHash"
                          :to="`/nft-token-info/${transfer.tokenHash}`"
                          class="text-sm etherscan-link"
                        >
                          {{ transfer.tokenName }}
                        </router-link>
                        <span v-else class="text-sm text-text-secondary dark:text-gray-400">{{
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
                    <th class="px-4 py-3 text-left font-medium text-text-secondary">Token</th>
                    <th class="px-4 py-3 text-left font-medium text-text-secondary">Standard</th>
                    <th class="px-4 py-3 text-right font-medium text-text-secondary">Balance</th>
                    <th class="px-4 py-3 text-right font-medium text-text-secondary">Value (USD)</th>
                    <th class="px-4 py-3 text-left font-medium text-text-secondary">Contract</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                  <tr
                    v-for="asset in sortedFungibleAssets()"
                    :key="assetKey(asset)"
                    class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td class="px-4 py-3">
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
                    <td class="px-4 py-3 text-sm text-text-secondary dark:text-gray-400">
                      {{ assetStandard(asset) }}
                    </td>
                    <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                      {{ assetBalance(asset) }}
                    </td>
                    <td class="px-4 py-3 text-right text-sm text-gray-400 italic">-</td>
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
  normalizeNep17Transfers,
  normalizeNep11Transfers,
  getTransferDirection,
  parseTxMethod,
  downloadTransactionsCsv,
  getPageCount,
} from "@/utils/addressDetail";
import { formatAge, truncateHash, formatNumber } from "@/utils/explorerFormat";
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

      // NEP-17 Token Transfers
      nep17Transfers: [],
      nep17Loading: false,
      nep17Error: "",
      nep17Page: 1,
      nep17PageSize: 10,
      nep17TotalCount: 0,
      nep17TotalPages: 1,

      // NEP-11 NFT Transfers
      nep11Transfers: [],
      nep11Loading: false,
      nep11Error: "",
      nep11Page: 1,
      nep11PageSize: 10,
      nep11TotalCount: 0,
      nep11TotalPages: 1,
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
    activeTab: {
      handler(tab) {
        if (tab === "tokenTransfers" && !this.nep17Transfers.length && !this.nep17Loading) {
          this.loadNep17Transfers(1);
        }
        if (tab === "nftTransfers" && !this.nep11Transfers.length && !this.nep11Loading) {
          this.loadNep11Transfers(1);
        }
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

    async loadNep17Transfers(page = 1, address = this.address) {
      if (!address) return;
      this.nep17Loading = true;
      this.nep17Error = "";
      try {
        const safePage = Math.max(1, Number(page) || 1);
        const skip = (safePage - 1) * this.nep17PageSize;
        const response = await accountService.getNep17Transfers(address, this.nep17PageSize, skip);
        this.nep17Transfers = normalizeNep17Transfers(response?.result || []);
        this.nep17TotalCount = Number(response?.totalCount || 0);
        this.nep17TotalPages = getPageCount(this.nep17TotalCount, this.nep17PageSize);
        this.nep17Page = safePage > this.nep17TotalPages ? this.nep17TotalPages : safePage;
      } catch {
        this.nep17Transfers = [];
        this.nep17TotalCount = 0;
        this.nep17TotalPages = 1;
        this.nep17Error = "Failed to load token transfers. Please try again.";
      } finally {
        this.nep17Loading = false;
      }
    },

    goToNep17Page(page) {
      if (page < 1 || page > this.nep17TotalPages || page === this.nep17Page) return;
      this.loadNep17Transfers(page);
    },

    changeNep17PageSize(size) {
      this.nep17PageSize = size;
      this.loadNep17Transfers(1);
    },

    async loadNep11Transfers(page = 1, address = this.address) {
      if (!address) return;
      this.nep11Loading = true;
      this.nep11Error = "";
      try {
        const safePage = Math.max(1, Number(page) || 1);
        const skip = (safePage - 1) * this.nep11PageSize;
        const response = await accountService.getNep11Transfers(address, this.nep11PageSize, skip);
        this.nep11Transfers = normalizeNep11Transfers(response?.result || []);
        this.nep11TotalCount = Number(response?.totalCount || 0);
        this.nep11TotalPages = getPageCount(this.nep11TotalCount, this.nep11PageSize);
        this.nep11Page = safePage > this.nep11TotalPages ? this.nep11TotalPages : safePage;
      } catch {
        this.nep11Transfers = [];
        this.nep11TotalCount = 0;
        this.nep11TotalPages = 1;
        this.nep11Error = "Failed to load NFT transfers. Please try again.";
      } finally {
        this.nep11Loading = false;
      }
    },

    goToNep11Page(page) {
      if (page < 1 || page > this.nep11TotalPages || page === this.nep11Page) return;
      this.loadNep11Transfers(page);
    },

    changeNep11PageSize(size) {
      this.nep11PageSize = size;
      this.loadNep11Transfers(1);
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
        return `/nft-token-info/${hash}`;
      }

      return `/nep17-token-info/${hash}`;
    },

    assetKey(asset) {
      return `${this.assetHash(asset)}-${this.assetDisplayName(asset)}-${this.assetBalance(asset)}`;
    },

    copyAddress() {
      if (this.address) {
        navigator.clipboard.writeText(this.address);
      }
    },

    getDirection(from, to) {
      return getTransferDirection(from, to, this.address);
    },

    getTxMethod(tx) {
      return parseTxMethod(tx);
    },

    exportCsv() {
      downloadTransactionsCsv(this.transactions, `txns-${this.address}.csv`);
    },

    formatTransferAmount(amount, decimals = 8) {
      const raw = Number(amount || 0);
      if (!Number.isFinite(raw)) return "0";
      const divisor = Math.pow(10, decimals);
      return (raw / divisor).toLocaleString(undefined, { maximumFractionDigits: decimals });
    },

    tokenInitial(name) {
      return (name || "?").charAt(0).toUpperCase();
    },

    tokenColor(name) {
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
    },

    sortedFungibleAssets() {
      return [...this.fungibleAssets].sort((a, b) => {
        const balA = Number(a?.balance ?? a?.amount ?? 0);
        const balB = Number(b?.balance ?? b?.amount ?? 0);
        return balB - balA;
      });
    },

    formatAge,
    truncateHash,

    formatNumber,

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
