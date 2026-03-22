<template>
  <div class="etherscan-card overflow-hidden">
    <div class="border-b border-line-soft bg-surface/30 px-6 py-6 md:px-8">
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 class="text-xl font-black text-high tracking-tight">Proposal Payload</h2>
          <p class="mt-1.5 text-sm text-mid max-w-xl leading-relaxed">
            The decoded transaction packet and its supporting witness signatures that council members are mathematically
            validating.
          </p>
        </div>
        <span
          class="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800/30 dark:text-indigo-400"
        >
          Governance Packet
        </span>
      </div>
    </div>

    <div class="p-6 md:p-8 space-y-8">
      <!-- Core Method & Target -->
      <div class="grid gap-5 md:grid-cols-2">
        <div
          class="rounded-3xl border border-line-soft bg-gradient-to-br from-surface-muted/80 to-surface p-5 shadow-sm"
        >
          <div class="flex items-center gap-2 mb-3">
            <div
              class="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center dark:bg-blue-900/30 dark:text-blue-400"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                ></path>
              </svg>
            </div>
            <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">Target Method</div>
          </div>
          <div class="text-lg font-black text-high tracking-tight">{{ proposalMethodSummary }}</div>
        </div>
        <div
          class="rounded-3xl border border-line-soft bg-gradient-to-br from-surface-muted/80 to-surface p-5 shadow-sm"
        >
          <div class="flex items-center gap-2 mb-3">
            <div
              class="h-6 w-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center dark:bg-purple-900/30 dark:text-purple-400"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                ></path>
              </svg>
            </div>
            <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">Smart Contract</div>
          </div>
          <div class="font-mono text-sm font-semibold text-high break-all">{{ proposalTargetSummary }}</div>
        </div>
      </div>

      <div
        v-if="proposalInvocations.length > 1"
        class="rounded-3xl border border-line-soft bg-gradient-to-br from-surface-muted/70 to-surface p-5 shadow-sm"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div>
            <h3 class="text-lg font-black tracking-tight text-high">Atomic Invocation Plan</h3>
            <p class="mt-1 text-sm text-mid">
              This governance packet chains multiple native-contract calls into one threshold-signed transaction.
            </p>
          </div>
          <span
            class="inline-flex items-center rounded-full border border-line-soft bg-surface px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-low"
          >
            {{ proposalInvocations.length }} Calls
          </span>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <div
            v-for="invocation in proposalInvocations"
            :key="`${invocation.index}-${invocation.selectedMethod}-${invocation.selectedContract}`"
            class="rounded-2xl border border-line-soft bg-surface p-4 shadow-sm"
          >
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <div class="text-[10px] font-black uppercase tracking-[0.18em] text-low">
                  Invocation {{ invocation.index }}
                </div>
                <div class="mt-1 text-base font-black text-high tracking-tight">{{ invocation.selectedMethod }}</div>
              </div>
              <span
                class="rounded-full border border-line-soft bg-surface-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-low"
              >
                {{ invocation.selectedContract || "Custom" }}
              </span>
            </div>

            <div class="rounded-xl border border-line-soft bg-surface-muted/50 p-3">
              <div class="text-[10px] uppercase tracking-[0.15em] font-bold text-low">Target Hash</div>
              <div class="mt-1 font-mono text-xs break-all text-high">{{ invocation.targetHash || "Unavailable" }}</div>
            </div>

            <div class="mt-3 space-y-2">
              <div class="text-[10px] uppercase tracking-[0.15em] font-bold text-low">Parameters</div>
              <div
                v-for="(paramValue, paramName) in invocation.params"
                :key="`${invocation.index}-${paramName}`"
                class="flex items-start justify-between gap-3 rounded-xl border border-line-soft bg-surface-muted/50 px-3 py-2"
              >
                <span class="text-xs font-semibold text-mid">{{ paramName }}</span>
                <span class="font-mono text-xs text-high break-all text-right">{{ paramValue }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UnsignedTransactionViewer
        v-if="proposal.params?.unsigned_tx"
        :transaction-hex="proposal.params.unsigned_tx"
        label="Unsigned Transaction Packet"
        description="The full transaction envelope council wallets sign, including fees, signer scopes, and the embedded execution script."
      />

      <!-- Collected Witnesses -->
      <div class="pt-6 border-t border-line-soft">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h3 class="text-lg font-black tracking-tight text-high">Collected Signatures</h3>
            <p class="mt-1 text-sm text-mid">Valid ECDSA signatures stored off-chain until quorum is reached.</p>
          </div>
          <div
            class="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl dark:bg-emerald-950/20 dark:border-emerald-900/30"
          >
            <div class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="text-xs font-black uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-400">
              {{ signatureWitnessRows.length }} Stored
            </span>
          </div>
        </div>

        <div v-if="signatureWitnessRows.length" class="space-y-6">
          <div
            v-for="(row, index) in signatureWitnessRows"
            :key="row.signerAddress"
            data-testid="signature-witness-card"
            class="rounded-3xl border border-line-soft bg-gradient-to-br from-surface-muted/40 to-surface p-6 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <!-- Witness Header -->
            <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between mb-5">
              <div class="flex min-w-0 items-center gap-4">
                <img
                  :src="row.logo"
                  :data-logo-fallback-index="0"
                  :data-testid="`signature-witness-logo-${row.signerAddress}`"
                  alt=""
                  class="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow-md bg-white shrink-0 dark:ring-slate-800"
                  @error="handleCouncilLogoError($event, row.logoSources)"
                />
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      class="rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      Sig #{{ index + 1 }}
                    </span>
                    <span
                      v-if="row.signerAddress === connectedAccount"
                      class="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                    >
                      You
                    </span>
                  </div>
                  <div class="text-lg font-black text-high truncate tracking-tight">{{ row.name }}</div>
                  <div class="mt-1 font-mono text-[11px] text-mid truncate opacity-80" :title="row.signerAddress">
                    {{ row.signerAddress }}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 rounded-xl bg-surface px-4 py-2 border border-line-soft shrink-0">
                <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span class="text-xs font-bold text-high">Cryptographically Valid</span>
              </div>
            </div>

            <!-- Witness Data Grid -->
            <div class="grid gap-4 xl:grid-cols-2">
              <div class="rounded-2xl border border-line-soft bg-surface p-4">
                <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low mb-2">
                  Stored ECDSA Signature
                </div>
                <div
                  class="rounded-xl border border-line-soft bg-surface-muted/70 p-3 font-mono text-[10px] break-all text-high shadow-inner dark:bg-[#020617] dark:text-slate-300"
                >
                  {{ row.signature }}
                </div>
              </div>
              <div class="rounded-2xl border border-line-soft bg-surface p-4">
                <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low mb-2">
                  {{ row.witnessJson ? "Attached Witness Meta" : "Empty Fragment" }}
                </div>
                <div
                  class="max-h-[80px] overflow-y-auto rounded-xl border border-line-soft bg-surface-muted/70 p-3 font-mono text-[10px] break-all text-high shadow-inner dark:bg-[#020617] dark:text-slate-300"
                >
                  {{ row.witnessJson || "Awaiting final multisig assembly..." }}
                </div>
              </div>
            </div>

            <!-- Parsed Invocation Script Window -->
            <div
              v-if="row.invocationScriptBase64"
              class="mt-5 overflow-hidden rounded-2xl border border-line-soft bg-surface shadow-lg dark:bg-[#020617]"
            >
              <div
                class="flex items-center justify-between border-b border-line-soft bg-surface-muted/70 px-4 py-2.5 dark:border-white/10 dark:bg-black/20"
              >
                <div class="flex items-center gap-2">
                  <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    ></path>
                  </svg>
                  <span class="text-[11px] font-bold tracking-wider text-high uppercase dark:text-slate-300"
                    >Parsed Invocation OpCodes</span
                  >
                </div>
              </div>
              <div class="p-2">
                <ScriptViewer :script="row.invocationScriptBase64" />
              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="mt-6 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line-soft bg-surface-muted/30 py-16 text-center"
        >
          <div
            class="h-16 w-16 rounded-full bg-surface shadow-sm border border-line-soft flex items-center justify-center mb-4 text-mid"
          >
            <svg class="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              ></path>
            </svg>
          </div>
          <h4 class="text-base font-bold text-high tracking-tight">No signatures stored yet</h4>
          <p class="mt-2 max-w-sm text-sm text-mid leading-relaxed">
            Once council nodes approve and sign this payload, their ECDSA witness fragments will automatically stream
            here.
          </p>
        </div>
      </div>

      <div
        v-if="proposal.params?.broadcast_witness"
        class="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-slate-950"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h3 class="text-lg font-black tracking-tight text-emerald-800 dark:text-emerald-400">
              Final Broadcast Witness
            </h3>
            <p class="mt-1 text-sm text-emerald-600/80 dark:text-emerald-400/80">
              Quorum reached. The multi-sig witness assembled to broadcast.
            </p>
          </div>
          <span
            class="inline-flex items-center rounded-full bg-emerald-500 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-md shadow-emerald-500/20"
          >
            Successfully Broadcast
          </span>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div
            class="rounded-2xl border border-emerald-200/60 bg-white/60 p-4 dark:border-emerald-800/30 dark:bg-black/20"
          >
            <div
              class="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700/70 dark:text-emerald-400/70 mb-2"
            >
              Assembled Invocation Script
            </div>
            <div
              class="max-h-40 overflow-y-auto rounded-xl border border-line-soft bg-white/80 p-3 font-mono text-[10px] break-all text-emerald-950 shadow-inner dark:bg-[#020617] dark:text-slate-300"
            >
              {{ proposal.params.broadcast_witness.invocationScript || "Unavailable" }}
            </div>
          </div>
          <div
            class="rounded-2xl border border-emerald-200/60 bg-white/60 p-4 dark:border-emerald-800/30 dark:bg-black/20"
          >
            <div
              class="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700/70 dark:text-emerald-400/70 mb-2"
            >
              Council Verification Script
            </div>
            <div
              class="max-h-40 overflow-y-auto rounded-xl border border-line-soft bg-white/80 p-3 font-mono text-[10px] break-all text-emerald-950 shadow-inner dark:bg-[#020617] dark:text-slate-300"
            >
              {{ proposal.params.broadcast_witness.verificationScript || "Unavailable" }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import ScriptViewer from "@/components/trace/ScriptViewer.vue";
import UnsignedTransactionViewer from "@/components/trace/UnsignedTransactionViewer.vue";
import { handleCouncilLogoError } from "@/utils/governanceHelpers";

defineProps({
  proposal: { type: Object, required: true },
  proposalMethodSummary: { type: String, required: true },
  proposalTargetSummary: { type: String, required: true },
  proposalInvocations: { type: Array, required: true },
  signatureWitnessRows: { type: Array, required: true },
  connectedAccount: { type: String, default: "" },
});
</script>
