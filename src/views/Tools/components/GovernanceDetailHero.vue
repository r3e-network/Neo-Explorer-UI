<template>
  <div
    data-testid="governance-hero"
    class="etherscan-card overflow-hidden border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-xl shadow-amber-900/5 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950"
  >
    <div class="relative p-6 md:p-8">
      <div
        class="pointer-events-none absolute -right-20 -top-16 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-16 left-0 h-40 w-40 rounded-full bg-orange-300/10 blur-3xl dark:bg-orange-500/10"
      ></div>

      <div class="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span
              class="text-[10px] px-2.5 py-1 rounded-full uppercase tracking-[0.18em] font-semibold"
              :class="statusClasses"
            >
              {{ proposal.status || "PENDING" }}
            </span>
            <span
              class="rounded-full border border-line-soft bg-white/80 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-low dark:bg-slate-950/60"
            >
              Proposal #{{ proposal.id }}
            </span>
            <span
              class="rounded-full border border-line-soft bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-low dark:bg-slate-950/60"
            >
              {{ proposal.network || activeNetworkMode }}
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
                />
              </svg>
            </div>

            <div class="min-w-0">
              <h1 class="page-title mb-2">{{ proposal.description || "Council Proposal" }}</h1>
              <p class="page-subtitle max-w-3xl">
                {{ proposalSubtitle }}
              </p>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <span
              class="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-high dark:border-amber-900/40 dark:bg-slate-950/50"
            >
              Method
              <span class="font-mono text-low">{{ proposalMethodSummary }}</span>
            </span>
            <span
              class="inline-flex items-center gap-2 rounded-full border border-line-soft bg-white/80 px-3 py-1.5 text-xs font-semibold text-high dark:bg-slate-950/50"
            >
              Target
              <span class="font-mono text-low">{{ proposalTargetSummary }}</span>
            </span>
            <span
              class="inline-flex items-center gap-2 rounded-full border border-line-soft bg-white/80 px-3 py-1.5 text-xs font-semibold text-high dark:bg-slate-950/50"
            >
              Tx Hash
              <span class="font-mono text-low">{{
                formatCompactHash(proposal.tx_hash || proposal.params?.hash || "Pending", 12, 8)
              }}</span>
            </span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 xl:w-[320px]">
          <div
            class="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70"
          >
            <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">Current Votes</div>
            <div
              class="mt-2 text-3xl font-black tracking-tight"
              :class="thresholdMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary-600'"
            >
              {{ signedCount }} / {{ requiredCount }}
            </div>
          </div>
          <div
            class="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70"
          >
            <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">
              {{ thresholdMet ? "Ready to Cast" : "Signatures Needed" }}
            </div>
            <div class="mt-2 text-3xl font-black tracking-tight text-high">{{ thresholdMet ? 0 : remainingVotes }}</div>
          </div>
          <div
            class="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70"
          >
            <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">Created</div>
            <div class="mt-1 text-sm font-bold text-high tracking-tight">{{ formatDate(proposal.created_at) }}</div>
          </div>
          <div
            class="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70"
          >
            <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">Broadcast State</div>
            <div
              class="mt-1 text-sm font-bold tracking-tight"
              :class="thresholdMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
            >
              {{ thresholdMet ? "Ready Now" : "Awaiting Quorum" }}
            </div>
          </div>
        </div>
      </div>

      <div class="relative mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div
          class="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70"
        >
          <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-5">
            <div class="min-w-0">
              <div class="text-[10px] uppercase tracking-[0.2em] font-black text-low mb-1.5">
                Council Approval Timeline
              </div>
              <div class="text-xl font-black text-high tracking-tight">{{ progressHeadline }}</div>
              <p class="mt-1.5 max-w-2xl text-sm text-mid leading-relaxed">{{ progressDescription }}</p>
            </div>
            <span
              class="shrink-0 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm"
              :class="
                thresholdMet
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
              "
            >
              {{ thresholdMet ? "Ready to broadcast" : "Signing in progress" }}
            </span>
          </div>

          <div class="h-3 overflow-hidden rounded-full bg-surface-muted border border-line-soft shadow-inner mb-6">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out"
              :class="
                thresholdMet
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500'
              "
              :style="{ width: progressWidth }"
            ></div>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div
              v-for="step in lifecycleSteps"
              :key="step.title"
              class="rounded-2xl border px-5 py-4 transition-colors duration-300"
              :class="step.stateClass"
            >
              <div class="flex items-center gap-3">
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-current/20 bg-current/5 text-[11px] font-black shadow-inner"
                >
                  {{ step.index }}
                </span>
                <div class="text-sm font-bold tracking-tight">{{ step.title }}</div>
              </div>
              <p class="mt-2.5 text-xs leading-relaxed opacity-80">{{ step.description }}</p>
            </div>
          </div>
        </div>

        <div
          class="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70"
        >
          <div class="text-[10px] uppercase tracking-[0.2em] font-black text-low mb-4">Quick Snapshot</div>
          <div class="space-y-3">
            <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
              <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low mb-1">Target Method</div>
              <div class="text-sm font-bold text-high tracking-tight">{{ proposalMethodSummary }}</div>
            </div>
            <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
              <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low mb-1">Smart Contract</div>
              <div class="mt-1 font-mono text-xs break-all text-low">{{ proposalTargetSummary }}</div>
            </div>
            <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
              <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Tx Hash</div>
              <div class="mt-1 font-mono text-xs break-all text-low">
                {{ proposal.tx_hash || proposal.params?.hash || "Pending" }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDate, formatCompactHash } from "@/utils/governanceHelpers";

defineProps({
  proposal: { type: Object, required: true },
  statusClasses: { type: String, required: true },
  signedCount: { type: Number, required: true },
  requiredCount: { type: Number, required: true },
  remainingVotes: { type: Number, required: true },
  thresholdMet: { type: Boolean, required: true },
  progressWidth: { type: String, required: true },
  progressHeadline: { type: String, required: true },
  progressDescription: { type: String, required: true },
  lifecycleSteps: { type: Array, required: true },
  proposalMethodSummary: { type: String, required: true },
  proposalTargetSummary: { type: String, required: true },
  proposalSubtitle: { type: String, required: true },
  activeNetworkMode: { type: String, required: true },
});
</script>
