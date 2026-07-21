<template>
  <div class="x-address-detail-page">
    <div class="page-container py-6">
      <Breadcrumb
        :items="[
          { label: tf('breadcrumb.home', 'Home'), to: '/homepage' },
          { label: 'Neo X', to: '/x' },
          { label: displayName || shortHash(addr, 8, 6) },
        ]"
      />

      <!-- HERO -->
      <div v-if="!error && !notFound && !loading && account" class="detail-hero detail-hero-circuit detail-hero-enhanced animate-page-enter">
        <span class="circuit-particle"></span>
        <span class="circuit-particle"></span>
        <span class="circuit-particle"></span>
        <span class="circuit-particle"></span>

        <div class="flex items-start gap-3">
          <div
            v-if="isContract"
            class="page-header-icon relative bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
          >
            <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 17h8v-2H8v2zm0-4h8v-2H8v2z" />
            </svg>
            <span class="glow-dot absolute -right-0.5 -bottom-0.5"></span>
          </div>
          <div v-else class="page-header-icon bg-icon-purple relative text-violet-500 dark:text-violet-300">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
              />
            </svg>
            <span class="glow-dot absolute -right-0.5 -bottom-0.5"></span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="page-title neon-glow-text">
                {{ displayName || (isContract ? tf("neoX.contract", "Contract") : tf("neoX.address", "Address")) }}
              </h1>
              <span
                v-if="displayName"
                class="badge-soft px-2.5 py-1 text-xs font-semibold"
              >
                {{ isContract ? tf("neoX.contract", "Contract") : tf("neoX.address", "Address") }}
              </span>
              <span
                v-if="account?.isVerified"
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
              <span
                v-if="account?.isScam"
                class="inline-flex items-center rounded bg-status-error-bg px-2 py-0.5 text-xs font-semibold text-status-error"
              >
                {{ tf("neoX.scamWarning", "SCAM") }}
              </span>
            </div>
            <div class="detail-metadata mt-1">
              <span class="detail-chip min-w-0 max-w-full break-all font-hash text-[11px] sm:text-xs">{{ addr }}</span>
              <CopyButton :text="addr" />
              <button
                class="btn-outline px-2 py-1 text-xs"
                :aria-expanded="showQr"
                :aria-label="tf('neoX.qrToggleAria', 'Toggle address QR code')"
                :title="tf('neoX.qrShow', 'Show QR code')"
                @click="showQr = !showQr"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 14h1v1h-1zM14 17h1v1h-1zM20 17h1v1h-1zM17 20h1v1h-1z"
                  />
                </svg>
                QR
              </button>
            </div>

            <!-- QR code -->
            <div
              v-if="showQr"
              class="surface-panel mt-3 inline-block rounded-xl border border-line-soft bg-white p-3 shadow-sm"
            >
              <div class="flex flex-col items-center gap-3">
                <div class="rounded-lg bg-white p-2">
                  <QrcodeVue :value="addr" :size="150" level="H" />
                </div>
                <!-- Panel is intentionally white in both themes (QR scan contrast),
                     so the caption needs a fixed dark color, not a themed token. -->
                <p class="max-w-[200px] break-all text-center font-hash text-[10px] text-slate-600">
                  {{ addr }}
                </p>
              </div>
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

      <!-- ERROR -->
      <ErrorState
        v-else-if="error"
        :title="tf('errors.generic', 'Something went wrong. Please try again.')"
        :message="tf('errors.loadFailed', 'Failed to load address.')"
        @retry="loadOverview"
      />

      <EmptyState v-else-if="notFound" :message="tf('neoX.notFound', 'Address not found.')" icon="default" />

      <template v-else>
        <!-- STATS -->
        <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4 animate-page-enter animate-page-enter-delay-1">
          <DashboardStatCard
            :label="tf('neoX.balance', 'Balance')"
            :value="balanceNumber"
            :decimals="4"
            suffix=" GAS"
            icon="<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 10V3L4 14h7v7l9-11h-7z'/></svg>"
            glow-color="#00b377"
          />
          <DashboardStatCard
            :label="tf('neoX.transactions', 'Transactions')"
            :value="counters ? counters.transactionsCount : null"
            animated
            icon="<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'/></svg>"
            glow-color="#3b82f6"
          />
          <DashboardStatCard
            :label="tf('neoX.tokenTransfers', 'Token Transfers')"
            :value="counters ? counters.tokenTransfersCount : null"
            animated
            icon="<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'/></svg>"
            glow-color="#8b5cf6"
          />
          <DashboardStatCard
            :label="tf('neoX.gasUsed', 'Gas Used')"
            :value="counters ? counters.gasUsageCount : null"
            animated
            icon="<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z'/></svg>"
            glow-color="#f59e0b"
          />
        </div>

        <!-- CREATOR STRIP -->
        <div v-if="account?.creationTxHash" class="mb-6 etherscan-card px-4 animate-page-enter animate-page-enter-delay-1">
          <InfoRow :label="tf('neoX.creator', 'Creator')">
            <span class="flex flex-wrap items-center gap-1.5">
              <XHashLink v-if="account.creator" type="address" :hash="account.creator" />
              <span v-else class="text-mid">—</span>
              <span class="text-mid">{{ tf("neoX.atTxn", "at txn") }}</span>
              <XHashLink type="tx" :hash="account.creationTxHash" />
            </span>
          </InfoRow>
        </div>

        <!-- TABBED CARD -->
        <div class="etherscan-card overflow-hidden animate-page-enter animate-page-enter-delay-2">
          <div class="p-3 pb-0">
            <TabsNav :tabs="tabs" v-model="activeTab" id-base="x-addr" />
          </div>
            <div :key="`${addr}-${activeTab}`" class="p-4 pt-5 md:p-5">
              <section
                v-if="activeTab === 'transactions'"
                id="x-addr-transactions-panel"
                role="tabpanel"
                aria-labelledby="x-addr-transactions-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XAddrTxTab :address="addr" />
              </section>
              <section
                v-else-if="activeTab === 'tokenTransfers'"
                id="x-addr-tokenTransfers-panel"
                role="tabpanel"
                aria-labelledby="x-addr-tokenTransfers-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XAddrTransfersTab :address="addr" />
              </section>
              <section
                v-else-if="activeTab === 'internal'"
                id="x-addr-internal-panel"
                role="tabpanel"
                aria-labelledby="x-addr-internal-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XAddrInternalTab :address="addr" />
              </section>
              <section
                v-else-if="activeTab === 'events'"
                id="x-addr-events-panel"
                role="tabpanel"
                aria-labelledby="x-addr-events-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XAddrLogsTab :address="addr" />
              </section>
              <section
                v-else-if="activeTab === 'holdings'"
                id="x-addr-holdings-panel"
                role="tabpanel"
                aria-labelledby="x-addr-holdings-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XAddrHoldingsTab :address="addr" />
              </section>
              <section
                v-else-if="activeTab === 'history'"
                id="x-addr-history-panel"
                role="tabpanel"
                aria-labelledby="x-addr-history-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XAddrHistoryTab :address="addr" />
              </section>
              <section
                v-else-if="activeTab === 'contract'"
                id="x-addr-contract-panel"
                role="tabpanel"
                aria-labelledby="x-addr-contract-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XContractTab :address="addr" />
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
import { accountService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import { shortHash } from "@/utils/neoxFormat";
import { resolveNeoxIdentity } from "@/constants/neoxKnownAddresses";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import TabsNav from "@/components/common/TabsNav.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import InfoRow from "@/components/common/InfoRow.vue";
import XHashLink from "@/components/common/XHashLink.vue";
import DashboardStatCard from "@/components/charts/DashboardStatCard.vue";
import XAddrTxTab from "./components/XAddrTxTab.vue";

const XAddrTransfersTab = defineAsyncComponent(() => import("./components/XAddrTransfersTab.vue"));
const XAddrInternalTab = defineAsyncComponent(() => import("./components/XAddrInternalTab.vue"));
const XAddrLogsTab = defineAsyncComponent(() => import("./components/XAddrLogsTab.vue"));
const XAddrHoldingsTab = defineAsyncComponent(() => import("./components/XAddrHoldingsTab.vue"));
const XAddrHistoryTab = defineAsyncComponent(() => import("./components/XAddrHistoryTab.vue"));
const XContractTab = defineAsyncComponent(() => import("./components/XContractTab.vue"));
const QrcodeVue = defineAsyncComponent(() => import("qrcode.vue"));

const route = useRoute();
const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const account = ref(null);
const counters = ref(null);
const loading = ref(false);
const error = ref(false);
const notFound = ref(false);
const activeTab = ref("transactions");
const showQr = ref(false);
let reqId = 0;

const addr = computed(() => String(route.params.addr || ""));
const isContract = computed(() => Boolean(account.value?.isContract));
// Curated official identity (bridge/oracle/governance…) outranks the
// Blockscout-supplied contract name in the hero badge.
const displayName = computed(
  () => resolveNeoxIdentity(addr.value, getNeoxNet())?.label || account.value?.name || "",
);

const balanceNumber = computed(() => {
  if (!account.value) return null;
  const n = Number(account.value.coinBalance) / 1e18;
  return Number.isFinite(n) ? n : null;
});

const tabs = computed(() => {
  const list = [{ key: "transactions", label: tf("neoX.transactions", "Transactions") }];
  if (!account.value || account.value.hasTokenTransfers) {
    list.push({ key: "tokenTransfers", label: tf("neoX.tokenTransfers", "Token Transfers") });
  }
  list.push({ key: "internal", label: tf("neoX.internalTxns", "Internal Txns") });
  if (!account.value || account.value.hasLogs !== false) {
    list.push({ key: "events", label: tf("neoX.events", "Events") });
  }
  if (!account.value || account.value.hasTokens) {
    list.push({ key: "holdings", label: tf("neoX.tokenHoldings", "Holdings") });
  }
  list.push({ key: "history", label: tf("neoX.balanceHistory", "Balance History") });
  if (isContract.value) {
    list.push({ key: "contract", label: tf("neoX.contract", "Contract") });
  }
  return list;
});

// If the active tab disappears (e.g. flags load and hide it), fall back.
watch(tabs, (list) => {
  if (!list.some((tab) => tab.key === activeTab.value)) {
    activeTab.value = "transactions";
  }
});

async function loadOverview() {
  const address = addr.value;
  if (!address) return;
  const current = ++reqId;
  account.value = null;
  counters.value = null;
  loading.value = true;
  error.value = false;
  notFound.value = false;
  try {
    const net = getNeoxNet();
    // Counters run detached: their warm-up retry can take ~1.5s and must not
    // hold the whole page in skeleton — the stat cards show placeholders and
    // fill in when the counters land.
    accountService
      .getCounters(address, { net })
      .then((counts) => {
        if (current === reqId) counters.value = counts;
      })
      .catch(() => {});
    const overview = await accountService.getByAddress(address, { net });
    if (current !== reqId) return;
    account.value = overview;
    notFound.value = !overview;
  } catch (_err) {
    if (current === reqId) error.value = true;
  } finally {
    if (current === reqId) loading.value = false;
  }
}

onMounted(loadOverview);
watch(
  () => route.params.addr,
  () => {
    account.value = null;
    counters.value = null;
    activeTab.value = "transactions";
    showQr.value = false;
    loadOverview();
  }
);
useNetworkChange(loadOverview);
</script>
