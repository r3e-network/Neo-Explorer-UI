<template>
  <div data-testid="council-status-panel" class="etherscan-card overflow-hidden card-tilt gradient-border-card">
    <div class="border-b border-line-soft bg-surface/30 px-6 py-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-black text-high tracking-tight">{{ $t('stateChange.councilVoteStatus') }}</h2>
          <p class="mt-1.5 text-xs text-mid max-w-[250px] leading-relaxed">
            {{ $t('tools.governance.councilVoteStatusDesc') }}
          </p>
        </div>
        <span
          class="inline-flex items-center rounded-xl border border-line-soft bg-surface-muted px-3 py-1.5 text-xs font-black tracking-widest text-low shadow-inner"
        >
          {{ signedCount }} / {{ requiredCount }}
        </span>
      </div>
    </div>

    <div class="p-5 space-y-3">
      <div
        v-for="signer in signerRows"
        :key="signer.address"
        class="flex items-center justify-between gap-3 rounded-2xl border border-line-soft bg-surface-muted/30 px-4 py-3.5 hover:bg-surface-muted/60 transition-colors duration-200"
        :class="{
          'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/20': signer.signed,
        }"
      >
        <div class="flex min-w-0 items-center gap-3.5" :title="signer.address">
          <img
            :src="signer.logo"
            :data-logo-fallback-index="0"
            :data-testid="`council-status-logo-${signer.address}`"
            alt=""
            class="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm bg-white shrink-0 dark:ring-slate-800"
            @error="handleCouncilLogoError($event, signer.logoSources)"
          />
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <div class="font-bold text-sm text-high truncate tracking-tight">{{ signer.name }}</div>
              <span
                v-if="signer.address === connectedAccount"
                class="rounded-md bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
              >
                You
              </span>
            </div>
            <div
              class="text-[10px] uppercase tracking-[0.18em] font-semibold"
              :class="signer.signed ? 'text-emerald-600 dark:text-emerald-400' : 'text-low'"
            >
              {{ signer.signed ? $t("tools.governance.witnessStored") : $t("tools.governance.awaitingWitness") }}
            </div>
          </div>
        </div>
        <div
          class="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm"
          :class="signer.signed ? 'bg-emerald-500 text-white' : 'bg-surface-elevated text-mid border border-line-soft'"
        >
          {{ signer.signed ? $t("tools.governance.voted") : $t("tools.governance.pending") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { handleCouncilLogoError } from "@/utils/governanceHelpers";

defineProps({
  signerRows: { type: Array, required: true },
  signedCount: { type: Number, required: true },
  requiredCount: { type: Number, required: true },
  connectedAccount: { type: String, default: "" },
});
</script>
