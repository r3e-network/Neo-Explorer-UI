<template>
  <div>
    <Breadcrumb
      :items="[
        { label: $t('nav.home'), to: '/homepage' },
        { label: $t('tools.title'), to: '/tools' },
        { label: $t('tools.governance.breadcrumb') },
      ]"
    />

    <div
      class="mb-6 overflow-hidden rounded-[32px] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-xl shadow-amber-900/5 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950"
    >
      <div class="relative p-6 md:p-8">
        <div
          class="pointer-events-none absolute -right-20 -top-12 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/10"
        ></div>
        <div
          class="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full bg-orange-300/10 blur-3xl dark:bg-orange-500/10"
        ></div>

        <div class="relative grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <div>
            <div class="mb-4 flex flex-wrap items-center gap-2">
              <span
                class="inline-flex items-center rounded-full border border-amber-200/80 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 dark:border-amber-900/40 dark:bg-slate-950/50 dark:text-amber-400"
              >
                {{ $t("tools.governance.publicOversight") }}
              </span>
              <span
                class="inline-flex items-center rounded-full border border-line-soft bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-low dark:bg-slate-950/50"
              >
                {{ activeNetworkLabel }}
              </span>
              <span
                v-if="committeeMultiSig"
                class="inline-flex items-center rounded-full border border-line-soft bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-low dark:bg-slate-950/50"
              >
                {{ $t("tools.governance.quorum", { threshold, size: committeeSize }) }}
              </span>
            </div>

            <div class="flex items-start gap-4">
              <div
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20"
              >
                <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.8"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  ></path>
                </svg>
              </div>
              <div class="min-w-0">
                <h1 class="page-title">{{ $t("tools.governance.title") }}</h1>
                <p class="page-subtitle max-w-3xl">
                  {{ $t("tools.governance.headerSubtitle") }}
                </p>
              </div>
            </div>

            <div class="mt-5 grid gap-4 md:grid-cols-3">
              <div
                class="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70"
              >
                <div class="text-[10px] font-black uppercase tracking-[0.18em] text-low">
                  {{ $t("tools.governance.proposalQueue") }}
                </div>
                <div class="mt-2 text-3xl font-black tracking-tight text-high">{{ pendingRequestCount }}</div>
                <p class="mt-1 text-sm text-mid">{{ requestQueueHeadline }}</p>
              </div>
              <div
                class="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70"
              >
                <div class="text-[10px] font-black uppercase tracking-[0.18em] text-low">
                  {{ $t("tools.governance.signaturePressure") }}
                </div>
                <div class="mt-2 text-3xl font-black tracking-tight text-high">{{ collectedSignatureCount }}</div>
                <p class="mt-1 text-sm text-mid">{{ $t("tools.governance.signaturePressureDesc") }}</p>
              </div>
              <div
                class="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70"
              >
                <div class="text-[10px] font-black uppercase tracking-[0.18em] text-low">
                  {{ $t("tools.governance.readyToBroadcast") }}
                </div>
                <div class="mt-2 text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {{ readyToBroadcastCount }}
                </div>
                <p class="mt-1 text-sm text-mid">{{ $t("tools.governance.readyToBroadcastDesc") }}</p>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div
              class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70"
            >
              <div class="text-[10px] font-black uppercase tracking-[0.2em] text-low mb-3">
                {{ $t("tools.governance.committeeSnapshot") }}
              </div>
              <div v-if="committeeMultiSig" class="space-y-3">
                <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
                  <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">
                    {{ $t("tools.governance.committeeMultiSig") }}
                  </div>
                  <div class="mt-2 font-mono text-xs break-all text-high">{{ committeeMultiSig.address }}</div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
                    <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">
                      {{ $t("tools.governance.threshold") }}
                    </div>
                    <div class="mt-1 text-xl font-black text-high">{{ threshold }}</div>
                  </div>
                  <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
                    <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">
                      {{ $t("tools.governance.committeeSize") }}
                    </div>
                    <div class="mt-1 text-xl font-black text-high">{{ committeeSize }}</div>
                  </div>
                </div>
              </div>
              <div
                v-else
                class="rounded-2xl border border-dashed border-line-soft bg-surface-muted/50 p-4 text-sm text-mid"
              >
                {{ $t("tools.governance.committeeLoading") }}
              </div>
            </div>

            <div
              class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70"
            >
              <div class="text-[10px] font-black uppercase tracking-[0.2em] text-low mb-3">
                {{ $t("tools.governance.actionGate") }}
              </div>
              <p class="text-sm text-mid leading-relaxed">
                {{ $t("tools.governance.actionGateDesc") }}
              </p>
              <div class="mt-4 flex flex-wrap gap-3">
                <button
                  v-if="!connectedAccount"
                  disabled
                  class="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-low cursor-not-allowed"
                >
                  {{ $t("tools.governance.connectInHeader") }}
                </button>
                <button
                  v-else-if="!canCreateProposal"
                  disabled
                  class="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-low cursor-not-allowed"
                  :title="
                    isGovernanceLabModeAvailable
                      ? $t('tools.governance.labSignerTitle')
                      : $t('tools.governance.notCouncilNodeTitle')
                  "
                >
                  {{ $t("tools.governance.notCouncilNode") }}
                </button>
                <button
                  v-else
                  @click="$emit('create-proposal')"
                  class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  {{ $t("tools.governance.newProposal") }}
                </button>
              </div>
            </div>

            <GovernanceCouncilWalletSetupCard
              :committee-multi-sig="committeeMultiSig"
              :committee-pubkeys="committeePubkeys"
              :threshold="threshold"
              :committee-size="committeeSize"
              :connected-account="connectedAccount"
              :active-network-label="activeNetworkLabel"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- How to Sign Guide -->
    <div class="mb-6 rounded-2xl border border-line-soft bg-surface/50 overflow-hidden">
      <button
        @click="showSigningGuide = !showSigningGuide"
        class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-muted/50 transition-colors"
      >
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-bold text-high">How Council Members Sign Governance Proposals</span>
        </div>
        <svg class="w-4 h-4 text-mid transition-transform" :class="showSigningGuide ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div v-if="showSigningGuide" class="px-6 pb-5 space-y-4 border-t border-line-soft pt-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2 dark:bg-emerald-950/20 dark:border-emerald-900/40">
            <p class="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Option A: Direct WIF (Recommended for Testing)</p>
            <ol class="text-xs text-mid list-decimal pl-4 space-y-1">
              <li>Click <strong>Connect Wallet</strong> in the header</li>
              <li>Select <strong>"Direct WIF (Council)"</strong></li>
              <li>Paste your WIF private key → Connect</li>
              <li>Click <strong>Sign</strong> on any proposal → <strong>Sign with Wallet</strong></li>
            </ol>
            <p class="text-[11px] text-mid">Your key stays in browser session memory only (cleared on tab close).</p>
          </div>

          <div class="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 space-y-2 dark:bg-sky-950/20 dark:border-sky-900/40">
            <p class="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">Option B: Offline Signing (Most Secure)</p>
            <ol class="text-xs text-mid list-decimal pl-4 space-y-1">
              <li>Click <strong>Sign</strong> on a proposal</li>
              <li>The <strong>Signing Payload</strong> is auto-prepared</li>
              <li>Copy the <strong>neon-js command</strong> and run it in your terminal</li>
              <li>Paste the 128-char hex output into the <strong>Submit Witness</strong> section</li>
            </ol>
            <p class="text-[11px] text-mid">Your private key never touches the browser. Sign with neo-cli or any ECDSA tool.</p>
          </div>
        </div>

        <div class="rounded-xl bg-slate-950 p-3 dark:bg-slate-900">
          <p class="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-1">Example neon-js signing command</p>
          <code class="block font-mono text-[10px] text-emerald-300">node -e "const n=require('@cityofzion/neon-js');console.log(n.wallet.sign('PAYLOAD_HEX','YOUR_WIF'))"</code>
        </div>

        <p class="text-[11px] text-mid">
          Once {{ threshold }} of {{ committeeSize }} council members submit valid signatures, the proposal can be broadcast to the network.
          Each signature is verified against the governance payload before storage.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import GovernanceCouncilWalletSetupCard from "@/views/Tools/components/GovernanceCouncilWalletSetupCard.vue";

const showSigningGuide = ref(false);

defineProps({
  committeeMultiSig: { type: Object, default: null },
  committeePubkeys: { type: Array, default: () => [] },
  threshold: { type: Number, default: 0 },
  committeeSize: { type: Number, default: 0 },
  activeNetworkLabel: { type: String, default: "" },
  pendingRequestCount: { type: Number, default: 0 },
  collectedSignatureCount: { type: Number, default: 0 },
  readyToBroadcastCount: { type: Number, default: 0 },
  requestQueueHeadline: { type: String, default: "" },
  connectedAccount: { type: String, default: null },
  canCreateProposal: { type: Boolean, default: false },
  isGovernanceLabModeAvailable: { type: Boolean, default: false },
});

defineEmits(["create-proposal"]);
</script>
