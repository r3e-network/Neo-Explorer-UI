<template>
  <div class="etherscan-card overflow-hidden">
    <div v-if="isLoading" class="space-y-2 p-4">
      <Skeleton v-for="i in 5" :key="i" height="40px" />
    </div>

    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[750px]">
          <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Txn Hash</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Event Name</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">VM State</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Index</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">
                Time
                <button class="btn-mini ml-1" @click="switchTime(time)">Format</button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
            <tr
              v-for="item in contractList"
              :key="item.txid + item.eventname"
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
              <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">
                {{ item.eventname }}
              </td>
              <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">
                {{ item.Vmstate }}
              </td>
              <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">
                {{ item.index }}
              </td>
              <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">
                {{ time.state ? convertTime(item.timestamp) : convertISOTime(item.timestamp) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="contractList.length === 0" class="p-4">
        <EmptyState title="No events found" />
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
import { convertTime, convertISOTime, switchTime } from "@/store/util";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";

export default {
  name: "events-table",
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
      time: { state: true },
      contractList: [],
      totalCount: 0,
      resultsPerPage: 10,
      pagination: 1,
      isLoading: true,
      countPage: 0,
    };
  },
  created() {
    this.getContractList(0);
  },
  watch: {
    contractHash: "watchcontract",
  },
  methods: {
    convertISOTime,
    switchTime,
    convertTime,
    watchcontract() {
      this.getContractList(0);
    },
    handleCurrentChange(val) {
      this.isLoading = true;
      this.pagination = val;
      const skip = (val - 1) * this.resultsPerPage;
      this.getContractList(skip);
    },
    async getContractList(skip) {
      const { result, totalCount } = await contractService.getNotifications(
        this.contractHash,
        this.resultsPerPage,
        skip
      );
      this.contractList = result;
      this.totalCount = totalCount;
      this.countPage = totalCount === 0 ? 1 : Math.ceil(totalCount / this.resultsPerPage);
      this.isLoading = false;
    },
  },
};
</script>
