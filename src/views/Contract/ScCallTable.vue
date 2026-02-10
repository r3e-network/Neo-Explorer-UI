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
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Txn Hash</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">
                Sender
                <button class="btn-mini ml-1" @click="changeFormat(button)">
                  {{ button.buttonName }}
                </button>
              </th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Method</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Call Flags</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
            <tr
              v-for="item in ScCallList"
              :key="item.txid + item.method"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
            >
              <td class="px-4 py-3">
                <div class="max-w-[200px] truncate">
                  <span
                    v-if="item.txid === '0x0000000000000000000000000000000000000000000000000000000000000000'"
                    class="text-sm text-text-muted"
                  >
                    Null Transaction
                  </span>
                  <router-link v-else :to="'/transaction-info/' + item.txid" class="font-hash text-sm etherscan-link">
                    {{ item.txid }}
                  </router-link>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="max-w-[200px] truncate">
                  <span v-if="item.originSender === null" class="text-sm text-text-muted">Null Address</span>
                  <router-link
                    v-else
                    :to="'/account-profile/' + item.originSender"
                    class="font-hash text-sm etherscan-link"
                  >
                    {{ button.state ? scriptHashToAddress(item.originSender) : item.originSender }}
                  </router-link>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">
                {{ item.method }}
              </td>
              <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">
                {{ item.callFlags }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="ScCallList.length === 0" class="p-4">
        <EmptyState title="No contract calls found" />
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
import { contractService } from "@/services";
import { scriptHashToAddress, changeFormat } from "@/store/util";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";

export default {
  name: "sc-call-table",
  props: {
    contractHash: String,
  },
  components: {
    EtherscanPagination,
    Skeleton,
    EmptyState,
  },
  data() {
    return {
      ScCallList: [],
      totalCount: 0,
      resultsPerPage: 10,
      pagination: 1,
      isLoading: true,
      countPage: 0,
      button: { state: true, buttonName: "Hash" },
    };
  },
  created() {
    this.getScCallList(0);
  },
  watch: {
    contractHash: "watchcontract",
  },
  methods: {
    scriptHashToAddress,
    changeFormat,
    watchcontract() {
      this.getScCallList(0);
    },
    handleCurrentChange(val) {
      this.isLoading = true;
      this.pagination = val;
      const skip = (val - 1) * this.resultsPerPage;
      this.getScCallList(skip);
    },
    async getScCallList(skip) {
      const { result, totalCount } = await contractService.getScCalls(this.contractHash, this.resultsPerPage, skip);
      this.ScCallList = result;
      this.totalCount = totalCount;
      this.countPage = totalCount === 0 ? 1 : Math.ceil(totalCount / this.resultsPerPage);
      this.isLoading = false;
    },
  },
};
</script>
