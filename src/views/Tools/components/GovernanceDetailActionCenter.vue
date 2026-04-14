<template>
  <div class="etherscan-card p-6 md:p-7">
    <div class="flex items-start gap-3">
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </div>
      <div>
        <h2 class="text-lg font-bold text-high">Action Center</h2>
        <p class="mt-1 text-sm text-mid">{{ actionDescription }}</p>
      </div>
    </div>

    <div class="mt-4 rounded-3xl border p-4" :class="actionToneClass">
      <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Current State</div>
      <div class="mt-2 text-base font-bold text-high">{{ actionTitle }}</div>
      <p class="mt-2 text-sm text-mid">
        {{ signedCount }} of {{ requiredCount }} council votes collected.
        <span v-if="hasSigned" class="font-semibold text-emerald-600 dark:text-emerald-400">You already voted.</span>
      </p>
    </div>

    <div v-if="proposal.status === 'EXECUTED'" class="mt-5 text-sm text-emerald-600 font-semibold">
      Executed on-chain.
    </div>
    <div v-else-if="hasSigned" class="mt-5 text-sm text-emerald-600 font-semibold">You already voted.</div>
    <div v-else class="mt-5 space-y-3">
      <div v-if="!canCurrentSignerVote" class="text-sm text-mid">
        Only eligible council nodes can sign directly with a connected wallet, but you can still collect and submit an
        external witness from another council signer.
      </div>
      <button
        v-if="canCurrentSignerVote && !hasSigned"
        class="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 hover:-translate-y-0.5 hover:bg-primary-700 transition-all"
        @click="$emit('open-sign-modal')"
      >
        Vote / Sign Proposal
      </button>
      <button
        class="w-full rounded-xl border border-line-soft bg-surface px-4 py-3 text-sm font-semibold text-high hover:bg-surface-muted transition-all"
        @click="$emit('open-sign-modal')"
      >
        Add External Witness
      </button>
      <p class="text-xs text-mid">
        The collected signature or imported witness is stored in Supabase and will be used to assemble the final
        multisig witness.
      </p>
    </div>

    <button
      v-if="thresholdMet && proposal.status !== 'EXECUTED' && !isOffchainReviewPacket"
      class="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 hover:bg-emerald-700 transition-all"
      @click="$emit('broadcast')"
    >
      Broadcast Threshold-Signed Proposal
    </button>

    <div
      v-if="isOffchainReviewPacket && proposal.status !== 'EXECUTED'"
      class="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300"
    >
      This packet is for off-chain witness collection only. Generate a fresh on-chain transaction before any broadcast.
    </div>

    <div v-if="canForkProposal" class="mt-5 border-t border-line-soft pt-5">
      <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">{{ t("tools.governance.forkProposal") }}</div>
      <p class="mt-2 text-sm text-mid">{{ t("tools.governance.forkProposalDesc") }}</p>
      <button
        data-testid="governance-fork-proposal-button"
        class="mt-3 w-full rounded-xl border border-line-soft bg-surface px-4 py-3 text-sm font-semibold text-high hover:bg-surface-muted transition-all"
        @click="$emit('fork-proposal')"
      >
        {{ t("tools.governance.forkProposal") }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();

defineProps({
  proposal: { type: Object, required: true },
  signedCount: { type: Number, required: true },
  requiredCount: { type: Number, required: true },
  thresholdMet: { type: Boolean, required: true },
  isOffchainReviewPacket: { type: Boolean, default: false },
  hasSigned: { type: Boolean, required: true },
  canCurrentSignerVote: { type: Boolean, required: true },
  actionTitle: { type: String, required: true },
  actionDescription: { type: String, required: true },
  actionToneClass: { type: String, required: true },
  canForkProposal: { type: Boolean, default: true },
});

defineEmits(["open-sign-modal", "broadcast", "fork-proposal"]);
</script>
