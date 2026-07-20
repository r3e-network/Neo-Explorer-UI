<template>
  <div class="x-block-detail-page">
    <div class="page-container py-6">
      <Breadcrumb
        :items="[
          { label: tf('breadcrumb.home', 'Home'), to: '/homepage' },
          { label: tf('neoX.chainName', 'Neo X'), to: '/x' },
          { label: tf('pageTitles.xBlocks', 'Blocks'), to: '/x/blocks' },
          {
            label:
              block && block.index != null
                ? `${tf('neoX.block', 'Block')} #${formatInt(block.index)}`
                : tf('neoX.block', 'Block'),
          },
        ]"
      />

      <!-- Hero — hidden while loading/error so stale data never sits next to either state -->
      <div v-if="!error && !loading && block" class="detail-hero detail-hero-circuit detail-hero-enhanced animate-page-enter">
        <span class="circuit-particle"></span>
        <span class="circuit-particle"></span>
        <span class="circuit-particle"></span>
        <span class="circuit-particle"></span>

        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex items-start gap-3">
            <div class="page-header-icon bg-icon-primary relative">
              <svg class="h-6 w-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
              </svg>
              <span class="glow-dot absolute -right-0.5 -bottom-0.5"></span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="page-title neon-glow-text">{{ tf("neoX.block", "Block") }} #{{ formatInt(block.index) }}</h1>
                <span
                  v-if="antiMevProtection.active"
                  class="inline-flex items-center rounded border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300"
                >Anti-MEV Era</span>
              </div>
              <p class="page-subtitle mt-1 flex flex-wrap items-center gap-3">
                <span>{{ timeAgo(block.timestampMs) }}</span>
                <span class="font-hash max-w-[180px] truncate text-xs text-low sm:max-w-xs">{{ block.hash }}</span>
                <CopyButton :text="block.hash" size="xs" />
              </p>
            </div>
          </div>

          <!-- Prev / Next navigation -->
          <div class="mt-2 flex items-center gap-2 sm:mt-0" role="group">
            <RouterLink
              v-if="block.index > 0"
              :to="`/x/block-info/${block.index - 1}`"
              class="panel-muted list-row inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-mid transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 hover:text-primary-500 hover:border-primary-300 dark:hover:border-primary-800"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              {{ tf("neoX.prevBlock", "Prev") }}
            </RouterLink>
            <span
              v-else
              class="panel-muted list-row inline-flex cursor-not-allowed items-center gap-1 px-3 py-1.5 text-xs font-medium text-mid opacity-40"
              aria-disabled="true"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              {{ tf("neoX.prevBlock", "Prev") }}
            </span>
            <RouterLink
              :to="`/x/block-info/${block.index + 1}`"
              class="panel-muted list-row inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-mid transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 hover:text-primary-500 hover:border-primary-300 dark:hover:border-primary-800"
            >
              {{ tf("neoX.nextBlock", "Next") }}
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-6">
        <div class="etherscan-card p-6">
          <Skeleton width="30%" height="24px" class="mb-6" />
          <div class="space-y-4">
            <div v-for="i in 10" :key="'skel-' + i" class="flex gap-4">
              <Skeleton width="120px" height="18px" />
              <Skeleton width="60%" height="18px" />
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <!-- The error branch only fires on transport failure — a true 404 renders the
           not-found empty state below, so title this as an outage, not "not found". -->
      <ErrorState v-else-if="error" :title="tf('neoX.blocksErrorTitle', 'Unable to load blocks')" :message="error" @retry="load" />

      <EmptyState v-else-if="notFound" :message="tf('neoX.notFound', 'Block not found.')" icon="block" />

      <div v-else-if="block" class="space-y-6">
        <section
          v-if="antiMevProtection.active"
          class="flex flex-col gap-4 border-y border-line-soft py-4 lg:flex-row lg:items-center lg:justify-between animate-page-enter animate-page-enter-delay-1"
          aria-label="Neo X Anti-MEV consensus status"
        >
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-sm font-semibold text-high">PreBlock / Shadow Block ordering</h2>
              <span class="rounded bg-status-success-bg px-2 py-0.5 text-[10px] font-semibold text-status-success">Active</span>
            </div>
            <p class="mt-1 text-xs text-mid">
              Enhanced dBFT fixes transaction order before PreCommit threshold decryption and final block commitment.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <span><strong class="text-high">PreCommit</strong><span class="ml-1 text-mid">2f+1 shares</span></span>
            <span><strong class="text-high">Finality</strong><span class="ml-1 text-mid">Single block</span></span>
            <span><strong class="text-high">Envelope records</strong><span class="ml-1 text-mid">{{ envelopeRecordCount }}</span></span>
            <RouterLink to="/x/anti-mev" class="etherscan-link font-semibold">Anti-MEV Center</RouterLink>
          </div>
        </section>

        <!-- Metrics -->
        <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4 animate-page-enter animate-page-enter-delay-1">
          <DashboardStatCard
            :label="tf('neoX.transactions', 'Transactions')"
            :value="block.txCount"
            :animated="true"
            glow-color="#00b377"
          />
          <DashboardStatCard
            :label="tf('neoX.gasUsed', 'Gas Used')"
            :value="block.gasUsedPercentage"
            suffix="%"
            :decimals="2"
            :animated="block.gasUsedPercentage != null"
            :subtitle="`${formatInt(block.gasUsed)} / ${formatInt(block.gasLimit)}`"
            glow-color="#4f8fff"
          />
          <DashboardStatCard
            :label="tf('neoX.baseFee', 'Base Fee')"
            :value="baseFeeGwei"
            suffix=" Gwei"
            :decimals="2"
            :animated="baseFeeGwei != null"
            glow-color="#a78bfa"
          />
          <DashboardStatCard
            :label="tf('neoX.burntFees', 'Burnt Fees')"
            :value="burntFeesGas"
            :decimals="6"
            :animated="burntFeesGas != null"
            :subtitle="block.burntFeesPercentage != null ? `${block.burntFeesPercentage.toFixed(2)}%` : ''"
            glow-color="#fb923c"
          />
        </div>

        <!-- Overview -->
        <div class="etherscan-card card-tilt gradient-border-card overflow-hidden animate-page-enter animate-page-enter-delay-2">
          <div class="card-header">
            <h2 class="text-high text-base font-semibold">{{ tf("neoX.overview", "Overview") }}</h2>
          </div>
          <div class="p-4 md:p-6">
            <InfoRow :label="tf('neoX.height', 'Block Height')">{{ formatInt(block.index) }}</InfoRow>

            <InfoRow :label="tf('neoX.hash', 'Hash')" copyable :copy-value="block.hash">
              <span class="font-mono text-sm break-all">{{ block.hash }}</span>
            </InfoRow>

            <InfoRow :label="tf('neoX.timestamp', 'Timestamp')">
              {{ formatTimestamp(block.timestampMs) }} · {{ timeAgo(block.timestampMs) }}
            </InfoRow>

            <InfoRow v-if="block.prevHash" :label="tf('neoX.parentHash', 'Parent Hash')">
              <XHashLink type="block" :hash="block.prevHash" :truncate="false" copyable />
            </InfoRow>

            <InfoRow :label="tf('neoX.primaryValidator', 'Primary Validator')">
              <span v-if="block.primaryValidator" class="inline-flex min-w-0 flex-wrap items-center gap-2">
                <XHashLink type="address" :hash="block.primaryValidator" :truncate="false" copyable />
                <span v-if="block.primaryPosition != null" class="badge-soft whitespace-nowrap text-xs">
                  {{ tf("neoX.consensusPosition", "Consensus Position") }} #{{ block.primaryPosition
                  }}<template v-if="block.consensusSize">/{{ block.consensusSize }}</template>
                </span>
              </span>
              <span v-else-if="block.primaryPosition != null" class="text-mid">
                {{ tf("neoX.consensusPosition", "Consensus Position") }} #{{ block.primaryPosition }}
              </span>
              <span v-else class="text-mid">—</span>
            </InfoRow>

            <InfoRow :label="tf('neoX.feeRecipient', 'Fee Recipient')">
              <XHashLink v-if="block.miner" type="address" :hash="block.miner" :truncate="false" copyable />
              <span v-else class="text-mid">—</span>
            </InfoRow>

            <InfoRow :label="tf('neoX.size', 'Size')">{{ formatInt(block.size) }} {{ tf("neoX.bytes", "bytes") }}</InfoRow>

            <InfoRow :label="tf('neoX.gasUsedLimit', 'Gas Used / Limit')">
              <span class="inline-flex flex-wrap items-center gap-2">
                <span>{{ formatInt(block.gasUsed) }} / {{ formatInt(block.gasLimit) }}</span>
                <span v-if="block.gasUsedPercentage != null" class="bg-line-soft inline-block h-1.5 w-40 overflow-hidden rounded-full">
                  <span
                    class="bg-primary-500 block h-full rounded-full"
                    :style="{ width: `${Math.min(100, block.gasUsedPercentage)}%` }"
                  ></span>
                </span>
                <span v-if="block.gasUsedPercentage != null" class="text-mid text-xs">
                  {{ block.gasUsedPercentage.toFixed(2) }}%
                </span>
              </span>
            </InfoRow>

            <InfoRow v-if="block.baseFeePerGas != null" :label="tf('neoX.baseFee', 'Base Fee')">
              {{ formatGwei(block.baseFeePerGas) }} Gwei
            </InfoRow>

            <InfoRow v-if="block.priorityFee != null" :label="tf('neoX.priorityFee', 'Priority Fee')">
              {{ formatGas(block.priorityFee) }} GAS
            </InfoRow>

            <InfoRow v-if="block.transactionFees != null" :label="tf('neoX.transactionFees', 'Transaction Fees')">
              {{ formatGas(block.transactionFees) }} GAS
            </InfoRow>

            <InfoRow v-if="block.burntFees != null" :label="tf('neoX.burntFees', 'Burnt Fees')">
              <span>{{ formatGas(block.burntFees) }} GAS</span>
              <span v-if="block.burntFeesPercentage != null" class="text-mid ml-1.5 text-xs">
                ({{ block.burntFeesPercentage.toFixed(2) }}%)
              </span>
            </InfoRow>

            <InfoRow :label="tf('neoX.internalTxns', 'Internal Txns')">{{ formatInt(block.internalTransactionsCount) }}</InfoRow>

            <InfoRow v-if="block.nonce != null" :label="tf('neoX.nonce', 'Nonce')">
              <span class="font-mono text-sm break-all">{{ block.nonce }}</span>
            </InfoRow>

            <InfoRow v-if="block.difficulty != null" :label="tf('neoX.difficulty', 'Difficulty')">{{ block.difficulty }}</InfoRow>
          </div>
        </div>

        <!-- Transactions -->
        <div class="etherscan-card overflow-hidden animate-page-enter animate-page-enter-delay-3">
          <div class="card-header">
            <h2 class="text-high text-base font-semibold">{{ tf("neoX.transactions", "Transactions") }}</h2>
            <span class="badge-soft">{{ formatInt(block.txCount) }}</span>
          </div>
          <XTxTable :transactions="txs" :empty="emptyTxMessage" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { getNeoxNet } from "@/utils/neoxEnv";
import { blockService } from "@/services/neox";
import { formatGas, formatGwei, formatInt, formatTimestamp, timeAgo } from "@/utils/neoxFormat";
import { getNeoxBlockProtection } from "@/utils/neoxAntiMev";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import InfoRow from "@/components/common/InfoRow.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import DashboardStatCard from "@/components/charts/DashboardStatCard.vue";
import XHashLink from "@/components/common/XHashLink.vue";
import XTxTable from "./components/XTxTable.vue";

const route = useRoute();
const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const block = ref(null);
const txs = ref([]);
const txListFailed = ref(false);
const loading = ref(false);
const error = ref("");
const notFound = ref(false);
const activeNet = ref(getNeoxNet());
let reqId = 0;

const antiMevProtection = computed(() => getNeoxBlockProtection(block.value?.index, activeNet.value));
const envelopeRecordCount = computed(() => txs.value.filter((transaction) => transaction?.antiMev).length);

const baseFeeGwei = computed(() => {
  const wei = Number(block.value?.baseFeePerGas);
  if (!Number.isFinite(wei)) return null;
  return wei / 1e9;
});

const burntFeesGas = computed(() => {
  const wei = Number(block.value?.burntFees);
  if (!Number.isFinite(wei)) return null;
  return wei / 1e18;
});

const emptyTxMessage = computed(() => {
  if (txListFailed.value || (block.value?.txCount ?? 0) > 0) {
    return tf("neoX.txUnavailable", "Transaction list temporarily unavailable");
  }
  return tf("neoX.noTransactions", "No transactions");
});

async function load() {
  const param = route.params.hash;
  if (!param) return;
  const current = ++reqId;
  block.value = null;
  txs.value = [];
  txListFailed.value = false;
  loading.value = true;
  error.value = "";
  notFound.value = false;
  try {
    const net = getNeoxNet();
    activeNet.value = net;
    const found = await blockService.getByParam(param, { net });
    if (current !== reqId) return;
    block.value = found;
    if (!found) {
      notFound.value = true;
    } else {
      // Secondary fetch: a failure here must not blank the block already shown.
      try {
        const page = await blockService.getBlockTransactions(param, { net });
        if (current !== reqId) return;
        txs.value = page.items;
      } catch (_secondaryErr) {
        // Leave the in-block tx list empty; the block detail still renders.
        if (current === reqId) txListFailed.value = true;
      }
    }
  } catch (_err) {
    if (current === reqId) {
      block.value = null;
      error.value = tf("errors.loadFailed", "Failed to load block.");
    }
  } finally {
    if (current === reqId) loading.value = false;
  }
}

onMounted(load);
watch(() => route.params.hash, load);
useNetworkChange(load);
</script>
