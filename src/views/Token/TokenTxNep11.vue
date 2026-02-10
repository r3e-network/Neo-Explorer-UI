<template>
  <div class="etherscan-card overflow-hidden">
    <div v-if="isLoading" class="space-y-2 p-4">
      <Skeleton v-for="i in 5" :key="i" height="40px" />
    </div>

    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px]">
          <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Txn Hash</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Token ID</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">
                From
                <button class="btn-mini ml-1" @click="changeFormat(fromButton)">
                  {{ fromButton.buttonName }}
                </button>
              </th>
              <th class="px-4 py-3 text-center font-medium text-text-secondary">Amount</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">
                To
                <button class="btn-mini ml-1" @click="changeFormat(toButton)">
                  {{ toButton.buttonName }}
                </button>
              </th>
              <th class="px-4 py-3 text-right font-medium text-text-secondary">
                Time
                <button class="btn-mini ml-1" @click="switchTime(time)">Format</button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
            <tr
              v-for="(item, index) in NEP11TxList"
              :key="item.txid + index"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
            >
              <!-- Txn Hash -->
              <td class="px-4 py-3">
                <div class="max-w-[160px] truncate">
                  <span v-if="isNullTx(item.txid)" class="text-sm text-text-muted">System</span>
                  <router-link v-else :to="'/transaction-info/' + item.txid" class="font-hash text-sm etherscan-link">
                    {{ item.txid }}
                  </router-link>
                </div>
              </td>
              <!-- Token ID -->
              <td class="px-4 py-3">
                <div class="max-w-[120px] truncate font-hash text-sm text-text-primary dark:text-gray-300">
                  {{ item.tokenId }}
                </div>
              </td>
              <!-- From -->
              <td class="px-4 py-3">
                <div class="max-w-[160px] truncate">
                  <span v-if="item.from === null" class="text-sm text-text-muted">Null Address</span>
                  <router-link v-else :to="'/account-profile/' + item.from" class="font-hash text-sm etherscan-link">
                    {{ fromButton.state ? scriptHashToAddress(item.from) : item.from }}
                  </router-link>
                </div>
              </td>
              <!-- Amount + Type -->
              <td class="px-4 py-3 text-center">
                <div class="text-sm font-medium text-text-primary dark:text-gray-300">
                  {{ convertToken(item.value, decimal) }}
                </div>
                <div class="mt-0.5">
                  <span class="text-lg text-green-500">&#10230;</span>
                  <span
                    :class="getTypeBadge(item)"
                    class="ml-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                  >
                    {{ getTypeLabel(item) }}
                  </span>
                </div>
              </td>
              <!-- To -->
              <td class="px-4 py-3">
                <div class="max-w-[160px] truncate">
                  <span v-if="item.to === null" class="text-sm text-text-muted">Null Address</span>
                  <router-link v-else :to="'/account-profile/' + item.to" class="font-hash text-sm etherscan-link">
                    {{ toButton.state ? scriptHashToAddress(item.to) : item.to }}
                  </router-link>
                </div>
              </td>
              <!-- Time -->
              <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                {{ time.state ? convertTime(item.timestamp) : convertISOTime(item.timestamp) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="NEP11TxList.length === 0" class="p-4">
        <EmptyState title="No transfers found" />
      </div>
    </template>

    <div v-if="totalCount > resultsPerPage" class="border-t border-card-border px-4 py-3 dark:border-card-border-dark">
      <EtherscanPagination
        :page="parseInt(pagination)"
        :total-pages="countPage"
        :page-size="resultsPerPage"
        :total="totalCount"
        :show-page-size="false"
        @update:page="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script>
import { tokenService } from "@/services";
import { convertToken, scriptHashToAddress, convertISOTime, switchTime, changeFormat, convertTime } from "@/store/util";
import Neon from "@cityofzion/neon-js";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";

const NULL_TX = "0x0000000000000000000000000000000000000000000000000000000000000000";

export default {
  name: "tokens-tx-nep11",
  props: {
    contractHash: String,
    decimal: Number,
    tokenId: String,
  },
  components: {
    EtherscanPagination,
    Skeleton,
    EmptyState,
  },
  data() {
    return {
      time: { state: true },
      NEP11TxList: [],
      totalCount: 0,
      resultsPerPage: 10,
      pagination: 1,
      isLoading: true,
      countPage: 0,
      fromButton: { state: true, buttonName: "Hash" },
      toButton: { state: true, buttonName: "Hash" },
    };
  },
  created() {
    this.getTokenList(0);
  },
  watch: {
    contractHash: "watchcontract",
  },
  methods: {
    convertToken,
    convertISOTime,
    switchTime,
    scriptHashToAddress,
    changeFormat,
    convertTime,
    isNullTx(txid) {
      return txid === NULL_TX;
    },
    getTypeLabel(item) {
      if (item.from === null) return "Mint";
      if (item.to === null) return "Burn";
      return "Transfer";
    },
    getTypeBadge(item) {
      const label = this.getTypeLabel(item);
      const map = {
        Mint: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        Burn: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        Transfer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      };
      return map[label] || "";
    },
    watchcontract() {
      this.getTokenList(0);
    },
    handleCurrentChange(val) {
      this.isLoading = true;
      this.pagination = val;
      this.getTokenList((val - 1) * this.resultsPerPage);
    },
    hashToBase64(hash) {
      return Neon.u.hex2base64(hash);
    },
    getTokenList(skip) {
      tokenService
        .getNep11TransfersByTokenId(this.contractHash, this.hashToBase64(this.tokenId), this.resultsPerPage, skip)
        .then((res) => {
          this.NEP11TxList = res?.result || [];
          this.totalCount = res?.totalCount || 0;
          this.countPage = this.totalCount === 0 ? 1 : Math.ceil(this.totalCount / this.resultsPerPage);
          this.isLoading = false;
        })
        .catch(() => {
          this.isLoading = false;
        });
    },
  },
};
</script>
