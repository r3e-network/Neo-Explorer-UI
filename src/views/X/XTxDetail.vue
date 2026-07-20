<template>
  <div class="x-tx-detail-page">
    <div class="page-container py-6">
      <Breadcrumb
        :items="[
          { label: tf('breadcrumb.home', 'Home'), to: '/homepage' },
          { label: tf('neoX.chainName', 'Neo X'), to: '/x' },
          { label: tf('pageTitles.xTransactions', 'Transactions'), to: '/x/transactions' },
          { label: tf('neoX.transaction', 'Transaction') },
        ]"
      />

      <!-- Hero — hidden while error so the placeholder badge never sits next to the error banner -->
      <div v-if="!error && !loading && tx" class="detail-hero detail-hero-circuit detail-hero-enhanced animate-page-enter">
        <span class="circuit-particle"></span>
        <span class="circuit-particle"></span>
        <span class="circuit-particle"></span>
        <span class="circuit-particle"></span>

        <div class="flex items-start gap-3">
          <div class="page-header-icon relative" :class="heroIconBg">
            <svg class="h-6 w-6" :class="heroIconText" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span class="glow-dot absolute -right-0.5 -bottom-0.5" :style="{ background: statusVar }"></span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="page-title neon-glow-text">{{ tf("neoX.transaction", "Transaction") }}</h1>
              <StatusBadge :status="txStatus" />
              <XAntiMevBadge :anti-mev="tx.antiMev" />
            </div>
            <p class="page-subtitle mt-1 flex flex-wrap items-center gap-2">
              <span class="font-hash text-xs text-low break-all">{{ tx.hash }}</span>
              <CopyButton :text="tx.hash" size="xs" />
            </p>
            <div
              v-if="txStatus === 'failed'"
              class="mt-2 break-all rounded-lg border border-status-error/30 bg-status-error-bg px-3 py-2 text-xs text-status-error"
            >
              <span class="font-semibold">{{ tf("status.failed", "Failed") }}</span>
              <span v-if="tx.revertReason"> — {{ tx.revertReason }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-6">
        <div class="etherscan-card p-6">
          <Skeleton width="30%" height="24px" class="mb-6" />
          <div class="space-y-4">
            <div v-for="i in 8" :key="'skel-' + i" class="flex gap-4">
              <Skeleton width="120px" height="18px" />
              <Skeleton width="60%" height="18px" />
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <!-- Transport failure, not a 404 — the not-found state renders separately. -->
      <ErrorState v-else-if="error" :title="tf('neoX.transactionsErrorTitle', 'Unable to load transactions')" :message="error" @retry="load" />

      <EmptyState v-else-if="notFound" :message="tf('neoX.notFound', 'Transaction not found.')" icon="tx" />

      <!-- Tabbed content -->
      <template v-else-if="tx">
        <section
          v-if="tx.antiMev"
          class="mb-6 overflow-hidden rounded-lg border border-cyan-400/40 bg-cyan-500/5 animate-page-enter"
          aria-labelledby="anti-mev-envelope-title"
        >
          <div class="flex flex-col gap-3 border-b border-cyan-400/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 id="anti-mev-envelope-title" class="text-sm font-semibold text-high">Neo X Anti-MEV Envelope</h2>
                <span
                  class="rounded px-2 py-0.5 text-[10px] font-semibold"
                  :class="tx.antiMev.isStructurallyValid
                    ? 'bg-status-success-bg text-status-success'
                    : 'bg-status-warning-bg text-status-warning'"
                >
                  {{ tx.antiMev.isStructurallyValid ? "Valid public layout" : "Invalid public layout" }}
                </span>
              </div>
              <p class="mt-1 text-xs text-mid">Encrypted outer transaction recorded through the Governance Reward contract.</p>
            </div>
            <RouterLink to="/x/anti-mev" class="btn-outline flex-shrink-0 text-xs">Open Anti-MEV Center</RouterLink>
          </div>
          <dl class="grid gap-px bg-line-soft sm:grid-cols-2 xl:grid-cols-4">
            <div class="bg-surface px-4 py-3">
              <dt class="text-[10px] font-semibold uppercase text-low">DKG Round</dt>
              <dd class="mt-1 font-hash text-sm font-semibold text-high">{{ tx.antiMev.dkgRound ?? "—" }}</dd>
            </div>
            <div class="bg-surface px-4 py-3">
              <dt class="text-[10px] font-semibold uppercase text-low">Reserved Gas</dt>
              <dd class="mt-1 font-hash text-sm font-semibold text-high">{{ formatInt(tx.antiMev.encryptedGas) }}</dd>
            </div>
            <div class="bg-surface px-4 py-3">
              <dt class="text-[10px] font-semibold uppercase text-low">Encrypted Key</dt>
              <dd class="mt-1 font-hash text-sm font-semibold text-high">{{ formatInt(tx.antiMev.encryptedKeyBytes) }} bytes</dd>
            </div>
            <div class="bg-surface px-4 py-3">
              <dt class="text-[10px] font-semibold uppercase text-low">Encrypted Message</dt>
              <dd class="mt-1 font-hash text-sm font-semibold text-high">{{ formatInt(tx.antiMev.encryptedMessageBytes) }} bytes</dd>
            </div>
          </dl>
          <div class="px-4 py-3">
            <p class="text-[10px] font-semibold uppercase text-low">Committed Inner Transaction Hash</p>
            <div class="mt-1 flex min-w-0 items-start gap-2">
              <span class="min-w-0 break-all font-hash text-xs text-high">{{ tx.antiMev.innerTransactionHash || "—" }}</span>
              <CopyButton v-if="tx.antiMev.innerTransactionHash" :text="tx.antiMev.innerTransactionHash" size="xs" />
            </div>
            <p v-if="tx.antiMev.canonicalRecord" class="mt-3 text-xs leading-relaxed text-mid">
              The outer Envelope remains in the canonical block. Public explorer fields alone do not prove that its inner transaction was successfully decrypted.
            </p>
            <ul v-if="tx.antiMev.issues.length" class="mt-3 space-y-1 text-xs text-status-warning">
              <li v-for="issue in tx.antiMev.issues" :key="issue">{{ issue }}</li>
            </ul>
          </div>
        </section>

        <!-- One-line action summary banner -->
        <div
          v-if="actionSummary"
          class="mb-6 flex items-start gap-3 rounded-xl border border-primary-500/30 bg-primary-500/10 p-4 backdrop-blur-sm animate-page-enter"
        >
          <svg
            class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-sm text-primary-800 dark:text-primary-300">
            <template v-if="actionSummary.kind === 'deploy'">
              {{ tf("neoX.summaryDeploy", "Deployed contract") }}
              <XHashLink type="address" :hash="tx.createdContract?.hash || ''" :name="tx.createdContract?.name || ''" />
            </template>
            <template v-else-if="actionSummary.kind === 'transfers'">
              {{ tf("neoX.summaryTransferred", "Transferred") }}
              <span v-for="(item, i) in actionSummary.items" :key="i" class="badge-soft mx-0.5">
                {{ item.amount != null ? item.amount : (item.tokenId != null ? `#${item.tokenId}` : "—") }}
                {{ item.symbol
                }}<template v-if="item.direction">
                  · {{ item.direction === "mint" ? tf("neoX.mint", "Mint") : tf("neoX.burn", "Burn") }}</template>
              </span>
              <span v-if="actionSummary.count > actionSummary.items.length" class="badge-soft mx-0.5">
                +{{ actionSummary.count - actionSummary.items.length }}
              </span>
            </template>
            <template v-else-if="actionSummary.kind === 'send'">
              {{ tf("neoX.summarySent", "Sent") }}
              <span class="badge-soft mx-0.5">{{ actionSummary.amount }} GAS</span>
              {{ tf("neoX.summaryTo", "to") }}
              <XHashLink v-if="tx.to" type="address" :hash="tx.to" :name="tx.toInfo?.name || ''" />
              <span v-else>{{ actionSummary.to }}</span>
            </template>
            <template v-else-if="actionSummary.kind === 'call'">
              {{ tf("neoX.summaryCalled", "Called") }}
              <span class="badge-soft mx-0.5">{{ actionSummary.method }}</span>
              {{ tf("neoX.summaryOn", "on") }}
              <XHashLink v-if="tx.to" type="address" :hash="tx.to" :name="tx.toInfo?.name || ''" />
              <span v-else>{{ actionSummary.target }}</span>
            </template>
          </p>
        </div>

        <div class="etherscan-card overflow-hidden animate-page-enter animate-page-enter-delay-1">
          <div class="p-3 pb-0">
            <TabsNav :tabs="tabs" v-model="activeTab" id-base="x-tx" />
          </div>

            <div :key="activeTab" class="p-4 pt-5 md:p-5">
              <!-- Overview -->
              <section
                v-if="activeTab === 'overview'"
                id="x-tx-overview-panel"
                role="tabpanel"
                aria-labelledby="x-tx-overview-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <div class="soft-divider divide-y">
                  <InfoRow :label="tf('neoX.txHash', 'Tx Hash')" copyable :copy-value="tx.hash">
                    <span class="font-mono text-sm break-all">{{ tx.hash }}</span>
                  </InfoRow>

                  <InfoRow :label="tf('neoX.status', 'Status')">
                    <span class="inline-flex flex-wrap items-center gap-2">
                      <StatusBadge :status="txStatus" />
                      <span v-if="tx.confirmations > 0" class="text-mid text-xs">
                        {{ formatInt(tx.confirmations) }} {{ tf("neoX.blockConfirmations", "Block Confirmations") }}
                      </span>
                    </span>
                  </InfoRow>

                  <InfoRow v-if="tx.blockIndex != null" :label="tf('neoX.block', 'Block')">
                    <XHashLink type="block" :hash="String(tx.blockIndex)" :label="`#${formatInt(tx.blockIndex)}`" />
                  </InfoRow>

                  <InfoRow :label="tf('neoX.timestamp', 'Timestamp')">
                    <span>{{ formatTimestamp(tx.timestampMs) }} · {{ timeAgo(tx.timestampMs) }}</span>
                    <span v-if="confirmationSeconds" class="text-mid ml-1.5 text-xs">
                      ({{ tf("neoX.confirmedWithin", "Confirmed within") }} {{ confirmationSeconds }}s)
                    </span>
                  </InfoRow>

                  <InfoRow :label="tf('neoX.from', 'From')">
                    <span class="inline-flex flex-wrap items-center gap-2">
                      <XHashLink
                        v-if="tx.sender"
                        type="address"
                        :hash="tx.sender"
                        :name="tx.fromInfo?.name || ''"
                        :truncate="false"
                        copyable
                      />
                      <span v-else class="text-mid">—</span>
                      <span
                        v-if="tx.fromInfo?.isVerified"
                        class="inline-flex items-center rounded bg-status-success-bg px-2 py-0.5 text-xs font-semibold text-status-success"
                      >{{ tf("neoX.verified", "Verified") }}</span>
                    </span>
                  </InfoRow>

                  <InfoRow :label="tf('neoX.to', 'To')">
                    <span class="inline-flex flex-wrap items-center gap-2">
                      <template v-if="tx.to">
                        <XHashLink type="address" :hash="tx.to" :name="tx.toInfo?.name || ''" :truncate="false" copyable />
                        <span
                          v-if="tx.toInfo?.isVerified"
                          class="inline-flex items-center rounded bg-status-success-bg px-2 py-0.5 text-xs font-semibold text-status-success"
                        >{{ tf("neoX.verified", "Verified") }}</span>
                      </template>
                      <template v-else-if="tx.createdContract?.hash">
                        <span class="badge-soft">{{ tf("neoX.contractCreation", "Contract creation") }}</span>
                        <XHashLink
                          type="address"
                          :hash="tx.createdContract.hash"
                          :name="tx.createdContract.name || ''"
                          :truncate="false"
                          copyable
                        />
                      </template>
                      <span v-else class="text-mid">—</span>
                    </span>
                  </InfoRow>

                  <InfoRow v-if="tx.method" :label="tf('neoX.method', 'Method')">
                    <span class="badge-soft">{{ tx.method }}</span>
                  </InfoRow>

                  <InfoRow v-if="tx.decodedInput" :label="tf('neoX.decodedInput', 'Decoded Input')">
                    <XDecodedInput :decoded="tx.decodedInput" />
                  </InfoRow>

                  <InfoRow :label="tf('neoX.value', 'Value')">{{ formatGas(tx.value) }} GAS</InfoRow>

                  <InfoRow :label="tf('neoX.txFee', 'Transaction Fee')">{{ formatGas(tx.fee) }} GAS</InfoRow>

                  <InfoRow v-if="tx.gasPrice != null" :label="tf('neoX.gasPrice', 'Gas Price')">
                    {{ formatGwei(tx.gasPrice) }} Gwei
                  </InfoRow>

                  <InfoRow :label="tf('neoX.gasLimitUsage', 'Gas Limit & Usage')">
                    <span class="inline-flex flex-wrap items-center gap-2">
                      <span>{{ formatInt(tx.gasUsed) }} / {{ formatInt(tx.gasLimit) }}</span>
                      <span v-if="gasPct != null" class="bg-line-soft inline-block h-1.5 w-24 overflow-hidden rounded-full">
                        <span class="bg-primary-500 block h-full rounded-full" :style="{ width: `${Math.min(100, gasPct)}%` }"></span>
                      </span>
                      <span v-if="gasPct != null" class="text-mid text-xs">{{ gasPct.toFixed(2) }}%</span>
                    </span>
                  </InfoRow>

                  <template v-if="tx.maxFeePerGas != null">
                    <InfoRow :label="tf('neoX.maxFee', 'Max Fee')">{{ formatGwei(tx.maxFeePerGas) }} Gwei</InfoRow>
                    <InfoRow v-if="tx.maxPriorityFeePerGas != null" :label="tf('neoX.maxPriorityFee', 'Max Priority Fee')">
                      {{ formatGwei(tx.maxPriorityFeePerGas) }} Gwei
                    </InfoRow>
                    <InfoRow v-if="tx.priorityFee != null" :label="tf('neoX.priorityFee', 'Priority Fee')">
                      {{ formatGas(tx.priorityFee) }} GAS
                    </InfoRow>
                    <InfoRow v-if="tx.burntFee != null" :label="tf('neoX.burntFee', 'Burnt Fee')">
                      {{ formatGas(tx.burntFee) }} GAS
                    </InfoRow>
                  </template>

                  <InfoRow v-if="tx.nonce != null" :label="tf('neoX.nonce', 'Nonce')">
                    <span>{{ tx.nonce }}</span>
                    <span v-if="tx.position != null" class="text-mid ml-1.5 text-xs">
                      ({{ tf("neoX.position", "Position") }}: {{ tx.position }})
                    </span>
                  </InfoRow>

                  <InfoRow v-if="typeBadges.length" :label="tf('neoX.type', 'Type')">
                    <span class="inline-flex flex-wrap items-center gap-1.5">
                      <span v-for="badge in typeBadges" :key="badge" class="badge-soft">{{ badge }}</span>
                    </span>
                  </InfoRow>
                </div>

                <!-- Token transfers (inlined in the tx payload) -->
                <div v-if="tx.tokenTransfers.length" class="mt-6">
                  <h3 class="text-high mb-2 text-base font-semibold">
                    {{ tf("neoX.tokenTransfers", "Token Transfers") }}
                    <span class="text-mid ml-1 text-sm font-normal">({{ tx.tokenTransfers.length }})</span>
                  </h3>
                  <div class="soft-divider divide-y">
                    <div
                      v-for="(transfer, i) in tx.tokenTransfers"
                      :key="i"
                      class="list-row flex flex-wrap items-center gap-2 rounded px-3 py-2"
                    >
                      <TokenAvatar
                        :src="transfer.token?.icon_url || ''"
                        :name="transfer.token?.name || ''"
                        :symbol="transfer.token?.symbol || ''"
                        size="sm"
                      />
                      <span class="text-high text-sm font-medium">{{ transferAmount(transfer) }}</span>
                      <router-link
                        v-if="tokenAddress(transfer)"
                        :to="`/x/token/${tokenAddress(transfer)}`"
                        class="etherscan-link font-medium"
                      >{{ transfer.token?.symbol || shortHash(tokenAddress(transfer)) }}</router-link>
                      <span v-if="transfer.type === 'token_minting'" class="badge-soft">{{ tf("neoX.mint", "Mint") }}</span>
                      <span v-if="transfer.type === 'token_burning'" class="badge-soft">{{ tf("neoX.burn", "Burn") }}</span>
                      <span class="text-low text-xs">{{ tf("neoX.from", "From") }}</span>
                      <XHashLink type="address" :hash="addressHash(transfer.from)" :name="transfer.from?.name || ''" />
                      <svg class="text-low h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <XHashLink type="address" :hash="addressHash(transfer.to)" :name="transfer.to?.name || ''" />
                    </div>
                  </div>
                </div>
              </section>

              <!-- Logs -->
              <section
                v-else-if="activeTab === 'logs'"
                id="x-tx-logs-panel"
                role="tabpanel"
                aria-labelledby="x-tx-logs-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XTxLogsTab :hash="tx.hash" @count="logsCount = $event" />
              </section>

              <!-- Internal transactions -->
              <section
                v-else-if="activeTab === 'internal'"
                id="x-tx-internal-panel"
                role="tabpanel"
                aria-labelledby="x-tx-internal-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XTxInternalTab :hash="tx.hash" />
              </section>

              <!-- State changes -->
              <section
                v-else-if="activeTab === 'state'"
                id="x-tx-state-panel"
                role="tabpanel"
                aria-labelledby="x-tx-state-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XTxStateTab :hash="tx.hash" />
              </section>

              <!-- Raw input -->
              <section
                v-else-if="activeTab === 'raw'"
                id="x-tx-raw-panel"
                role="tabpanel"
                aria-labelledby="x-tx-raw-tab"
                tabindex="0"
                class="focus:outline-none"
              >
                <XTxRawTab :raw-input="tx.rawInput || ''" :is-creation="!tx.to" :method-id="tx.decodedInput?.method_id || null" />
              </section>
            </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { getNeoxNet } from "@/utils/neoxEnv";
import { transactionService } from "@/services/neox";
import { formatGas, formatGwei, formatInt, formatUnits, formatTimestamp, timeAgo, shortHash } from "@/utils/neoxFormat";
import { buildTxActionSummary } from "@/utils/txActionSummary";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import TabsNav from "@/components/common/TabsNav.vue";
import InfoRow from "@/components/common/InfoRow.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import StatusBadge from "@/components/common/StatusBadge.vue";
import TokenAvatar from "@/components/common/TokenAvatar.vue";
import XHashLink from "@/components/common/XHashLink.vue";
import XDecodedInput from "./components/XDecodedInput.vue";
import XTxLogsTab from "./components/XTxLogsTab.vue";
import XTxInternalTab from "./components/XTxInternalTab.vue";
import XTxStateTab from "./components/XTxStateTab.vue";
import XTxRawTab from "./components/XTxRawTab.vue";
import XAntiMevBadge from "./components/XAntiMevBadge.vue";

const route = useRoute();
const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const tx = ref(null);
const loading = ref(false);
const error = ref("");
const notFound = ref(false);
const activeTab = ref("overview");
const logsCount = ref(null);
let reqId = 0;

const txStatus = computed(() => {
  if (!tx.value) return "pending";
  if (tx.value.blockIndex == null) return "pending";
  if (tx.value.status === "error") return "failed";
  if (tx.value.status === "ok") return "success";
  return "pending";
});

const statusVar = computed(() => {
  if (txStatus.value === "success") return "var(--status-success)";
  if (txStatus.value === "failed") return "var(--status-error)";
  return "var(--status-warning)";
});

const heroIconBg = computed(() => {
  if (txStatus.value === "success") return "bg-status-success-bg";
  if (txStatus.value === "failed") return "bg-status-error-bg";
  return "bg-status-warning-bg";
});

const heroIconText = computed(() => {
  if (txStatus.value === "success") return "text-status-success";
  if (txStatus.value === "failed") return "text-status-error";
  return "text-status-warning";
});

const confirmationSeconds = computed(() => {
  const duration = tx.value?.confirmationDuration;
  if (!Array.isArray(duration) || duration.length === 0) return null;
  const ms = Number(duration[duration.length - 1]);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return (ms / 1000).toFixed(1);
});

const gasPct = computed(() => {
  const used = Number(tx.value?.gasUsed);
  const limit = Number(tx.value?.gasLimit);
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return null;
  return (used / limit) * 100;
});

const typeBadges = computed(() => {
  const badges = Array.isArray(tx.value?.transactionTypes) ? [...tx.value.transactionTypes] : [];
  const evmType = tx.value?.txType;
  if (evmType != null) badges.push(Number(evmType) === 2 ? "EIP-1559 (2)" : `Type ${evmType}`);
  return badges;
});

const actionSummary = computed(() => (tx.value && !tx.value.antiMev ? buildTxActionSummary(tx.value) : null));

const tabs = computed(() => [
  { key: "overview", label: tf("neoX.overview", "Overview") },
  { key: "logs", label: tf("neoX.logs", "Logs"), count: logsCount.value },
  { key: "internal", label: tf("neoX.internalTxns", "Internal Txns") },
  { key: "state", label: tf("neoX.stateChanges", "State Changes") },
  { key: "raw", label: tf("neoX.rawInput", "Raw Input") },
]);

const addressHash = (value) => (value && typeof value === "object" ? value.hash : value) || "";
const tokenAddress = (transfer) => transfer.token?.address || transfer.token?.address_hash || "";
const transferAmount = (transfer) => {
  const total = transfer.total || {};
  if (total.value != null) {
    // ERC-1155 has decimals: null — 0 (whole units) is the correct fallback.
    return formatUnits(total.value, Number(total.decimals ?? transfer.token?.decimals ?? 0));
  }
  if (total.token_id != null) return `#${total.token_id}`;
  return "—";
};

async function load() {
  const hash = route.params.txhash;
  if (!hash) return;
  const current = ++reqId;
  tx.value = null;
  loading.value = true;
  error.value = "";
  notFound.value = false;
  activeTab.value = "overview";
  logsCount.value = null;
  try {
    const net = getNeoxNet();
    const found = await transactionService.getByHash(hash, { net });
    if (current !== reqId) return;
    tx.value = found;
    if (!found) {
      notFound.value = true;
    }
  } catch (_err) {
    if (current === reqId) {
      tx.value = null;
      error.value = tf("errors.loadFailed", "Failed to load transaction.");
    }
  } finally {
    if (current === reqId) loading.value = false;
  }
}

onMounted(load);
watch(() => route.params.txhash, load);
useNetworkChange(load);
</script>
