<template>
  <div class="x-token-detail-page">
    <div class="page-container py-6">
      <Breadcrumb
        :items="[
          { label: tf('breadcrumb.home', 'Home'), to: '/homepage' },
          { label: 'Neo X', to: '/x' },
          { label: tf('pageTitles.xTokens', 'Tokens'), to: '/x/tokens' },
          { label: token?.symbol || token?.name || tf('neoX.token', 'Token') },
        ]"
      />

      <!-- HERO -->
      <div v-if="!error" class="detail-hero detail-hero-circuit detail-hero-enhanced animate-page-enter">
        <span class="circuit-particle"></span>
        <span class="circuit-particle"></span>
        <span class="circuit-particle"></span>

        <div class="flex items-start gap-3">
          <TokenAvatar
            size="md"
            :src="token?.iconUrl || ''"
            :name="token?.name || ''"
            :symbol="token?.symbol || ''"
            :kind="isNft ? 'nft' : 'token'"
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="page-title neon-glow-text">
                {{ token?.name || token?.symbol || tf("neoX.token", "Token") }}
              </h1>
              <span v-if="token?.symbol" class="badge-soft">{{ token.symbol }}</span>
              <span v-if="standardLabel" class="badge-soft">{{ standardLabel }}</span>
              <span
                v-if="isVerified"
                class="inline-flex items-center gap-1 rounded bg-status-success-bg px-2 py-0.5 text-xs font-semibold text-status-success"
              >
                <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                {{ tf("neoX.verified", "Verified") }}
              </span>
            </div>
            <div class="detail-metadata mt-1">
              <span class="detail-chip min-w-0 max-w-full break-all font-hash text-[11px] sm:text-xs">{{ hash }}</span>
              <CopyButton :text="hash" />
              <RouterLink :to="`/x/address/${hash}`" class="btn-outline gap-1.5 px-3 py-1.5 text-xs">
                {{ tf("neoX.viewContract", "View Contract") }}
              </RouterLink>
            </div>
          </div>
        </div>
      </div>

      <!-- LOADING -->
      <div v-if="loading" class="space-y-6">
        <div class="etherscan-card p-6">
          <Skeleton width="30%" height="24px" class="mb-6" />
          <div class="space-y-4">
            <div v-for="i in 8" :key="i" class="flex gap-4">
              <Skeleton width="120px" height="18px" />
              <Skeleton width="60%" height="18px" />
            </div>
          </div>
        </div>
      </div>

      <!-- ERROR / NOT FOUND -->
      <ErrorState
        v-else-if="error"
        :title="tf('errors.generic', 'Something went wrong. Please try again.')"
        :message="tf('errors.loadFailed', 'Failed to load token.')"
        @retry="load"
      />
      <EmptyState v-else-if="!token" :message="tf('neoX.notFound', 'Not found.')" icon="token" />

      <template v-else>
        <!-- STATS -->
        <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4 animate-page-enter animate-page-enter-delay-1">
          <DashboardStatCard :label="tf('neoX.totalSupply', 'Total Supply')" glow-color="#00b377">
            <template #value>
              <p class="min-w-0 break-words font-extrabold leading-tight text-high tabular-nums neon-glow-text text-lg">
                {{ supplyDisplay }}
              </p>
            </template>
          </DashboardStatCard>
          <DashboardStatCard
            :label="tf('neoX.holders', 'Holders')"
            :value="holdersCount"
            animated
            glow-color="#3b82f6"
          />
          <DashboardStatCard
            :label="tf('neoX.totalTransfers', 'Total Transfers')"
            :value="counters ? counters.transfersCount : null"
            animated
            glow-color="#8b5cf6"
          />
          <DashboardStatCard
            :label="tf('neoX.decimals', 'Decimals')"
            :value="token.decimals ?? null"
            glow-color="#f59e0b"
          />
        </div>

        <!-- TABBED CARD -->
        <div class="etherscan-card overflow-hidden animate-page-enter animate-page-enter-delay-2">
          <div class="p-3 pb-0">
            <TabsNav :tabs="tabs" v-model="activeTab" id-base="x-token" />
          </div>
            <div :key="`${hash}-${activeTab}`" class="p-4 pt-5 md:p-5">
              <section
                v-if="activeTab === 'transfers'"
                id="x-token-transfers-panel"
                role="tabpanel"
                aria-labelledby="x-token-transfers-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XTokenTransfersTab :hash="hash" :decimals="decimalsNumber" :symbol="token.symbol || ''" />
              </section>
              <section
                v-else-if="activeTab === 'holders'"
                id="x-token-holders-panel"
                role="tabpanel"
                aria-labelledby="x-token-holders-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XTokenHoldersTab :hash="hash" :decimals="decimalsNumber" :total-supply="token.totalSupply || ''" />
              </section>
              <section
                v-else-if="activeTab === 'inventory'"
                id="x-token-inventory-panel"
                role="tabpanel"
                aria-labelledby="x-token-inventory-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XNftGalleryTab :hash="hash" />
              </section>
            </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineAsyncComponent } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { tokenService, accountService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import { formatUnits } from "@/utils/neoxFormat";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import TabsNav from "@/components/common/TabsNav.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import TokenAvatar from "@/components/common/TokenAvatar.vue";
import DashboardStatCard from "@/components/charts/DashboardStatCard.vue";
import XTokenTransfersTab from "./components/XTokenTransfersTab.vue";

const XTokenHoldersTab = defineAsyncComponent(() => import("./components/XTokenHoldersTab.vue"));
const XNftGalleryTab = defineAsyncComponent(() => import("./components/XNftGalleryTab.vue"));

const route = useRoute();
const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const token = ref(null);
const counters = ref(null);
const addressInfo = ref(null);
const loading = ref(false);
const error = ref(false);
const activeTab = ref("transfers");
let reqId = 0;

const hash = computed(() => String(route.params.hash || ""));
const isNft = computed(() => token.value?.standard === "ERC721" || token.value?.standard === "ERC1155");
const isVerified = computed(() => Boolean(addressInfo.value?.isVerified));

const standardLabel = computed(() => {
  const raw = token.value?.raw?.type;
  if (raw) return raw;
  return token.value?.standard || "";
});

const decimalsNumber = computed(() => {
  const n = Number(token.value?.decimals);
  return Number.isFinite(n) ? n : null;
});

const supplyDisplay = computed(() => {
  if (!token.value || token.value.totalSupply === null || token.value.totalSupply === undefined) return "—";
  const amount = formatUnits(token.value.totalSupply, decimalsNumber.value ?? 0);
  return token.value.symbol ? `${amount} ${token.value.symbol}` : amount;
});

const holdersCount = computed(() => {
  if (counters.value && counters.value.tokenHoldersCount) return counters.value.tokenHoldersCount;
  const n = Number(token.value?.holders);
  return Number.isFinite(n) ? n : null;
});

const tabs = computed(() => {
  const list = [
    { key: "transfers", label: tf("neoX.transfers", "Transfers"), count: counters.value?.transfersCount ?? null },
    { key: "holders", label: tf("neoX.holders", "Holders"), count: counters.value?.tokenHoldersCount ?? null },
  ];
  if (isNft.value) {
    list.push({ key: "inventory", label: tf("neoX.inventory", "Inventory") });
  }
  return list;
});

watch(tabs, (list) => {
  if (!list.some((tab) => tab.key === activeTab.value)) {
    activeTab.value = "transfers";
  }
});

async function load() {
  const target = hash.value;
  if (!target) return;
  const current = ++reqId;
  loading.value = true;
  error.value = false;
  try {
    const net = getNeoxNet();
    const [found, counts, info] = await Promise.allSettled([
      tokenService.getByHash(target, { net }),
      tokenService.getCounters(target, { net }),
      accountService.getByAddress(target, { net }),
    ]);
    if (current !== reqId) return;
    token.value = found.status === "fulfilled" ? found.value : null;
    counters.value = counts.status === "fulfilled" ? counts.value : null;
    addressInfo.value = info.status === "fulfilled" ? info.value : null;
    error.value = found.status === "rejected";
  } catch (_err) {
    if (current === reqId) error.value = true;
  } finally {
    if (current === reqId) loading.value = false;
  }
}

onMounted(load);
watch(
  () => route.params.hash,
  () => {
    token.value = null;
    counters.value = null;
    addressInfo.value = null;
    activeTab.value = "transfers";
    load();
  }
);
useNetworkChange(load);
</script>
