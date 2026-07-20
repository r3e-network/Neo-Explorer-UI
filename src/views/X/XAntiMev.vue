<template>
  <div class="x-anti-mev-page">
    <div class="page-container py-6">
      <Breadcrumb
        :items="[
          { label: tf('breadcrumb.home', 'Home'), to: '/homepage' },
          { label: tf('neoX.chainName', 'Neo X'), to: '/x' },
          { label: 'Anti-MEV' },
        ]"
      />

      <section class="detail-hero detail-hero-enhanced animate-page-enter">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex min-w-0 items-start gap-3">
            <div class="page-header-icon bg-slate-950 p-2 dark:bg-black">
              <img src="/img/brand/neox-mark.svg" alt="Neo X" class="h-full w-full object-contain" />
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="page-title">Anti-MEV Center</h1>
                <span v-if="status?.active === true" class="rounded bg-status-success-bg px-2 py-0.5 text-xs font-semibold text-status-success">
                  Active
                </span>
                <span v-else-if="status?.active === false" class="rounded bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning">
                  Not active at head
                </span>
                <span v-else class="badge-soft text-xs">Status unavailable</span>
              </div>
              <p class="page-subtitle mt-1">{{ netLabel }} · Enveloped Transactions · Enhanced dBFT</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <a :href="senderUrl" target="_blank" rel="noopener noreferrer" class="btn-primary">Open Anti-MEV Sender</a>
            <a :href="docsUrl" target="_blank" rel="noopener noreferrer" class="btn-outline">Protocol Docs</a>
          </div>
        </div>
      </section>

      <div v-if="loading && !status" class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton v-for="item in 4" :key="item" height="112px" />
      </div>
      <ErrorState v-else-if="error && !status" class="mt-6" :message="error" @retry="loadStatus" />
      <section v-else class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-page-enter animate-page-enter-delay-1">
        <div class="etherscan-card p-4">
          <p class="stat-label">Protocol</p>
          <p class="mt-2 text-xl font-bold text-high">{{ protocolStatusLabel }}</p>
          <p class="mt-1 text-xs text-mid">Since block {{ formatInt(profile.activationHeight) }} · {{ profile.activationVersion }}</p>
        </div>
        <div class="etherscan-card p-4">
          <p class="stat-label">Envelope Fee</p>
          <p class="mt-2 text-xl font-bold text-high">{{ envelopeFeeLabel }}</p>
          <p class="mt-1 text-xs text-mid">Live node policy</p>
        </div>
        <div class="etherscan-card p-4">
          <p class="stat-label">Latest DKG Round</p>
          <p class="mt-2 text-xl font-bold text-high">{{ status?.latestDkgRound ?? "—" }}</p>
          <p class="mt-1 text-xs text-mid">Observed public Envelope records</p>
        </div>
        <div class="etherscan-card p-4">
          <p class="stat-label">Finality</p>
          <p class="mt-2 text-xl font-bold text-high">Single block</p>
          <p class="mt-1 text-xs text-mid">Threshold block signatures</p>
        </div>
      </section>

      <section class="mt-6 border-y border-line-soft py-5 animate-page-enter animate-page-enter-delay-2" aria-labelledby="anti-mev-flow-title">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="anti-mev-flow-title" class="text-base font-semibold text-high">Consensus protection flow</h2>
            <p class="mt-1 text-xs text-mid">Order commitment precedes threshold decryption.</p>
          </div>
          <span class="badge-soft text-xs">2f+1 validator threshold</span>
        </div>
        <ol class="grid gap-3 md:grid-cols-4">
          <li v-for="(step, index) in flowSteps" :key="step.title" class="min-w-0 border-l-2 border-primary-400 px-3 py-1">
            <p class="text-[10px] font-semibold uppercase text-low">Phase {{ index + 1 }}</p>
            <p class="mt-1 text-sm font-semibold text-high">{{ step.title }}</p>
            <p class="mt-1 text-xs leading-relaxed text-mid">{{ step.detail }}</p>
          </li>
        </ol>
      </section>

      <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section class="etherscan-card overflow-hidden" aria-labelledby="envelope-inspector-title">
          <header class="card-header">
            <div>
              <h2 id="envelope-inspector-title" class="text-base font-semibold text-high">Envelope Inspector</h2>
              <p class="mt-0.5 text-xs text-mid">Transaction hash or raw calldata</p>
            </div>
          </header>
          <form class="p-4 md:p-5" @submit.prevent="inspectInput">
            <label for="anti-mev-input" class="mb-2 block text-sm font-medium text-high">Public input</label>
            <textarea
              id="anti-mev-input"
              v-model="inspectorInput"
              rows="4"
              spellcheck="false"
              class="w-full resize-y rounded-lg border border-line-soft bg-surface px-3 py-2 font-hash text-xs text-high outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              placeholder="0x transaction hash or 0xffffffff Envelope calldata"
            ></textarea>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <button type="submit" class="btn-primary" :disabled="inspecting || !inspectorInput.trim()">
                {{ inspecting ? "Inspecting..." : "Inspect Envelope" }}
              </button>
              <button v-if="status?.recentEnvelopes?.length" type="button" class="btn-outline" @click="inspectTransaction(status.recentEnvelopes[0])">
                Load recent record
              </button>
            </div>

            <p v-if="inspectError" role="alert" class="mt-4 rounded border border-status-error/30 bg-status-error-bg px-3 py-2 text-sm text-status-error">
              {{ inspectError }}
            </p>

            <dl v-if="inspection" class="soft-divider mt-5 divide-y border-y">
              <div class="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-4">
                <dt class="text-xs text-mid">Structure</dt>
                <dd class="text-sm font-semibold" :class="inspection.isStructurallyValid ? 'text-status-success' : 'text-status-warning'">
                  {{ inspection.isStructurallyValid ? "Valid public Envelope layout" : "Envelope-like, structurally invalid" }}
                </dd>
              </div>
              <div class="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-4">
                <dt class="text-xs text-mid">DKG round</dt>
                <dd class="font-hash text-sm text-high">{{ inspection.dkgRound ?? "—" }}</dd>
              </div>
              <div class="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-4">
                <dt class="text-xs text-mid">Reserved gas</dt>
                <dd class="font-hash text-sm text-high">{{ formatInt(inspection.encryptedGas) }}</dd>
              </div>
              <div class="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-4">
                <dt class="text-xs text-mid">Inner transaction commitment</dt>
                <dd class="min-w-0 break-all font-hash text-xs text-high">{{ inspection.innerTransactionHash || "—" }}</dd>
              </div>
              <div class="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-4">
                <dt class="text-xs text-mid">Encrypted payload</dt>
                <dd class="font-hash text-sm text-high">{{ formatInt(inspection.encryptedPayloadBytes) }} bytes</dd>
              </div>
            </dl>

            <p v-if="inspection?.canonicalRecord" class="mt-4 text-xs leading-relaxed text-mid">
              This outer Envelope remains in the canonical block. Public explorer data cannot prove successful inner-transaction decryption from this record alone.
            </p>
          </form>
        </section>

        <section class="etherscan-card overflow-hidden" aria-labelledby="recent-envelope-title">
          <header class="card-header">
            <div>
              <h2 id="recent-envelope-title" class="text-base font-semibold text-high">Recent Envelope Records</h2>
              <p class="mt-0.5 text-xs text-mid">GovReward calls with the reserved `0xffffffff` prefix</p>
            </div>
            <RouterLink :to="`/x/address/${govRewardAddress}`" class="btn-outline text-xs">GovReward</RouterLink>
          </header>
          <div v-if="status?.recentEnvelopes?.length" class="overflow-x-auto">
            <table class="w-full min-w-[800px]">
              <thead class="table-head">
                <tr>
                  <th class="table-header-cell">Transaction</th>
                  <th class="table-header-cell">Structure</th>
                  <th class="table-header-cell">Block</th>
                  <th class="table-header-cell">DKG Round</th>
                  <th class="table-header-cell">Reserved Gas</th>
                  <th class="table-header-cell">Payload</th>
                  <th class="table-header-cell"><span class="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody class="soft-divider divide-y">
                <tr v-for="transaction in status.recentEnvelopes" :key="transaction.hash" class="list-row">
                  <td class="table-cell"><XHashLink type="tx" :hash="transaction.hash" /></td>
                  <td class="table-cell">
                    <span
                      class="inline-flex rounded px-2 py-0.5 text-xs font-semibold"
                      :class="
                        transaction.antiMev.isStructurallyValid
                          ? 'bg-status-success-bg text-status-success'
                          : 'bg-status-warning-bg text-status-warning'
                      "
                      :title="transaction.antiMev.issues?.join(' ') || 'Public Envelope layout is structurally valid.'"
                    >
                      {{ transaction.antiMev.isStructurallyValid ? "Valid" : "Invalid" }}
                    </span>
                  </td>
                  <td class="table-cell"><XHashLink type="block" :hash="String(transaction.blockIndex)" :label="`#${formatInt(transaction.blockIndex)}`" /></td>
                  <td class="table-cell font-hash">{{ transaction.antiMev.dkgRound }}</td>
                  <td class="table-cell">{{ formatInt(transaction.antiMev.encryptedGas) }}</td>
                  <td class="table-cell">{{ formatInt(transaction.antiMev.encryptedPayloadBytes) }} B</td>
                  <td class="table-cell text-right">
                    <button type="button" class="etherscan-link text-xs font-semibold" @click="inspectTransaction(transaction)">Inspect</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <EmptyState v-else message="No public Envelope records in the current indexer window." icon="tx" />
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { getNeoxLabel, getNeoxNet } from "@/utils/neoxEnv";
import {
  NEOX_ANTI_MEV_DOCS_URL,
  NEOX_ANTI_MEV_SENDER_URL,
  NEOX_GOV_REWARD_ADDRESS,
  getNeoxAntiMevProfile,
  parseNeoxEnvelopeData,
} from "@/utils/neoxAntiMev";
import { antiMevService, transactionService } from "@/services/neox";
import { formatGwei, formatInt } from "@/utils/neoxFormat";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import XHashLink from "@/components/common/XHashLink.vue";

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const status = ref(null);
const loading = ref(true);
const error = ref("");
const inspectorInput = ref("");
const inspection = ref(null);
const inspectError = ref("");
const inspecting = ref(false);
const activeNet = ref(getNeoxNet());
let requestId = 0;

const docsUrl = NEOX_ANTI_MEV_DOCS_URL;
const senderUrl = NEOX_ANTI_MEV_SENDER_URL;
const govRewardAddress = NEOX_GOV_REWARD_ADDRESS;
const profile = computed(() => getNeoxAntiMevProfile(activeNet.value));
const netLabel = computed(() => getNeoxLabel(activeNet.value));
const protocolStatusLabel = computed(() => {
  if (status.value?.active === true) return "Active";
  if (status.value?.active === false) return "Inactive";
  return "Unavailable";
});
const envelopeFeeLabel = computed(() =>
  status.value?.envelopeFeeWei == null ? "Unavailable" : `${formatGwei(status.value.envelopeFeeWei)} Gwei`
);

const flowSteps = [
  { title: "Envelope", detail: "Transaction details are encrypted before consensus." },
  { title: "PreBlock / Shadow Block", detail: "PrepareResponse fixes transaction order before decryption." },
  { title: "PreCommit", detail: "At least 2f+1 validators contribute decryption shares." },
  { title: "Final Block", detail: "Decrypted execution is committed with single-block finality." },
];

async function loadStatus() {
  const current = ++requestId;
  loading.value = true;
  error.value = "";
  activeNet.value = getNeoxNet();
  try {
    const result = await antiMevService.getStatus({ net: activeNet.value, force: true });
    if (current === requestId) status.value = result;
  } catch (_err) {
    if (current === requestId) error.value = "Unable to load live Anti-MEV status.";
  } finally {
    if (current === requestId) loading.value = false;
  }
}

function inspectTransaction(transaction) {
  inspectorInput.value = transaction.hash || transaction.rawInput || "";
  inspection.value = transaction.antiMev || parseNeoxEnvelopeData(transaction.rawInput);
  inspectError.value = inspection.value ? "" : "This transaction is not a recognized Neo X Envelope.";
}

async function inspectInput() {
  const value = inspectorInput.value.trim();
  inspection.value = null;
  inspectError.value = "";
  if (!value) return;

  if (/^0x[0-9a-f]{64}$/i.test(value)) {
    inspecting.value = true;
    try {
      const transaction = await transactionService.getByHash(value, { net: activeNet.value });
      if (!transaction) inspectError.value = "Transaction not found on the selected Neo X network.";
      else inspectTransaction(transaction);
    } catch (_err) {
      inspectError.value = "Unable to load the transaction from the Neo X indexer.";
    } finally {
      inspecting.value = false;
    }
    return;
  }

  inspection.value = parseNeoxEnvelopeData(value);
  if (!inspection.value) inspectError.value = "Input does not contain the Neo X Envelope prefix and layout.";
}

onMounted(loadStatus);
useAutoRefresh(loadStatus, { intervalMs: 30_000, immediate: true });
</script>
