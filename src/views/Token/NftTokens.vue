<template>
  <div class="etherscan-card overflow-hidden">
    <!-- Loading -->
    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 5" :key="i" height="40px" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-6">
      <ErrorState title="Unable to load NFT items" :message="error" @retry="loadNftItems(0)" />
    </div>

    <template v-else>
      <!-- View Toggle + Info bar -->
      <div
        v-if="totalCount > 0"
        class="card-header"
      >
        <p class="text-sm text-text-secondary dark:text-gray-300">
          A total of {{ formatNumber(totalCount) }} NFT items found
        </p>
        <div class="flex items-center gap-1">
          <button
            @click="viewMode = 'grid'"
            :class="[
              'rounded p-1.5 transition-colors',
              viewMode === 'grid'
                ? 'bg-primary-50 text-primary-500 dark:bg-primary-900/30'
                : 'text-text-muted hover:text-text-primary',
            ]"
            title="Grid view"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </button>
          <button
            @click="viewMode = 'list'"
            :class="[
              'rounded p-1.5 transition-colors',
              viewMode === 'list'
                ? 'bg-primary-50 text-primary-500 dark:bg-primary-900/30'
                : 'text-text-muted hover:text-text-primary',
            ]"
            title="List view"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Grid View -->
      <div v-if="viewMode === 'grid'" class="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
        <router-link
          v-for="(item, index) in tableData"
          :key="item.tokenid + index"
          :to="'/nft-info/' + item.asset + '/' + item.address + '/' + base64ToHash(item.tokenid)"
          class="group overflow-hidden rounded-lg border border-card-border transition-shadow hover:shadow-md dark:border-card-border-dark"
        >
          <!-- Image -->
          <div class="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.nftname || 'NFT'"
              class="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              @error="$event.target.style.display = 'none'"
            />
            <div v-else class="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
              <svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <!-- Info -->
          <div class="p-2.5">
            <p class="truncate text-sm font-medium text-text-primary dark:text-gray-200">
              {{ item.nftname || "Unnamed" }}
            </p>
            <p class="mt-0.5 truncate font-hash text-xs text-text-muted">#{{ item.tokenid }}</p>
          </div>
        </router-link>
      </div>

      <!-- List View -->
      <div v-else class="divide-y divide-card-border dark:divide-card-border-dark">
        <router-link
          v-for="(item, index) in tableData"
          :key="item.tokenid + index"
          :to="'/nft-info/' + item.asset + '/' + item.address + '/' + base64ToHash(item.tokenid)"
          class="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
        >
          <div class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.nftname || 'NFT'"
              class="h-full w-full object-cover"
              loading="lazy"
              @error="$event.target.style.display = 'none'"
            />
            <div v-else class="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-text-primary dark:text-gray-200">
              {{ item.nftname || "Unnamed" }}
            </p>
            <p class="truncate font-hash text-xs text-text-muted">#{{ item.tokenid }}</p>
          </div>
          <div class="hidden text-right text-xs text-text-muted sm:block">
            <p class="font-hash truncate max-w-[140px]">{{ truncateHash(item.address) }}</p>
          </div>
        </router-link>
      </div>

      <div v-if="tableData.length === 0" class="p-4">
        <EmptyState message="No NFT tokens found" />
      </div>
    </template>

    <!-- Pagination -->
    <div
      v-if="!loading && totalCount > resultsPerPage"
      class="border-t border-card-border px-4 py-3 dark:border-card-border-dark"
    >
      <EtherscanPagination
        :page="currentPage"
        :total-pages="totalPages"
        :page-size="resultsPerPage"
        :total="totalCount"
        :show-page-size="false"
        @update:page="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { tokenService } from "@/services";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { formatNumber, truncateHash } from "@/utils/explorerFormat";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { base64ToHex } from "@/utils/neoHelpers";

const props = defineProps({
  contractHash: { type: String, required: true },
  decimal: { type: Number, default: 0 },
});

// --- State ---
const tableData = ref([]);
const totalCount = ref(0);
const resultsPerPage = DEFAULT_PAGE_SIZE;
const currentPage = ref(1);
const loading = ref(true);
const error = ref(null);
const viewMode = ref("grid");
const abortController = ref(null);

onBeforeUnmount(() => {
  abortController.value?.abort();
});

const totalPages = computed(() => (totalCount.value === 0 ? 1 : Math.ceil(totalCount.value / resultsPerPage)));

// --- Methods ---
function base64ToHash(base) {
  return base64ToHex(base);
}

function fetchNftProperties() {
  if (tableData.value.length === 0) {
    loading.value = false;
    return;
  }
  let pending = tableData.value.length;
  for (let k = 0; k < tableData.value.length; k++) {
    const idx = k;
    tokenService
      .getNep11Properties(tableData.value[idx].asset, [tableData.value[idx].tokenid])
      .then((result) => {
        const value = result?.result?.[0];
        if (value) {
          tableData.value[idx] = {
            ...tableData.value[idx],
            nftname: value.name || "Unnamed",
            image: value.image
              ? value.image.startsWith("ipfs")
                ? value.image.replace(/^(ipfs:\/\/)|^(ipfs-video:\/\/)/, "https://ipfs.io/ipfs/")
                : value.image
              : "",
            description: value.description || "",
          };
        }
      })
      .finally(() => {
        pending--;
        if (pending === 0) loading.value = false;
      });
  }
}

async function loadNftItems(skip = 0) {
  abortController.value?.abort();
  abortController.value = new AbortController();

  loading.value = true;
  error.value = null;
  try {
    const res = await tokenService.getNftHoldersList(props.contractHash, resultsPerPage, skip);
    if (abortController.value?.signal.aborted) return;
    tableData.value = res?.result || [];
    totalCount.value = res?.totalCount || 0;
    fetchNftProperties();
  } catch (err) {
    if (abortController.value?.signal.aborted) return;
    if (process.env.NODE_ENV !== "production") console.error("Failed to load NFT items:", err);
    error.value = "Failed to load NFT items. Please try again.";
    tableData.value = [];
    loading.value = false;
  }
}

function handlePageChange(page) {
  currentPage.value = page;
  loadNftItems((page - 1) * resultsPerPage);
}

// --- Watchers ---
watch(
  () => props.contractHash,
  () => {
    currentPage.value = 1;
    loadNftItems(0);
  }
);

// Initial load
loadNftItems(0);
</script>
