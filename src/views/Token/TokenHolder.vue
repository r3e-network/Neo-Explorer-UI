<template>
  <div class="etherscan-card overflow-hidden">
    <div v-if="isLoading" class="space-y-2 p-4">
      <Skeleton v-for="i in 5" :key="i" height="40px" />
    </div>

    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px]">
          <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Rank</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">
                Address
                <button class="btn-mini ml-1" @click="changeFormat(button)">
                  {{ button.buttonName }}
                </button>
              </th>
              <th class="px-4 py-3 text-right font-medium text-text-secondary">Balance</th>
              <th class="px-4 py-3 text-right font-medium text-text-secondary">Percentage</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
            <tr
              v-for="(item, index) in NEP17TxList"
              :key="item.address"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
            >
              <td class="px-4 py-3 text-sm text-text-muted">
                <span v-if="rankIndex(index) <= 3" class="font-medium">
                  {{ rankIndex(index) }}
                  <span v-if="rankIndex(index) === 1">&#129351;</span>
                  <span v-else-if="rankIndex(index) === 2">&#129352;</span>
                  <span v-else>&#129353;</span>
                </span>
                <span v-else>{{ rankIndex(index) }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="max-w-[220px] truncate">
                  <span
                    v-if="item.address === '0x0000000000000000000000000000000000000000'"
                    class="text-sm text-text-muted"
                  >
                    Null Address
                  </span>
                  <router-link v-else :to="'/accountprofile/' + item.address" class="font-hash text-sm etherscan-link">
                    {{ button.state ? scriptHashToAddress(item.address) : item.address }}
                  </router-link>
                </div>
              </td>
              <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                {{ formatBalance ? convertToken(item.balance, decimal) : item.balance }}
              </td>
              <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                {{ toPercentage(item.percentage) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="NEP17TxList.length === 0" class="p-4">
        <EmptyState title="No holders found" />
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
import { convertToken, scriptHashToAddress, changeFormat } from "@/store/util";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";

export default {
  name: "token-holder",
  props: {
    contractHash: String,
    decimal: Number,
    formatBalance: { type: Boolean, default: true },
  },
  components: {
    EtherscanPagination,
    Skeleton,
    EmptyState,
  },
  data() {
    return {
      NEP17TxList: [],
      totalCount: 0,
      resultsPerPage: 10,
      pagination: 1,
      isLoading: true,
      countPage: 0,
      button: { state: true, buttonName: "Hash" },
    };
  },
  created() {
    this.getTokenList(0);
  },
  watch: {
    contractHash: "watchcontract",
  },
  methods: {
    changeFormat,
    convertToken,
    scriptHashToAddress,
    watchcontract() {
      this.getTokenList(0);
    },
    rankIndex(index) {
      return index + (this.pagination - 1) * this.resultsPerPage + 1;
    },
    handleCurrentChange(val) {
      this.isLoading = true;
      this.pagination = val;
      this.getTokenList((this.pagination - 1) * this.resultsPerPage);
    },
    toPercentage(num) {
      return Number(num * 100).toFixed(2) + "%";
    },
    getTokenList(skip) {
      tokenService
        .getHolders(this.contractHash, this.resultsPerPage, skip)
        .then((res) => {
          this.NEP17TxList = res?.result || [];
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
