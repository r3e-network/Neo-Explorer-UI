<template>
  <div class="nft-info">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'NFT Detail' }]" />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">{{ nftName || "NFT Detail" }}</h1>
          <p class="page-subtitle">Non-Fungible Token</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="etherscan-card p-6">
        <div class="space-y-4">
          <Skeleton v-for="index in 6" :key="index" height="44px" />
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-6">
        <ErrorState title="NFT not found" :message="error" @retry="loadNFT" />
      </div>

      <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="lg:col-span-1">
          <div class="etherscan-card p-4">
            <div class="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              <img
                v-if="image"
                v-lazy-image="image"
                :alt="nftName || 'NFT image'"
                class="h-full w-full object-cover"
                @error="handleImageError"
              />
              <div v-else class="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
                <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6 lg:col-span-2">
          <div class="etherscan-card overflow-hidden">
            <div class="card-header">
              <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Details</h2>
            </div>
            <div class="divide-y divide-card-border dark:divide-card-border-dark">
              <InfoRow label="Token ID">
                <span class="break-all font-hash text-sm text-text-primary dark:text-gray-300">{{ tokenId }}</span>
              </InfoRow>
              <InfoRow label="Contract">
                <router-link :to="`/contract-info/${contractHash}`" class="break-all font-hash text-sm etherscan-link">
                  {{ contractHash }}
                </router-link>
              </InfoRow>
              <InfoRow label="Owner">
                <router-link :to="`/account-profile/${address}`" class="break-all font-hash text-sm etherscan-link">
                  {{ address }}
                </router-link>
              </InfoRow>
              <InfoRow v-if="description" label="Description">
                <p class="text-text-primary dark:text-gray-300">{{ description }}</p>
              </InfoRow>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { tokenService } from "@/services";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import InfoRow from "@/components/common/InfoRow.vue";

const route = useRoute();
const { t } = useI18n();

// data() -> refs
const loading = ref(true);
const error = ref(null);
const nftName = ref("");
const image = ref("");
const description = ref("");
const abortController = ref(null);

onBeforeUnmount(() => {
  abortController.value?.abort();
});

// computed
const tokenId = computed(() => route.params.tokenId);
const contractHash = computed(() => route.params.contractHash);
const address = computed(() => route.params.address);

// methods -> functions
function handleImageError() {
  image.value = "";
}

async function loadNFT() {
  abortController.value?.abort();
  abortController.value = new AbortController();

  loading.value = true;
  error.value = null;
  try {
    const result = await tokenService.getNep11Properties(contractHash.value, [tokenId.value]);
    if (abortController.value?.signal.aborted) return;
    const data = result?.result?.[0];
    if (data) {
      nftName.value = data.name || "Unknown NFT";
      image.value = data.image?.replace(/^ipfs:\/\//, "https://ipfs.io/ipfs/") || "";
      description.value = data.description || "";
    }
  } catch (err) {
    if (abortController.value?.signal.aborted) return;
    if (import.meta.env.DEV) console.error("Failed to load NFT info:", err);
    error.value = t("errors.loadNftDetails");
  } finally {
    loading.value = false;
  }
}

// watch with immediate replaces the watch + created pattern
watch(
  () => [contractHash.value, tokenId.value],
  () => loadNFT(),
  { immediate: true }
);
</script>
