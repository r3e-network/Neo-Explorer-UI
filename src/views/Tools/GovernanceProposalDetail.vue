<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb
        :items="[
          { label: 'Home', to: '/homepage' },
          { label: 'Tools', to: '/tools' },
          { label: 'Council Governance', to: '/tools/governance' },
          { label: proposal?.description || 'Proposal Detail' },
        ]"
      />

      <div v-if="loading" class="space-y-4">
        <Skeleton height="80px" />
        <Skeleton height="220px" />
        <Skeleton height="220px" />
      </div>

      <div v-else-if="!proposal" class="etherscan-card p-8 text-center">
        <h1 class="page-title mb-2">Proposal Not Found</h1>
        <p class="page-subtitle">This governance proposal could not be loaded for the active network.</p>
        <RouterLink
          to="/tools/governance"
          class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors mt-4"
        >
          Back to Council Governance
        </RouterLink>
      </div>

      <div v-else class="space-y-6">
        <div
          data-testid="governance-hero"
          class="etherscan-card overflow-hidden border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-xl shadow-amber-900/5 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950"
        >
          <div class="relative p-6 md:p-8">
            <div class="pointer-events-none absolute -right-20 -top-16 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10"></div>
            <div class="pointer-events-none absolute -bottom-16 left-0 h-40 w-40 rounded-full bg-orange-300/10 blur-3xl dark:bg-orange-500/10"></div>

            <div class="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    class="text-[10px] px-2.5 py-1 rounded-full uppercase tracking-[0.18em] font-semibold"
                    :class="statusClasses"
                  >
                    {{ proposal.status || "PENDING" }}
                  </span>
                  <span class="rounded-full border border-line-soft bg-white/80 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-low dark:bg-slate-950/60">
                    Proposal #{{ proposal.id }}
                  </span>
                  <span class="rounded-full border border-line-soft bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-low dark:bg-slate-950/60">
                    {{ proposal.network || activeNetworkMode }}
                  </span>
                </div>

                <div class="flex items-start gap-4">
                  <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                    <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>

                  <div class="min-w-0">
                    <h1 class="page-title mb-2">{{ proposal.description || "Council Proposal" }}</h1>
                    <p class="page-subtitle max-w-3xl">
                      Council method <span class="font-semibold text-high">{{ proposal.method }}</span> is queued against
                      <span class="font-mono text-low">{{ proposal.target_contract }}</span>.
                      Review the packet, track collected witnesses, and broadcast once quorum is met.
                    </p>
                  </div>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <span class="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-high dark:border-amber-900/40 dark:bg-slate-950/50">
                    Method
                    <span class="font-mono text-low">{{ proposal.method }}</span>
                  </span>
                  <span class="inline-flex items-center gap-2 rounded-full border border-line-soft bg-white/80 px-3 py-1.5 text-xs font-semibold text-high dark:bg-slate-950/50">
                    Target
                    <span class="font-mono text-low">{{ formatCompactHash(proposal.target_contract, 12, 8) }}</span>
                  </span>
                  <span class="inline-flex items-center gap-2 rounded-full border border-line-soft bg-white/80 px-3 py-1.5 text-xs font-semibold text-high dark:bg-slate-950/50">
                    Tx Hash
                    <span class="font-mono text-low">{{ formatCompactHash(proposal.tx_hash || proposal.params?.hash || "Pending", 12, 8) }}</span>
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 xl:w-[320px]">
                <div class="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                  <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Votes</div>
                  <div class="mt-2 text-3xl font-black text-primary-600">{{ signedCount }} / {{ requiredCount }}</div>
                </div>
                <div class="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                  <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">
                    {{ thresholdMet ? "Ready" : "Still Needed" }}
                  </div>
                  <div class="mt-2 text-3xl font-black text-high">{{ thresholdMet ? 0 : remainingVotes }}</div>
                </div>
                <div class="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                  <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Created</div>
                  <div class="mt-2 text-sm font-semibold text-high">{{ formatDate(proposal.created_at) }}</div>
                </div>
                <div class="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                  <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Broadcast</div>
                  <div class="mt-2 text-sm font-semibold" :class="thresholdMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                    {{ thresholdMet ? "Ready now" : "Awaiting quorum" }}
                  </div>
                </div>
              </div>
            </div>

            <div class="relative mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0">
                    <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Council approval progress</div>
                    <div class="mt-2 text-xl font-bold text-high">{{ progressHeadline }}</div>
                    <p class="mt-2 max-w-2xl text-sm text-mid">{{ progressDescription }}</p>
                  </div>
                  <span
                    class="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                    :class="thresholdMet ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'"
                  >
                    {{ thresholdMet ? "Ready to broadcast" : "Signing in progress" }}
                  </span>
                </div>

                <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-line-soft">
                  <div
                    class="h-2.5 rounded-full transition-all duration-300"
                    :class="thresholdMet ? 'bg-emerald-500' : 'bg-primary-500'"
                    :style="{ width: progressWidth }"
                  ></div>
                </div>

                <div class="mt-4 grid gap-3 md:grid-cols-3">
                  <div
                    v-for="step in lifecycleSteps"
                    :key="step.title"
                    class="rounded-2xl border px-4 py-3"
                    :class="step.stateClass"
                  >
                    <div class="flex items-center gap-2">
                      <span class="flex h-7 w-7 items-center justify-center rounded-full border border-current/20 text-[11px] font-black">
                        {{ step.index }}
                      </span>
                      <div class="text-sm font-bold">{{ step.title }}</div>
                    </div>
                    <p class="mt-2 text-xs leading-5 opacity-90">{{ step.description }}</p>
                  </div>
                </div>
              </div>

              <div class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Packet Snapshot</div>
                <div class="mt-4 space-y-3">
                  <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
                    <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Method</div>
                    <div class="mt-1 text-sm font-semibold text-high">{{ proposal.method }}</div>
                  </div>
                  <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
                    <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Target Contract</div>
                    <div class="mt-1 font-mono text-xs break-all text-low">{{ proposal.target_contract }}</div>
                  </div>
                  <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
                    <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Tx Hash</div>
                    <div class="mt-1 font-mono text-xs break-all text-low">{{ proposal.tx_hash || proposal.params?.hash || "Pending" }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
          <div class="space-y-6">
            <div class="etherscan-card p-6 md:p-8">
              <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 class="text-xl font-bold text-high">Proposal Packet</h2>
                  <p class="mt-1 text-sm text-mid">The exact unsigned payload and supporting witness data that council members are approving.</p>
                </div>
                <span class="inline-flex items-center rounded-full border border-line-soft bg-surface-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-low">
                  Governance Payload
                </span>
              </div>

              <div class="mt-6 space-y-5">
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="rounded-2xl border border-line-soft bg-surface-muted/50 p-4">
                    <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low mb-2">Method</div>
                    <div class="text-base font-bold text-high">{{ proposal.method }}</div>
                  </div>
                  <div class="rounded-2xl border border-line-soft bg-surface-muted/50 p-4">
                    <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low mb-2">Target Contract</div>
                    <div class="font-mono text-sm break-all text-low">{{ proposal.target_contract }}</div>
                  </div>
                </div>

                <div v-if="decodedUnsignedScript" class="rounded-3xl border border-line-soft bg-surface p-5 shadow-sm">
                  <div class="mb-4">
                    <div class="flex items-center gap-2">
                      <div class="p-1.5 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                      </div>
                      <h3 class="text-sm font-bold text-high tracking-tight">Decoded Contract Script</h3>
                    </div>
                    <p class="mt-2 text-xs text-mid">This is the actual human-readable contract invocation that council members are voting on.</p>
                  </div>
                  <div class="bg-surface-muted/50 rounded-2xl border border-line-soft overflow-hidden">
                    <ScriptViewer
                      :script="decodedUnsignedScript"
                    />
                  </div>
                </div>

                <div class="rounded-3xl border border-line-soft bg-surface-muted/50 p-4">
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Unsigned Transaction Hex</div>
                      <p class="mt-1 text-xs text-mid">The raw packet signed by wallets before the final multisig witness is assembled.</p>
                    </div>
                    <span class="text-[10px] font-semibold uppercase tracking-[0.18em] text-low">Payload</span>
                  </div>
                  <div class="mt-3 rounded-2xl border border-line-soft bg-surface p-3 font-mono text-[11px] break-all text-low max-h-48 overflow-y-auto shadow-inner">
                    {{ proposal.params?.unsigned_tx || "Unavailable" }}
                  </div>
                </div>

                <div>
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                    <div>
                      <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Collected Witnesses</div>
                      <p class="mt-1 text-sm text-mid">Each stored signature is shown with the signer identity that will contribute to the final governance witness.</p>
                    </div>
                    <span class="inline-flex items-center rounded-full border border-line-soft bg-surface-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-low">
                      {{ signatureWitnessRows.length }} stored
                    </span>
                  </div>

                  <div v-if="signatureWitnessRows.length" class="space-y-3">
                    <div
                      v-for="(row, index) in signatureWitnessRows"
                      :key="row.signerAddress"
                      data-testid="signature-witness-card"
                      class="rounded-3xl border border-line-soft bg-gradient-to-br from-surface-muted/70 to-surface p-5 shadow-sm"
                    >
                      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div class="flex min-w-0 items-start gap-4">
                          <img
                            :src="row.logo"
                            :data-testid="`signature-witness-logo-${row.signerAddress}`"
                            alt=""
                            class="h-11 w-11 rounded-full object-cover ring-1 ring-line-soft bg-white shrink-0"
                            @error="$event.target.src = '/img/brand/neo.png'"
                          />
                          <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                              <span class="rounded-full border border-line-soft bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-low dark:bg-slate-950/70">
                                Witness {{ index + 1 }}
                              </span>
                              <span
                                v-if="row.signerAddress === connectedAccount"
                                class="rounded-full bg-primary-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                              >
                                You
                              </span>
                            </div>
                            <div class="mt-2 text-base font-bold text-high">{{ row.name }}</div>
                            <div class="mt-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Signer Address</div>
                            <div class="mt-1 font-mono text-xs break-all text-low">{{ row.signerAddress }}</div>
                          </div>
                        </div>

                        <span class="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Witness Ready
                        </span>
                      </div>

                      <div class="mt-4 grid gap-3 xl:grid-cols-2">
                        <div class="rounded-2xl border border-line-soft bg-surface p-4">
                          <div class="mb-2 flex items-center justify-between">
                            <span class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">Stored Signature</span>
                          </div>
                          <div class="rounded-xl border border-line-soft bg-surface-muted p-2.5 font-mono text-[10px] break-all text-low shadow-inner">
                            {{ row.signature }}
                          </div>
                          <p class="mt-2 text-[11px] text-mid">Raw ECDSA signature fragment stored for final multisig witness assembly.</p>
                        </div>
                        <div class="rounded-2xl border border-line-soft bg-surface p-4">
                          <div class="mb-2 flex items-center justify-between">
                            <span class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low">
                              {{ row.witnessJson ? "Witness Metadata" : "Witness Payload" }}
                            </span>
                          </div>
                          <div class="rounded-xl border border-line-soft bg-surface-muted p-2.5 font-mono text-[10px] break-all text-low shadow-inner max-h-[70px] overflow-y-auto">
                            {{ row.witnessJson || "Stored off-chain until the final threshold-signed witness is assembled." }}
                          </div>
                        </div>
                      </div>

                      <div v-if="row.invocationScriptBase64" class="mt-4 rounded-2xl border border-line-soft bg-surface shadow-sm overflow-hidden">
                        <div class="border-b border-line-soft bg-surface-muted/50 px-4 py-3">
                          <div class="flex items-center gap-2">
                            <div class="p-1.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                            </div>
                            <h4 class="text-sm font-bold tracking-tight text-high">Parsed Invocation Script</h4>
                          </div>
                          <p class="ml-9 mt-1 text-[11px] text-mid">Generated from the stored signature fragment so the witness can be reviewed as NeoVM opcodes instead of raw hex only.</p>
                        </div>
                        <div class="p-2">
                          <ScriptViewer
                            :script="row.invocationScriptBase64"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="rounded-3xl border border-dashed border-line-soft bg-surface-muted/40 p-5 text-sm text-mid">
                    No collected witnesses yet. Once council nodes sign, their stored witness fragments will appear here automatically.
                  </div>
                </div>

                <div
                  v-if="proposal.params?.broadcast_witness"
                  class="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                >
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-emerald-700 dark:text-emerald-400">Broadcast Witness</div>
                      <p class="mt-1 text-sm text-mid">The final witness that was assembled and attached to the transaction broadcast.</p>
                    </div>
                    <span class="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Finalized
                    </span>
                  </div>

                  <div class="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low mb-1">Invocation Script</div>
                      <div class="rounded-2xl border border-line-soft bg-surface p-3 font-mono text-[11px] break-all text-low max-h-40 overflow-y-auto">
                        {{ proposal.params.broadcast_witness.invocationScript || "Unavailable" }}
                      </div>
                    </div>
                    <div>
                      <div class="text-[10px] uppercase tracking-[0.18em] font-semibold text-low mb-1">Verification Script</div>
                      <div class="rounded-2xl border border-line-soft bg-surface p-3 font-mono text-[11px] break-all text-low max-h-40 overflow-y-auto">
                        {{ proposal.params.broadcast_witness.verificationScript || "Unavailable" }}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div class="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div data-testid="council-status-panel" class="etherscan-card overflow-hidden">
              <div class="border-b border-line-soft px-6 py-5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h2 class="text-lg font-bold text-high">Council Vote Status</h2>
                    <p class="mt-1 text-sm text-mid">Track which eligible council members have already stored their witness fragments.</p>
                  </div>
                  <span class="inline-flex items-center rounded-full border border-line-soft bg-surface-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-low">
                    {{ signedCount }} / {{ requiredCount }}
                  </span>
                </div>
              </div>

              <div class="p-4 space-y-3">
                <div
                  v-for="signer in signerRows"
                  :key="signer.address"
                  class="flex items-center justify-between gap-3 rounded-2xl border border-line-soft bg-surface-muted/40 px-4 py-3"
                >
                  <div class="flex min-w-0 items-center gap-3" :title="signer.address">
                    <img
                      :src="signer.logo"
                      :data-testid="`council-status-logo-${signer.address}`"
                      alt=""
                      class="h-10 w-10 rounded-full object-cover ring-1 ring-line-soft bg-white shrink-0"
                      @error="$event.target.src = '/img/brand/neo.png'"
                    />
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <div class="font-semibold text-high truncate">{{ signer.name }}</div>
                        <span
                          v-if="signer.address === connectedAccount"
                          class="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                        >
                          You
                        </span>
                      </div>
                      <div class="mt-1 text-[11px] uppercase tracking-[0.18em] text-low">
                        {{ signer.signed ? "Witness stored" : "Awaiting witness" }}
                      </div>
                    </div>
                  </div>
                  <div
                    class="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                    :class="signer.signed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'"
                  >
                    {{ signer.signed ? "Voted" : "Pending" }}
                  </div>
                </div>
              </div>
            </div>

            <div class="etherscan-card p-6 md:p-7">
              <div class="flex items-start gap-3">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
              <div v-else-if="hasSigned" class="mt-5 text-sm text-emerald-600 font-semibold">
                You already voted.
              </div>
              <div v-else-if="!canCurrentSignerVote" class="mt-5 text-sm text-mid">
                Only eligible council nodes can vote on this proposal.
              </div>
              <div v-else class="mt-5 space-y-3">
                <button
                  @click="openSignModal"
                  class="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 hover:-translate-y-0.5 hover:bg-primary-700 transition-all"
                >
                  Vote / Sign Proposal
                </button>
                <p class="text-xs text-mid">
                  The collected signature is stored in Supabase and will be used to assemble the final multisig witness.
                </p>
              </div>

              <button
                v-if="thresholdMet && proposal.status !== 'EXECUTED'"
                @click="handleBroadcast(proposal)"
                class="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 hover:bg-emerald-700 transition-all"
              >
                Broadcast Threshold-Signed Proposal
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showSignModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity">
        <div class="w-full max-w-lg rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col">
          <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </div>
              <h2 class="text-xl font-bold text-high tracking-tight">Vote / Sign Proposal</h2>
            </div>
            <button @click="closeSignModal" class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div class="p-6 space-y-6">
            <div>
              <p class="text-xs font-bold text-low uppercase tracking-wider mb-2">Unsigned Payload Hex</p>
              <div class="rounded-xl border border-line-soft bg-surface-muted p-3 font-mono text-[10px] break-all text-low max-h-40 overflow-y-auto shadow-inner">
                {{ proposal?.params?.unsigned_tx }}
              </div>
            </div>
            
            <ScriptViewer
              v-if="decodedUnsignedScript"
              :script="decodedUnsignedScript"
              label="Decoded Contract Script"
            />
            
            <div class="space-y-3">
              <label class="block text-sm font-bold text-high">Option 1: Wallet Signature</label>
              <button
                @click="autoSignTx"
                :disabled="isSigning"
                class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md"
              >
                <svg v-if="isSigning" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                {{ isSigning ? "Waiting for wallet..." : "Sign with connected wallet" }}
              </button>
              <p class="text-[11px] text-mid text-center">Requires Web3Auth or compatible raw-sign wallet.</p>
            </div>
            
            <div class="relative py-2">
              <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-line-soft"></div></div>
              <div class="relative flex justify-center"><span class="px-3 bg-white dark:bg-slate-950 text-xs font-bold text-low tracking-widest uppercase rounded-full">OR</span></div>
            </div>
            
            <div class="space-y-3">
              <label class="block text-sm font-bold text-high">Option 2: Manual Signature</label>
              <input
                v-model="manualSignature"
                type="text"
                class="form-input w-full font-mono text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
                placeholder="Paste 64-byte signature hex here..."
              />
              <button
                @click="submitManualSignature"
                :disabled="manualSignature.trim().length < 128"
                class="w-full px-4 py-3 bg-surface-muted text-high border border-line-soft rounded-xl font-bold hover:bg-surface transition-all active:scale-95 hover:border-line disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit manual signature
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ScriptViewer from "@/components/trace/ScriptViewer.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount } from "@/utils/wallet";
import { walletService } from "@/services/walletService";
import { getCurrentEnv, getRpcClientUrl } from "@/utils/env";
import { toNetworkMode } from "@/utils/rpcEndpoints";
import { extractScriptBase64FromUnsignedTx } from "@/utils/unsignedTransaction";
import { buildCouncilIdentityMap, resolveCouncilIdentity } from "@/utils/councilIdentity";
import { getDefaultCandidateLogoUrl, resolveCandidateLogoUrl } from "@/utils/logoOptimization";
import { hexToBase64 } from "@/utils/neoHelpers";

const route = useRoute();
const toast = useToast();

const proposal = ref(null);
const committeePubkeys = ref([]);
const validatorMetadata = ref([]);
const showSignModal = ref(false);
const manualSignature = ref("");
const isSigning = ref(false);
const loading = ref(true);
let neonJs = null;
const NEO_LOGO_FALLBACK = "/img/brand/neo.png";

const activeNetworkMode = computed(() => toNetworkMode(getCurrentEnv()) || "mainnet");
const signedCount = computed(() => proposal.value?.signatures?.length || 0);
const requiredCount = computed(() => Number(proposal.value?.signers_required || 0));
const remainingVotes = computed(() => Math.max(requiredCount.value - signedCount.value, 0));
const thresholdMet = computed(() => signedCount.value >= requiredCount.value && requiredCount.value > 0);
const hasSigned = computed(() =>
  Boolean(
    connectedAccount.value &&
      proposal.value?.signatures?.some((signature) => signature.signer_address === connectedAccount.value)
  )
);
const canCurrentSignerVote = computed(() =>
  Boolean(
    connectedAccount.value &&
      proposal.value?.status !== "EXECUTED" &&
      Array.isArray(proposal.value?.eligible_signers) &&
      proposal.value.eligible_signers.includes(connectedAccount.value)
  )
);
const progressWidth = computed(() => `${Math.min(100, requiredCount.value ? (signedCount.value / requiredCount.value) * 100 : 0)}%`);
const decodedUnsignedScript = computed(() =>
  extractScriptBase64FromUnsignedTx(proposal.value?.params?.unsigned_tx || "")
);
const councilIdentityMap = computed(() => buildCouncilIdentityMap(validatorMetadata.value));
const statusClasses = computed(() =>
  proposal.value?.status === "EXECUTED"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
);
const progressHeadline = computed(() => {
  if (proposal.value?.status === "EXECUTED") {
    return "Proposal executed successfully.";
  }
  if (thresholdMet.value) {
    return "Threshold reached. Ready to broadcast.";
  }
  if (remainingVotes.value === 1) {
    return "1 more vote needed before broadcast.";
  }
  return `${remainingVotes.value} more votes needed before broadcast.`;
});
const progressDescription = computed(() => {
  if (proposal.value?.status === "EXECUTED") {
    return "The council quorum was reached, the final witness was assembled, and the transaction was already published on-chain.";
  }
  if (thresholdMet.value) {
    return "The required number of council signatures is already stored. Review the final witness section and broadcast the proposal when ready.";
  }
  return "Council members are still reviewing the unsigned payload. Stored witness fragments will appear below as each eligible signer approves the proposal.";
});
const actionTitle = computed(() => {
  if (proposal.value?.status === "EXECUTED") return "Proposal already executed";
  if (thresholdMet.value) return "Broadcast is unlocked";
  if (hasSigned.value) return "Your witness has been recorded";
  if (!canCurrentSignerVote.value) return "Waiting for eligible council signers";
  return "Ready for your council signature";
});
const actionDescription = computed(() => {
  if (proposal.value?.status === "EXECUTED") {
    return "Execution is complete. You can still inspect the packet, signer roster, and final broadcast witness below.";
  }
  if (thresholdMet.value) {
    return "The quorum is already met. Broadcasting will assemble the threshold witness and submit the transaction on-chain.";
  }
  if (hasSigned.value) {
    return "Your vote is already stored. The page will move to broadcast-ready automatically once enough additional council witnesses arrive.";
  }
  if (!canCurrentSignerVote.value) {
    return "This proposal is visible to everyone, but only eligible council nodes can contribute signatures or broadcast the final transaction.";
  }
  return "Sign the raw governance packet with your connected council wallet. Your witness fragment will be stored and later assembled into the final multisig witness.";
});
const actionToneClass = computed(() => {
  if (proposal.value?.status === "EXECUTED") {
    return "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/10";
  }
  if (thresholdMet.value) {
    return "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/10";
  }
  if (hasSigned.value) {
    return "border-primary-200 bg-primary-50/60 dark:border-primary-900/40 dark:bg-primary-950/10";
  }
  return "border-line-soft bg-surface-muted/50";
});
const lifecycleSteps = computed(() => [
  {
    index: "1",
    title: "Draft Created",
    description: "The proposal packet and unsigned transaction were created and stored for council review.",
    stateClass: "border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/10 dark:text-amber-200",
  },
  {
    index: "2",
    title: "Collect Signatures",
    description: thresholdMet.value
      ? "Enough council witnesses are now stored to assemble the final multisig witness."
      : "Eligible council members are still signing and uploading their witness fragments.",
    stateClass: thresholdMet.value
      ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/10 dark:text-emerald-200"
      : "border-primary-200 bg-primary-50/70 text-primary-800 dark:border-primary-900/40 dark:bg-primary-950/10 dark:text-primary-200",
  },
  {
    index: "3",
    title: "Broadcast Transaction",
    description:
      proposal.value?.status === "EXECUTED"
        ? "The fully signed governance transaction has already been broadcast to the network."
        : thresholdMet.value
          ? "The next valid broadcaster can submit the threshold-signed transaction on-chain."
          : "Broadcast remains locked until the council threshold is reached.",
    stateClass:
      proposal.value?.status === "EXECUTED"
        ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/10 dark:text-emerald-200"
        : thresholdMet.value
          ? "border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/10 dark:text-amber-200"
          : "border-line-soft bg-surface-muted/60 text-mid dark:text-slate-300",
  },
]);

const signerRows = computed(() => {
  const eligible = Array.isArray(proposal.value?.eligible_signers) ? proposal.value.eligible_signers : [];
  const signed = new Set((proposal.value?.signatures || []).map((signature) => signature.signer_address));
  return eligible.map((address, index) => {
    const resolved = resolveCouncilIdentity(address, councilIdentityMap.value);
    return {
      ...resolved,
      name: resolved.name === address ? `Council Node ${index + 1}` : resolved.name,
      logo: resolveCouncilLogo(address, resolved.logo),
      signed: signed.has(address),
    };
  });
});

const signatureWitnessRows = computed(() =>
  (proposal.value?.signatures || []).map((signature, index) => {
    const resolved = resolveCouncilIdentity(signature.signer_address, councilIdentityMap.value);
    return {
      signerAddress: signature.signer_address,
      name: resolved.name === signature.signer_address ? `Council Node ${index + 1}` : resolved.name,
      logo: resolveCouncilLogo(signature.signer_address, resolved.logo),
      signature: signature.signature,
      invocationScriptBase64: buildSignatureInvocationScriptBase64(signature.signature),
      witnessJson: signature.witness ? JSON.stringify(signature.witness, null, 2) : "",
    };
  })
);

function findCommitteePubkeyForAddress(address) {
  const target = String(address || "").trim();
  if (!target || !neonJs) return "";

  for (const pubkey of committeePubkeys.value || []) {
    try {
      if (new neonJs.wallet.Account(pubkey).address === target) {
        return pubkey;
      }
    } catch {
      // Ignore malformed committee entries.
    }
  }

  return "";
}

function resolveCouncilLogo(address, explicitLogo = "") {
  const normalizedLogo = String(explicitLogo || "").trim();
  if (normalizedLogo) {
    return resolveCandidateLogoUrl(normalizedLogo);
  }

  const pubkey = findCommitteePubkeyForAddress(address);
  if (pubkey) {
    return getDefaultCandidateLogoUrl(pubkey);
  }

  return NEO_LOGO_FALLBACK;
}

function formatDate(value) {
  if (!value) return "Unknown";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Unknown";
  }
}

function formatCompactHash(value, prefix = 12, suffix = 8) {
  const normalized = String(value || "").trim();
  if (!normalized) return "Unavailable";
  if (normalized.length <= prefix + suffix + 3) return normalized;
  return `${normalized.slice(0, prefix)}...${normalized.slice(-suffix)}`;
}

function normalizeHex(value) {
  return String(value || "").trim().replace(/^0x/i, "").toLowerCase();
}

function encodePushDataHex(dataHex) {
  const normalized = normalizeHex(dataHex);
  if (!normalized || normalized.length % 2 !== 0 || /[^a-f0-9]/i.test(normalized)) {
    return "";
  }

  const byteLength = normalized.length / 2;
  if (byteLength <= 0xff) {
    return `0c${byteLength.toString(16).padStart(2, "0")}${normalized}`;
  }

  if (byteLength <= 0xffff) {
    const lenHex = byteLength.toString(16).padStart(4, "0");
    return `0d${lenHex.slice(2)}${lenHex.slice(0, 2)}${normalized}`;
  }

  if (byteLength <= 0xffffffff) {
    const lenHex = byteLength.toString(16).padStart(8, "0");
    return `0e${lenHex.slice(6)}${lenHex.slice(4, 6)}${lenHex.slice(2, 4)}${lenHex.slice(0, 2)}${normalized}`;
  }

  return "";
}

function buildSignatureInvocationScriptBase64(signatureHex) {
  const invocationScriptHex = encodePushDataHex(signatureHex);
  return invocationScriptHex ? hexToBase64(invocationScriptHex) : "";
}

async function loadCommittee() {
  if (!neonJs) return;
  try {
    const rpcClient = new neonJs.rpc.RPCClient(getRpcClientUrl());
    committeePubkeys.value = await rpcClient.getCommittee();
  } catch (_error) {
    committeePubkeys.value = [];
  }
}

async function loadProposal() {
  proposal.value = await supabaseService.getMultisigRequestById(route.params.id, getCurrentEnv());
}

async function loadValidatorMetadata() {
  try {
    validatorMetadata.value = await supabaseService.getValidatorMetadata(getCurrentEnv());
  } catch {
    validatorMetadata.value = [];
  }
}

function openSignModal() {
  showSignModal.value = true;
  manualSignature.value = "";
}

function closeSignModal() {
  showSignModal.value = false;
  manualSignature.value = "";
}

async function maybeBroadcastIfReady() {
  await loadProposal();
  if (proposal.value && thresholdMet.value && proposal.value.status !== "EXECUTED") {
    await handleBroadcast(proposal.value);
  }
}

async function submitSignature(signatureHex) {
  const result = await supabaseService.addMultisigSignature(
    proposal.value.id,
    connectedAccount.value,
    signatureHex,
    {
      witness: {
        signer_address: connectedAccount.value,
        signature: signatureHex,
      },
    }
  );

  if (!result.success) {
    throw new Error(result.error);
  }

  toast.success("Vote recorded.");
  closeSignModal();
  await maybeBroadcastIfReady();
}

async function autoSignTx() {
  if (!proposal.value?.params?.unsigned_tx) return;
  isSigning.value = true;
  try {
    const signature = await walletService.signRawTransaction(proposal.value.params.unsigned_tx);
    await submitSignature(signature);
  } catch (error) {
    toast.error(`Signing failed: ${error.message}`);
  } finally {
    isSigning.value = false;
  }
}

async function submitManualSignature() {
  try {
    await submitSignature(manualSignature.value.trim());
  } catch (error) {
    toast.error(`Failed to submit signature: ${error.message}`);
  }
}

async function handleBroadcast(currentProposal) {
  if (!currentProposal?.params?.unsigned_tx || !thresholdMet.value) return;
  try {
    const tx = neonJs.tx.Transaction.deserialize(currentProposal.params.unsigned_tx);
    const committeePubkeyList =
      currentProposal.params?.committee_pubkeys ||
      currentProposal.params?.committee ||
      committeePubkeys.value ||
      [];

    const orderedSignatures = [];
    for (const pubkey of committeePubkeyList) {
      const signerAddress = new neonJs.wallet.Account(pubkey).address;
      const signatureRow = currentProposal.signatures?.find(
        (signature) => signature.signer_address === signerAddress
      );
      if (signatureRow) orderedSignatures.push(signatureRow.signature);
      if (orderedSignatures.length >= currentProposal.signers_required) break;
    }

    if (orderedSignatures.length < currentProposal.signers_required) {
      throw new Error("Not enough valid council signatures collected.");
    }

    const builder = new neonJs.sc.ScriptBuilder();
    for (const signature of orderedSignatures) {
      builder.emitPush(neonJs.u.HexString.fromHex(signature));
    }

    const invocationScript = builder.build();
    const verificationScript = neonJs.wallet.Account.createMultiSig(
      currentProposal.signers_required,
      committeePubkeyList
    ).contract.script;

    tx.witnesses = [new neonJs.tx.Witness({ invocationScript, verificationScript })];

    const rpcClient = new neonJs.rpc.RPCClient(getRpcClientUrl());
    const txid = await rpcClient.sendRawTransaction(tx.serialize(true));
    const updateResult = await supabaseService.updateMultisigRequestStatus(currentProposal.id, "EXECUTED", {
      tx_hash: txid,
      executed_at: new Date().toISOString(),
      params: {
        ...currentProposal.params,
        broadcast_witness: {
          invocationScript,
          verificationScript,
        },
      },
    });

    if (!updateResult.success) {
      toast.error(`Proposal broadcasted but status update failed: ${updateResult.error}`);
    } else {
      toast.success(`Proposal broadcasted: ${txid}`);
    }
    await loadProposal();
  } catch (error) {
    toast.error(`Broadcast failed: ${error.message}`);
  }
}

onMounted(async () => {
  try {
    neonJs = window.Neon || (await import("@cityofzion/neon-js"));
    await Promise.all([loadCommittee(), loadValidatorMetadata(), loadProposal()]);
  } finally {
    loading.value = false;
  }
});
</script>
