<template>
  <div class="mx-auto max-w-[1400px] px-4 py-6">
    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <Skeleton height="40px" />
      <div class="etherscan-card p-6">
        <Skeleton v-for="i in 8" :key="i" height="24px" class="mb-3" />
      </div>
    </div>

    <template v-else>
      <!-- Page Title -->
      <div class="mb-6 flex items-center gap-3">
        <h1 class="text-xl font-semibold text-text-primary dark:text-white">Token Detail</h1>
        <span
          v-if="updateCounter === -1"
          class="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
        >
          Destroyed
        </span>
        <button class="btn-outline ml-auto" @click="getContract(token_info['hash'])">View Contract</button>
      </div>

      <!-- Overview Card -->
      <div class="etherscan-card mb-6">
        <div class="border-b border-card-border px-4 py-3 dark:border-card-border-dark">
          <h2 class="text-sm font-semibold text-text-primary dark:text-white">Overview</h2>
        </div>

        <!-- Token Image -->
        <div v-if="hasTokenImage" class="border-b border-card-border px-4 py-3 dark:border-card-border-dark">
          <img :src="image" alt="Token" class="h-16 w-16 rounded-lg object-contain" />
        </div>

        <div class="divide-y divide-card-border dark:divide-card-border-dark">
          <!-- Name -->
          <div class="info-row">
            <div class="info-label">Name</div>
            <div class="info-value">
              {{ token_info["tokenname"] }}
              <span v-if="token_info.ispopular" class="ml-1">&#x1F525;</span>
            </div>
          </div>
          <!-- Hash -->
          <div class="info-row">
            <div class="info-label">Hash</div>
            <div class="info-value flex items-center gap-2">
              <span class="font-hash text-primary-500 break-all">{{ token_info["hash"] }}</span>
              <button
                class="shrink-0 text-gray-400 hover:text-primary-500 transition-colors"
                title="Copy to clipboard"
                @click="copyHash(token_info['hash'])"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <span v-if="copied" class="text-xs text-green-500">Copied!</span>
            </div>
          </div>
          <!-- Symbol -->
          <div class="info-row">
            <div class="info-label">Symbol</div>
            <div class="info-value">{{ token_info["symbol"] }}</div>
          </div>
          <!-- Decimals -->
          <div class="info-row">
            <div class="info-label">Decimals</div>
            <div class="info-value">{{ token_info["decimals"] }}</div>
          </div>
          <!-- Standard -->
          <div class="info-row">
            <div class="info-label">Standard</div>
            <div class="info-value">NEP-{{ token_info["type"] }}</div>
          </div>
          <!-- First Transfer -->
          <div class="info-row">
            <div class="info-label">First Transfer</div>
            <div class="info-value">
              <span v-if="token_info.firsttransfertime">
                {{ convertPreciseTime(token_info["firsttransfertime"]) }}
              </span>
              <span v-else class="text-text-muted">—</span>
            </div>
          </div>
          <!-- Total Supply -->
          <div class="info-row">
            <div class="info-label">Total Supply</div>
            <div class="info-value">{{ convertToken(token_info["totalsupply"], decimal) }}</div>
          </div>
          <!-- Holders -->
          <div class="info-row">
            <div class="info-label">Holders</div>
            <div class="info-value">{{ token_info["holders"] }}</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div v-if="updateCounter !== -1">
        <div class="mb-4 flex gap-1 border-b border-card-border dark:border-card-border-dark">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ active: activeName === tab.key }"
            @click="activeName = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Tab: Recent Transfers -->
        <div v-show="activeName === 'transfers'">
          <tokens-tx-nep17
            :contractHash="token_id"
            :decimal="decimal === '' ? 0 : decimal"
            :symbol="token_info['symbol']"
          />
        </div>

        <!-- Tab: Top Holders -->
        <div v-show="activeName === 'holders'">
          <token-holder :contract-hash="token_id" :decimal="decimal === '' ? 0 : decimal" />
        </div>

        <!-- Tab: Contract Info -->
        <div v-show="activeName === 'contract'">
          <!-- Extra Info -->
          <div v-if="manifest.extra && JSON.stringify(manifest.extra) !== '{}'" class="etherscan-card mb-4">
            <div class="border-b border-card-border px-4 py-3 dark:border-card-border-dark">
              <h3 class="text-sm font-semibold text-text-primary dark:text-white">Extra</h3>
            </div>
            <div class="flex flex-wrap gap-x-8 gap-y-2 px-4 py-3 text-sm">
              <div v-if="manifest.extra['Email']">
                <span class="text-text-secondary">Email:</span>
                <a :href="'mailto:' + manifest.extra['Email']" class="ml-1 etherscan-link">
                  {{ manifest.extra["Email"] }}
                </a>
              </div>
              <div v-if="manifest.extra['Author']">
                <span class="text-text-secondary">Author:</span>
                <span class="ml-1 text-text-primary dark:text-gray-200">{{ manifest.extra["Author"] }}</span>
              </div>
              <div v-if="manifest.extra['Description']">
                <span class="text-text-secondary">Description:</span>
                <span class="ml-1 text-text-primary dark:text-gray-200">{{ manifest.extra["Description"] }}</span>
              </div>
            </div>
          </div>

          <!-- ABI: Events -->
          <div v-if="manifest.abi && manifest.abi.events && manifest.abi.events.length > 0" class="etherscan-card mb-4">
            <div class="border-b border-card-border px-4 py-3 dark:border-card-border-dark">
              <h3 class="text-sm font-semibold text-text-primary dark:text-white">Events</h3>
            </div>
            <div class="divide-y divide-card-border dark:divide-card-border-dark">
              <details v-for="(item, index) in manifest['abi']['events']" :key="'event-' + index" class="group">
                <summary
                  class="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-text-primary hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/60"
                >
                  <svg
                    class="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  {{ item["name"] }}
                </summary>
                <div class="px-4 pb-3 pl-10">
                  <div class="text-xs font-medium uppercase text-text-secondary mb-2">Parameters</div>
                  <div v-if="item['parameters'].length > 0" class="space-y-1">
                    <div v-for="(param, ind) in item['parameters']" :key="ind" class="flex gap-2 text-sm">
                      <span class="font-medium text-text-secondary">{{ param["name"] }}:</span>
                      <span class="text-text-primary dark:text-gray-300">{{ param["type"] }}</span>
                    </div>
                  </div>
                  <div v-else class="text-sm text-text-muted">null</div>
                </div>
              </details>
            </div>
          </div>

          <!-- ABI: Methods -->
          <div v-if="manifest.abi && manifest.abi.methods" class="etherscan-card">
            <div class="border-b border-card-border px-4 py-3 dark:border-card-border-dark">
              <h3 class="text-sm font-semibold text-text-primary dark:text-white">Methods</h3>
            </div>
            <div class="divide-y divide-card-border dark:divide-card-border-dark">
              <details v-for="(item, index) in manifest['abi']['methods']" :key="'method-' + index" class="group">
                <summary
                  class="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-text-primary hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/60"
                >
                  <svg
                    class="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  {{ item["name"] }}
                  <span
                    v-if="item['safe']"
                    class="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >safe</span
                  >
                </summary>
                <div class="px-4 pb-4 pl-10">
                  <!-- Query button for safe methods -->
                  <div v-if="item['safe']" class="mb-3">
                    <button class="btn-outline text-xs" @click="onQuery(index)">Query</button>
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <!-- Parameters -->
                    <div>
                      <div class="text-xs font-medium uppercase text-text-secondary mb-1">Parameters</div>
                      <div v-if="item['parameters'].length > 0">
                        <div v-for="(param, ind) in item['parameters']" :key="ind" class="mb-1 text-sm">
                          <span class="font-medium text-text-secondary">{{ param["name"] }}:</span>
                          <span class="ml-1 text-text-primary dark:text-gray-300">{{ param["type"] }}</span>
                          <input
                            v-if="item['safe']"
                            type="text"
                            class="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                            v-model="manifest['abi']['methods'][index]['parameters'][ind].value"
                          />
                        </div>
                      </div>
                      <div v-else class="text-sm text-text-muted">No parameters</div>
                    </div>
                    <!-- Return Type -->
                    <div>
                      <div class="text-xs font-medium uppercase text-text-secondary mb-1">Return Type</div>
                      <div class="text-sm text-text-primary dark:text-gray-300">{{ item["returntype"] }}</div>
                    </div>
                    <!-- Offset -->
                    <div>
                      <div class="text-xs font-medium uppercase text-text-secondary mb-1">Offset</div>
                      <div class="text-sm text-text-primary dark:text-gray-300">{{ item["offset"] }}</div>
                    </div>
                    <!-- Safe -->
                    <div>
                      <div class="text-xs font-medium uppercase text-text-secondary mb-1">Safe</div>
                      <div class="text-sm text-text-primary dark:text-gray-300">{{ item["safe"] }}</div>
                    </div>
                  </div>

                  <!-- Error / Response -->
                  <div
                    class="mt-3"
                    v-if="
                      manifest['abi']['methods'][index]['error'] && manifest['abi']['methods'][index]['error'] !== ''
                    "
                  >
                    <div class="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Error</div>
                    <div class="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                      {{ manifest["abi"]["methods"][index]["error"] }}
                    </div>
                  </div>
                  <div
                    class="mt-3"
                    v-else-if="
                      manifest['abi']['methods'][index]['raw'] && manifest['abi']['methods'][index]['raw'] !== ''
                    "
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xs font-semibold text-text-primary dark:text-white">Response</span>
                      <button class="btn-mini" @click="decode(index)">
                        {{ manifest["abi"]["methods"][index]["button"] }}
                      </button>
                    </div>
                    <contract-json-view
                      v-if="manifest['abi']['methods'][index]['isRaw']"
                      :json="manifest['abi']['methods'][index]['raw']"
                    />
                    <contract-json-view v-else :json="manifest['abi']['methods'][index]['display']" />
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { tokenService, contractService } from "@/services";
import TokensTxNep17 from "./TokenTxNep17";
import TokenHolder from "./TokenHolder";
import ContractJsonView from "../Contract/ContractJsonView";
import Neon from "@cityofzion/neon-js";
import { convertPreciseTime, convertToken, responseConverter } from "@/store/util";
import { getRpcUrl } from "@/utils/env";
import Skeleton from "@/components/common/Skeleton.vue";

export default {
  components: {
    ContractJsonView,
    TokensTxNep17,
    TokenHolder,
    Skeleton,
  },
  data() {
    return {
      token_id: "",
      isLoading: true,
      token_info: [],
      manifest: "",
      decimal: "",
      activeName: "transfers",
      tabs: [
        { key: "transfers", label: "Recent Transfers" },
        { key: "holders", label: "Top Holders" },
        { key: "contract", label: "Contract Info" },
      ],
      tokenImageList: {
        GhostMarketToken: "https://governance.ghostmarket.io/images/gm.png",
      },
      image: "",
      hasTokenImage: false,
      updateCounter: 0,
      copied: false,
    };
  },
  created() {
    this.token_id = this.$route.params.hash;
    this.loadAllData();
  },
  watch: {
    $route: "watchrouter",
  },
  methods: {
    convertPreciseTime,
    convertToken,
    decode(index) {
      if (this.manifest["abi"]["methods"][index]["isRaw"]) {
        this.manifest["abi"]["methods"][index]["isRaw"] = false;
        this.manifest["abi"]["methods"][index]["button"] = "Raw";
      } else {
        this.manifest["abi"]["methods"][index]["isRaw"] = true;
        this.manifest["abi"]["methods"][index]["button"] = "Decode";
      }
    },
    copyHash(text) {
      navigator.clipboard.writeText(text).then(() => {
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      });
    },
    watchrouter() {
      if (this.$route.name === "nep17TokenDetail") {
        this.token_id = this.$route.params.hash;
        this.loadAllData();
      }
    },
    loadAllData() {
      this.isLoading = true;
      this.activeName = "transfers";
      this.manifest = "";
      this.updateCounter = 0;
      this.getToken(this.token_id);
      this.getContractManifest(this.token_id);
      this.getContractUpdateCounter(this.token_id);
    },
    getContract(hash) {
      this.$router.push(`/contractinfo/${hash}`);
    },
    getToken(token_id) {
      tokenService
        .getByHash(token_id)
        .then((res) => {
          this.decimal = res?.decimals;
          this.token_info = res;
          this.checkTokenImage();
          this.isLoading = false;
        })
        .catch(() => {
          this.isLoading = false;
        });
    },
    checkTokenImage() {
      const name = this.token_info["tokenname"];
      if (name && name in this.tokenImageList) {
        this.image = this.tokenImageList[name];
        this.hasTokenImage = true;
      }
    },
    getContractUpdateCounter(contract_id) {
      contractService
        .getByHash(contract_id)
        .then((res) => {
          this.updateCounter = res?.updatecounter;
        })
        .catch(() => {
          // Service layer handles error logging
        });
    },
    onQuery(index) {
      this.manifest["abi"]["methods"][index]["result"] = "";
      this.manifest["abi"]["methods"][index]["error"] = "";
      const name = this.manifest["abi"]["methods"][index]["name"];
      const params = this.manifest["abi"]["methods"][index]["parameters"];
      const contractParams = [];
      for (const item of params) {
        try {
          contractParams.push(Neon.create.contractParam(item["type"], item["value"]));
        } catch (err) {
          this.manifest["abi"]["methods"][index]["error"] = err.toString();
          return;
        }
      }
      const client = Neon.create.rpcClient(getRpcUrl());
      client
        .invokeFunction(this.token_id, name, contractParams)
        .then((res) => {
          if (res["exception"] != null) {
            this.manifest["abi"]["methods"][index]["error"] = res["exception"];
          } else {
            const temp = JSON.parse(JSON.stringify(res["stack"]));
            this.manifest["abi"]["methods"][index]["isRaw"] = true;
            this.manifest["abi"]["methods"][index]["button"] = "Decode";
            this.manifest["abi"]["methods"][index]["raw"] = res["stack"];
            this.manifest["abi"]["methods"][index]["display"] = JSON.parse(JSON.stringify(temp, responseConverter));
          }
        })
        .catch((err) => {
          this.manifest["abi"]["methods"][index]["error"] = err.toString();
        });
    },
    getContractManifest(token_id) {
      contractService
        .getByHash(token_id)
        .then((res) => {
          this.manifest = JSON.parse(res?.manifest || "{}");
        })
        .catch(() => {
          // Service layer handles error logging
        });
    },
  },
};
</script>

<style scoped>
.info-row {
  @apply flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4;
}
.info-label {
  @apply w-full shrink-0 text-sm font-medium text-text-secondary sm:w-48;
}
.info-value {
  @apply text-sm text-text-primary dark:text-gray-200;
}
.tab-btn {
  @apply px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-primary-500 border-b-2 border-transparent -mb-px;
}
.tab-btn.active {
  @apply text-primary-500 border-primary-500;
}
.btn-outline {
  @apply inline-flex items-center rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-gray-50 hover:text-primary-500 transition-colors dark:border-card-border-dark dark:hover:bg-gray-800;
}
</style>
