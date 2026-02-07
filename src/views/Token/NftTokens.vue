<template>
  <div class="etherscan-card overflow-hidden">
    <div v-if="isLoading" class="space-y-2 p-4">
      <Skeleton v-for="i in 5" :key="i" height="40px" />
    </div>

    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[800px]">
          <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Image</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Name</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Token ID</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">
                Holder
                <button class="btn-mini ml-1" @click="changeFormat(button)">
                  {{ button.buttonName }}
                </button>
              </th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">Description</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
            <tr
              v-for="(item, index) in tableData"
              :key="item.tokenid + index"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
            >
              <!-- Image -->
              <td class="px-4 py-3">
                <img
                  v-if="item.image"
                  :src="item.image"
                  alt="NFT"
                  class="h-16 w-16 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
                  loading="lazy"
                  @error="$event.target.style.display = 'none'"
                />
                <div
                  v-else
                  class="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-text-muted dark:bg-gray-700"
                >
                  No Image
                </div>
              </td>
              <!-- Name -->
              <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">
                {{ item.nftname || "—" }}
              </td>
              <!-- Token ID -->
              <td class="px-4 py-3">
                <div class="max-w-[140px] truncate">
                  <router-link
                    :to="'/NFTinfo/' + item.asset + '/' + item.address + '/' + base64ToHash(item.tokenid)"
                    class="font-hash text-sm etherscan-link"
                  >
                    {{ item.tokenid }}
                  </router-link>
                </div>
              </td>
              <!-- Holder -->
              <td class="px-4 py-3">
                <div class="max-w-[180px] truncate">
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
              <!-- Description -->
              <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">
                <div class="max-w-[200px] truncate">{{ item.description || "No description" }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="tableData.length === 0" class="p-4">
        <EmptyState title="No NFT tokens found" />
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
import { scriptHashToAddress, changeFormat } from "@/store/util";
import Neon from "@cityofzion/neon-js";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";

export default {
  name: "nft-token",
  props: {
    contractHash: String,
    decimal: Number,
  },
  components: {
    EtherscanPagination,
    Skeleton,
    EmptyState,
  },
  data() {
    return {
      tableData: [],
      totalCount: 0,
      resultsPerPage: 10,
      pagination: 1,
      isLoading: true,
      countPage: 0,
      button: { state: true, buttonName: "Hash" },
    };
  },
  created() {
    this.GetAssetHoldersByContractHash(0);
  },
  watch: {
    contractHash: "watchcontract",
  },
  methods: {
    changeFormat,
    scriptHashToAddress,
    watchcontract() {
      this.GetAssetHoldersByContractHash(0);
    },
    handleCurrentChange(val) {
      this.isLoading = true;
      this.pagination = val;
      this.GetAssetHoldersByContractHash((val - 1) * this.resultsPerPage);
    },
    base64ToHash(base) {
      return Neon.u.base642hex(base);
    },
    async GetAssetHoldersByContractHash(skip) {
      try {
        const { result, totalCount } = await tokenService.getNftHoldersList(
          this.contractHash,
          this.resultsPerPage,
          skip
        );
        this.tableData = result;
        this.totalCount = totalCount;
        this.countPage = totalCount === 0 ? 1 : Math.ceil(totalCount / this.resultsPerPage);
        this.fetchNftProperties();
      } catch {
        this.isLoading = false;
      }
    },
    fetchNftProperties() {
      if (this.tableData.length === 0) {
        this.isLoading = false;
        return;
      }
      let pending = this.tableData.length;
      for (let k = 0; k < this.tableData.length; k++) {
        tokenService
          .getNep11Properties(this.tableData[k]["asset"], [this.tableData[k]["tokenid"]])
          .then((result) => {
            const value = result?.result?.[0];
            if (value) {
              this.tableData[k]["nftname"] = value["name"] || "—";
              if (value["image"]) {
                this.tableData[k]["image"] = value["image"].startsWith("ipfs")
                  ? value["image"].replace(/^(ipfs:\/\/)|^(ipfs-video:\/\/)/, "https://ipfs.infura.io/ipfs/")
                  : value["image"];
              }
              if (value["description"]) {
                this.tableData[k]["description"] = value["description"];
              }
            }
          })
          .finally(() => {
            pending--;
            if (pending === 0) this.isLoading = false;
          });
      }
    },
  },
};
</script>
