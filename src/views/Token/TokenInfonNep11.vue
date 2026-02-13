<template>
  <div class="mx-auto max-w-[1400px] px-4 py-6">
    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <Skeleton height="40px" />
      <div class="etherscan-card p-6">
        <Skeleton v-for="i in 8" :key="i" height="24px" class="mb-3" />
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="py-12">
      <ErrorState :message="error" @retry="reloadToken" />
    </div>

    <template v-else>
      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div
          class="page-header-icon bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300"
        >
          <svg
            class="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h1 class="page-title">Token Detail</h1>
            <span
              v-if="updateCounter === -1"
              class="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
            >
              Destroyed
            </span>
          </div>
          <p class="page-subtitle">NEP-11 Non-Fungible Token</p>
        </div>
        <button
          class="btn-outline ml-auto"
          aria-label="View contract details"
          @click="getContract(token_info['hash'])"
        >
          View Contract
        </button>
      </div>

      <!-- Overview Card -->
      <div class="etherscan-card mb-6">
        <div class="card-header">
          <h2
            class="text-base font-semibold text-text-primary dark:text-gray-100"
          >
            Overview
          </h2>
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
              <span class="font-hash text-primary-500 break-all">{{
                token_info["hash"]
              }}</span>
              <button
                class="shrink-0 text-gray-400 transition-colors hover:text-primary-500 dark:text-gray-500 dark:hover:text-primary-400"
                title="Copy to clipboard"
                @click="copyHash(token_info['hash'])"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
            <div class="info-value">
              {{ convertToken(token_info["totalsupply"], decimal) }}
            </div>
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
        <div class="etherscan-card mb-0">
          <div class="card-header">
            <nav class="flex flex-wrap gap-1" role="tablist">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                role="tab"
                :aria-selected="activeName === tab.key"
                :class="[
                  'tab-btn',
                  activeName === tab.key
                    ? 'tab-btn-active'
                    : 'tab-btn-inactive',
                ]"
                @click="activeName = tab.key"
              >
                {{ tab.label }}
              </button>
            </nav>
          </div>
        </div>

        <!-- Tab: NFT Tokens -->
        <div v-show="activeName === 'nfts'">
          <nft-token
            v-if="token_info['totalsupply'] !== 0"
            :contract-hash="token_id"
            :decimal="decimal === '' ? 0 : decimal"
          />
          <div
            v-else
            class="etherscan-card p-6 text-center text-sm text-text-muted"
          >
            No NFT tokens found
          </div>
        </div>

        <!-- Tab: Top Holders -->
        <div v-show="activeName === 'holders'">
          <token-holder
            v-if="token_info['holders']"
            :contract-hash="token_id"
            :format-balance="false"
          />
          <div
            v-else
            class="etherscan-card p-6 text-center text-sm text-text-muted"
          >
            No holders found
          </div>
        </div>

        <!-- Tab: Contract Info -->
        <div v-show="activeName === 'contract'">
          <!-- Extra Info -->
          <div
            v-if="manifest.extra && JSON.stringify(manifest.extra) !== '{}'"
            class="etherscan-card mb-4"
          >
            <div class="card-header">
              <h3
                class="text-sm font-semibold text-text-primary dark:text-gray-100"
              >
                Extra
              </h3>
            </div>
            <div class="flex flex-wrap gap-x-8 gap-y-2 px-4 py-3 text-sm">
              <div v-if="manifest.extra['Email']">
                <span class="text-text-secondary">Email:</span>
                <a
                  :href="'mailto:' + manifest.extra['Email']"
                  class="ml-1 etherscan-link"
                >
                  {{ manifest.extra["Email"] }}
                </a>
              </div>
              <div v-if="manifest.extra['Author']">
                <span class="text-text-secondary">Author:</span>
                <span class="ml-1 text-text-primary dark:text-gray-200">{{
                  manifest.extra["Author"]
                }}</span>
              </div>
              <div v-if="manifest.extra['Description']">
                <span class="text-text-secondary">Description:</span>
                <span class="ml-1 text-text-primary dark:text-gray-200">{{
                  manifest.extra["Description"]
                }}</span>
              </div>
            </div>
          </div>

          <!-- ABI: Events -->
          <div
            v-if="
              manifest.abi &&
              manifest.abi.events &&
              manifest.abi.events.length > 0
            "
            class="etherscan-card mb-4"
          >
            <div class="card-header">
              <h3
                class="text-sm font-semibold text-text-primary dark:text-gray-100"
              >
                Events
              </h3>
            </div>
            <div
              class="divide-y divide-card-border dark:divide-card-border-dark"
            >
              <details
                v-for="(item, index) in manifest['abi']['events']"
                :key="'event-' + index"
                class="group"
              >
                <summary
                  class="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-text-primary hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/60"
                >
                  <svg
                    class="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  {{ item["name"] }}
                </summary>
                <div class="px-4 pb-3 pl-10">
                  <div
                    class="text-xs font-medium uppercase text-text-secondary mb-2"
                  >
                    Parameters
                  </div>
                  <div v-if="item['parameters'].length > 0" class="space-y-1">
                    <div
                      v-for="(param, ind) in item['parameters']"
                      :key="ind"
                      class="flex gap-2 text-sm"
                    >
                      <span class="font-medium text-text-secondary"
                        >{{ param["name"] }}:</span
                      >
                      <span class="text-text-primary dark:text-gray-300">{{
                        param["type"]
                      }}</span>
                    </div>
                  </div>
                  <div v-else class="text-sm text-text-muted">null</div>
                </div>
              </details>
            </div>
          </div>

          <!-- ABI: Methods -->
          <div
            v-if="manifest.abi && manifest.abi.methods"
            class="etherscan-card"
          >
            <div class="card-header">
              <h3
                class="text-sm font-semibold text-text-primary dark:text-gray-100"
              >
                Methods
              </h3>
            </div>
            <div
              class="divide-y divide-card-border dark:divide-card-border-dark"
            >
              <details
                v-for="(item, index) in manifest['abi']['methods']"
                :key="'method-' + index"
                class="group"
              >
                <summary
                  class="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-text-primary hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/60"
                >
                  <svg
                    class="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  {{ item["name"] }}
                  <span
                    v-if="item['safe']"
                    class="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >safe</span
                  >
                </summary>
                <div class="px-4 pb-4 pl-10">
                  <div v-if="item['safe']" class="mb-3">
                    <button
                      class="btn-outline text-xs"
                      aria-label="Query method"
                      @click="onQuery(index)"
                    >
                      Query
                    </button>
                  </div>
                  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <div
                        class="text-xs font-medium uppercase text-text-secondary mb-1"
                      >
                        Parameters
                      </div>
                      <div v-if="item['parameters'].length > 0">
                        <div
                          v-for="(param, ind) in item['parameters']"
                          :key="ind"
                          class="mb-1 text-sm"
                        >
                          <span class="font-medium text-text-secondary"
                            >{{ param["name"] }}:</span
                          >
                          <span
                            class="ml-1 text-text-primary dark:text-gray-300"
                            >{{ param["type"] }}</span
                          >
                          <input
                            v-if="item['safe']"
                            v-model="
                              manifest['abi']['methods'][index]['parameters'][
                                ind
                              ].value
                            "
                            type="text"
                            :aria-label="`Parameter ${param['name']}`"
                            class="form-input mt-1 py-1 text-xs"
                          />
                        </div>
                      </div>
                      <div v-else class="text-sm text-text-muted">
                        No parameters
                      </div>
                    </div>
                    <div>
                      <div
                        class="text-xs font-medium uppercase text-text-secondary mb-1"
                      >
                        Return Type
                      </div>
                      <div class="text-sm text-text-primary dark:text-gray-300">
                        {{ item["returntype"] }}
                      </div>
                    </div>
                    <div>
                      <div
                        class="text-xs font-medium uppercase text-text-secondary mb-1"
                      >
                        Offset
                      </div>
                      <div class="text-sm text-text-primary dark:text-gray-300">
                        {{ item["offset"] }}
                      </div>
                    </div>
                    <div>
                      <div
                        class="text-xs font-medium uppercase text-text-secondary mb-1"
                      >
                        Safe
                      </div>
                      <div class="text-sm text-text-primary dark:text-gray-300">
                        {{ item["safe"] }}
                      </div>
                    </div>
                  </div>
                  <!-- Error -->
                  <div
                    class="mt-3"
                    v-if="
                      manifest['abi']['methods'][index]['error'] &&
                      manifest['abi']['methods'][index]['error'] !== ''
                    "
                  >
                    <div
                      class="text-xs font-semibold text-red-600 dark:text-red-400 mb-1"
                    >
                      Error
                    </div>
                    <div
                      class="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
                    >
                      {{ manifest["abi"]["methods"][index]["error"] }}
                    </div>
                  </div>
                  <!-- Response -->
                  <div
                    class="mt-3"
                    v-else-if="
                      manifest['abi']['methods'][index]['raw'] &&
                      manifest['abi']['methods'][index]['raw'] !== ''
                    "
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <span
                        class="text-xs font-semibold text-text-primary dark:text-gray-100"
                        >Response</span
                      >
                      <button
                        class="btn-mini"
                        aria-label="Decode response"
                        @click="decode(index)"
                      >
                        {{ manifest["abi"]["methods"][index]["button"] }}
                      </button>
                    </div>
                    <contract-json-view
                      v-if="manifest['abi']['methods'][index]['isRaw']"
                      :json="manifest['abi']['methods'][index]['raw']"
                    />
                    <contract-json-view
                      v-else
                      :json="manifest['abi']['methods'][index]['display']"
                    />
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

<script setup>
import { ref, watch, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { tokenService, contractService } from "@/services";
import { COPY_FEEDBACK_TIMEOUT_MS } from "@/constants";
import NftToken from "./NftTokens";
import TokenHolder from "./TokenHolder";
import ContractJsonView from "../Contract/ContractJsonView";
import {
  convertPreciseTime,
  convertToken,
  responseConverter,
} from "@/store/util";
import { invokeContractFunction } from "@/utils/contractInvocation";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const route = useRoute();
const router = useRouter();

// data() -> refs
const token_id = ref("");
const isLoading = ref(true);
const error = ref(null);
const token_info = ref({});
const manifest = ref({});
const decimal = ref("");
const activeName = ref("nfts");
const tabs = [
  { key: "nfts", label: "NFT Tokens" },
  { key: "holders", label: "Top Holders" },
  { key: "contract", label: "Contract Info" },
];
const updateCounter = ref(0);
const copied = ref(false);
const abortController = ref(null);

// Timer cleanup for copyHash setTimeout
let copyTimer = null;
onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer);
  abortController.value?.abort();
});

// methods -> functions
function decode(index) {
  if (manifest.value["abi"]["methods"][index]["isRaw"]) {
    manifest.value["abi"]["methods"][index]["isRaw"] = false;
    manifest.value["abi"]["methods"][index]["button"] = "Raw";
  } else {
    manifest.value["abi"]["methods"][index]["isRaw"] = true;
    manifest.value["abi"]["methods"][index]["button"] = "Decode";
  }
}

function copyHash(text) {
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, COPY_FEEDBACK_TIMEOUT_MS);
  });
}

function loadAllData() {
  abortController.value?.abort();
  abortController.value = new AbortController();

  isLoading.value = true;
  activeName.value = "nfts";
  manifest.value = "";
  updateCounter.value = 0;
  getToken(token_id.value);
  getContractManifest(token_id.value);
  getContractUpdateCounter(token_id.value);
}

function getContract(hash) {
  router.push(`/contract-info/${hash}`);
}

function getToken(id) {
  error.value = null;
  tokenService
    .getByHash(id)
    .then((res) => {
      if (abortController.value?.signal.aborted) return;
      decimal.value = res?.decimals;
      token_info.value = res || {};
      isLoading.value = false;
    })
    .catch((err) => {
      if (abortController.value?.signal.aborted) return;
      error.value = "Failed to load token information. Please try again.";
      isLoading.value = false;
      if (process.env.NODE_ENV !== "production")
        console.error("Failed to load token:", err);
    });
}

function reloadToken() {
  const tokenId = route.params.hash;
  if (tokenId) {
    isLoading.value = true;
    getToken(tokenId);
  }
}

function getContractUpdateCounter(contract_id) {
  contractService
    .getByHash(contract_id)
    .then((res) => {
      if (abortController.value?.signal.aborted) return;
      updateCounter.value = res?.updatecounter;
    })
    .catch(() => {
      // Service layer handles error logging
    });
}

function onQuery(index) {
  manifest.value["abi"]["methods"][index]["result"] = "";
  manifest.value["abi"]["methods"][index]["error"] = "";
  const name = manifest.value["abi"]["methods"][index]["name"];
  const params = manifest.value["abi"]["methods"][index]["parameters"];

  invokeContractFunction(token_id.value, name, params)
    .then((res) => {
      if (res?.["exception"] != null) {
        manifest.value["abi"]["methods"][index]["error"] = res["exception"];
      } else {
        const stack = Array.isArray(res?.["stack"]) ? res["stack"] : [];
        const temp = JSON.parse(JSON.stringify(stack));
        manifest.value["abi"]["methods"][index]["isRaw"] = true;
        manifest.value["abi"]["methods"][index]["button"] = "Decode";
        manifest.value["abi"]["methods"][index]["raw"] = stack;
        manifest.value["abi"]["methods"][index]["display"] = JSON.parse(
          JSON.stringify(temp, responseConverter)
        );
      }
    })
    .catch((err) => {
      manifest.value["abi"]["methods"][index]["error"] =
        err?.message || err?.toString?.() || "Failed to invoke function";
    });
}

function getContractManifest(id) {
  contractService
    .getByHash(id)
    .then((res) => {
      if (abortController.value?.signal.aborted) return;
      manifest.value = JSON.parse(res?.manifest || "{}");
    })
    .catch(() => {
      // Service layer handles error logging
    });
}

// Watch route changes (replaces created + watch.$route)
watch(
  () => route.params.hash,
  (newHash) => {
    if (newHash) {
      token_id.value = newHash;
      loadAllData();
    }
  },
  { immediate: true }
);
</script>
