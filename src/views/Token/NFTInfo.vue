<template>
  <div class="nft-info">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.nftDetail') }]" />

      <!-- Page Header -->
      <div class="detail-hero">
        <div class="flex items-start gap-3">
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
          <div class="min-w-0 flex-1">
            <h1 class="page-title">{{ nftName || $t("tokenDetail.nftDetailTitle") }}</h1>
            <p class="page-subtitle">{{ $t("tokenDetail.nftDetailSubtitle") }}</p>
          </div>
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
        <ErrorState :title="$t('tokenDetail.nftDetailNotFound')" :message="error" @retry="loadNFT" />
      </div>

      <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="lg:col-span-1">
          <div class="etherscan-card p-4">
            <div class="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              <img
                v-if="image"
                v-lazy-image="image"
                :alt="nftName || $t('tokenDetail.nftDetailImageAlt')"
                class="h-full w-full object-cover"
                @error="handleImageError"
              />
              <div v-else class="flex h-full items-center justify-center text-low">
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
              <h2 class="text-base font-semibold text-high">{{ $t("tokenDetail.nftDetailSection") }}</h2>
            </div>
            <div class="soft-divider divide-y">
              <InfoRow :label="$t('tokenDetail.nftDetailRowTokenId')">
                <span class="break-all font-hash text-sm">{{ tokenId }}</span>
              </InfoRow>
              <InfoRow :label="$t('tokenDetail.nftDetailRowContract')">
                <router-link :to="`/contract-info/${contractHash}`" class="break-all font-hash text-sm etherscan-link">
                  {{ contractHash }}
                </router-link>
              </InfoRow>
              <InfoRow :label="$t('tokenDetail.nftDetailRowOwner')">
                <HashLink :hash="address" type="address" :truncated="false" :copyable="false" />
              </InfoRow>
              <InfoRow v-if="description" :label="$t('tokenDetail.nftDetailRowDescription')">
                <p>{{ description }}</p>
              </InfoRow>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { tokenService } from "@/services/tokenService";
import { isAbortError } from "@/utils/abortError";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { resolveImageUrl } from "@/utils/neoHelpers";
import { resolveNetworkName } from "@/utils/env";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import InfoRow from "@/components/common/InfoRow.vue";
import HashLink from "@/components/common/HashLink.vue";

const route = useRoute();
const { t } = useI18n();

// data() -> refs
const loading = ref(true);
const error = ref(null);
const nftName = ref("");
const image = ref("");
const description = ref("");

let fetchGeneration = 0;

// computed
const tokenId = computed(() => route.params.tokenId);
const contractHash = computed(() => route.params.contractHash);
const address = computed(() => route.params.address);

// methods -> functions
function handleImageError() {
  image.value = "";
}

async function loadNFT() {
  // Skip if either route param is missing — this can happen on first
  // mount before vue-router has resolved params, or during a soft route
  // change. Calling the RPC with undefined would either 400 or return an
  // unrelated NFT depending on backend.
  if (!contractHash.value || !tokenId.value) return;

  const myGeneration = ++fetchGeneration;
  const requestNetwork = resolveNetworkName();

  loading.value = true;
  error.value = null;
  // Reset display fields so the previous NFT's name/image don't linger
  // while the next fetch resolves.
  nftName.value = "";
  image.value = "";
  description.value = "";
  try {
    const result = await tokenService.getNep11Properties(contractHash.value, [tokenId.value], {
      network: requestNetwork,
    });
    if (myGeneration !== fetchGeneration || resolveNetworkName() !== requestNetwork) return;
    const data = result?.result?.[0];
    if (data) {
      nftName.value = data.name || t("tokenDetail.nftDetailUnknown");
      image.value = resolveImageUrl(data.image);
      description.value = data.description || "";
    }
  } catch (err) {
    if (myGeneration !== fetchGeneration || resolveNetworkName() !== requestNetwork) return;
    if (isAbortError(err)) return;
    if (import.meta.env.DEV) console.error("Failed to load NFT info:", err);
    error.value = t("errors.loadNftDetails");
  } finally {
    if (myGeneration === fetchGeneration && resolveNetworkName() === requestNetwork) loading.value = false;
  }
}

// watch with immediate replaces the watch + created pattern
function handleNetworkChange() {
  if (contractHash.value && tokenId.value) {
    loadNFT();
  }
}

useNetworkChange(handleNetworkChange);

watch(
  () => [contractHash.value, tokenId.value],
  () => loadNFT(),
  { immediate: true }
);
</script>
