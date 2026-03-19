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
                      {{ proposalSubtitle }}
                    </p>
                  </div>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <span class="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-high dark:border-amber-900/40 dark:bg-slate-950/50">
                    Method
                    <span class="font-mono text-low">{{ proposalMethodSummary }}</span>
                  </span>
                  <span class="inline-flex items-center gap-2 rounded-full border border-line-soft bg-white/80 px-3 py-1.5 text-xs font-semibold text-high dark:bg-slate-950/50">
                    Target
                    <span class="font-mono text-low">{{ proposalTargetSummary }}</span>
                  </span>
                  <span class="inline-flex items-center gap-2 rounded-full border border-line-soft bg-white/80 px-3 py-1.5 text-xs font-semibold text-high dark:bg-slate-950/50">
                    Tx Hash
                    <span class="font-mono text-low">{{ formatCompactHash(proposal.tx_hash || proposal.params?.hash || "Pending", 12, 8) }}</span>
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 xl:w-[320px]">
                <div class="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                  <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">Current Votes</div>
                  <div class="mt-2 text-3xl font-black tracking-tight" :class="thresholdMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary-600'">{{ signedCount }} / {{ requiredCount }}</div>
                </div>
                <div class="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                  <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">
                    {{ thresholdMet ? "Ready to Cast" : "Signatures Needed" }}
                  </div>
                  <div class="mt-2 text-3xl font-black tracking-tight text-high">{{ thresholdMet ? 0 : remainingVotes }}</div>
                </div>
                <div class="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                  <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">Created</div>
                  <div class="mt-1 text-sm font-bold text-high tracking-tight">{{ formatDate(proposal.created_at) }}</div>
                </div>
                <div class="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                  <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">Broadcast State</div>
                  <div class="mt-1 text-sm font-bold tracking-tight" :class="thresholdMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                    {{ thresholdMet ? "Ready Now" : "Awaiting Quorum" }}
                  </div>
                </div>
              </div>
            </div>

            <div class="relative mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div class="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-5">
                  <div class="min-w-0">
                    <div class="text-[10px] uppercase tracking-[0.2em] font-black text-low mb-1.5">Council Approval Timeline</div>
                    <div class="text-xl font-black text-high tracking-tight">{{ progressHeadline }}</div>
                    <p class="mt-1.5 max-w-2xl text-sm text-mid leading-relaxed">{{ progressDescription }}</p>
                  </div>
                  <span
                    class="shrink-0 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm"
                    :class="thresholdMet ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'"
                  >
                    {{ thresholdMet ? "Ready to broadcast" : "Signing in progress" }}
                  </span>
                </div>

                <div class="h-3 overflow-hidden rounded-full bg-surface-muted border border-line-soft shadow-inner mb-6">
                  <div
                    class="h-full rounded-full transition-all duration-500 ease-out"
                    :class="thresholdMet ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'"
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
                      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-current/20 bg-current/5 text-[11px] font-black shadow-inner">
                        {{ step.index }}
                      </span>
                      <div class="text-sm font-bold tracking-tight">{{ step.title }}</div>
                    </div>
                    <p class="mt-2.5 text-xs leading-relaxed opacity-80">{{ step.description }}</p>
                  </div>
                </div>
              </div>

              <div class="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
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
                    <div class="mt-1 font-mono text-xs break-all text-low">{{ proposal.tx_hash || proposal.params?.hash || "Pending" }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
          <div class="space-y-6">
            <div class="etherscan-card overflow-hidden">
              <div class="border-b border-line-soft bg-surface/30 px-6 py-6 md:px-8">
                <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 class="text-xl font-black text-high tracking-tight">Proposal Payload</h2>
                    <p class="mt-1.5 text-sm text-mid max-w-xl leading-relaxed">The decoded transaction packet and its supporting witness signatures that council members are mathematically validating.</p>
                  </div>
                  <span class="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800/30 dark:text-indigo-400">
                    Governance Packet
                  </span>
                </div>
              </div>

              <div class="p-6 md:p-8 space-y-8">
                
                <!-- Core Method & Target -->
                <div class="grid gap-5 md:grid-cols-2">
                  <div class="rounded-3xl border border-line-soft bg-gradient-to-br from-surface-muted/80 to-surface p-5 shadow-sm">
                    <div class="flex items-center gap-2 mb-3">
                      <div class="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center dark:bg-blue-900/30 dark:text-blue-400">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      </div>
                      <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">Target Method</div>
                    </div>
                    <div class="text-lg font-black text-high tracking-tight">{{ proposalMethodSummary }}</div>
                  </div>
                  <div class="rounded-3xl border border-line-soft bg-gradient-to-br from-surface-muted/80 to-surface p-5 shadow-sm">
                    <div class="flex items-center gap-2 mb-3">
                      <div class="h-6 w-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center dark:bg-purple-900/30 dark:text-purple-400">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
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
                      <p class="mt-1 text-sm text-mid">This governance packet chains multiple native-contract calls into one threshold-signed transaction.</p>
                    </div>
                    <span class="inline-flex items-center rounded-full border border-line-soft bg-surface px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-low">
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
                          <div class="text-[10px] font-black uppercase tracking-[0.18em] text-low">Invocation {{ invocation.index }}</div>
                          <div class="mt-1 text-base font-black text-high tracking-tight">{{ invocation.selectedMethod }}</div>
                        </div>
                        <span class="rounded-full border border-line-soft bg-surface-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-low">
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

                <!-- Decoded Script Panel -->
                <div v-if="decodedUnsignedScript" class="rounded-3xl border border-line-soft bg-surface shadow-md overflow-hidden">
                  <div class="border-b border-line-soft bg-surface-muted/40 px-5 py-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="h-8 w-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center dark:bg-amber-900/30 dark:text-amber-400">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                        </div>
                        <div>
                          <h3 class="text-base font-bold text-high tracking-tight">Decoded Execution Script</h3>
                          <p class="text-[11px] text-mid font-medium mt-0.5">The translated contract invocation that council nodes are actively signing.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="dark bg-[#0f172a] p-2 dark:bg-[#020617]">
                    <ScriptViewer :script="decodedUnsignedScript" />
                  </div>
                </div>

                <!-- Raw Unsigned Tx Hex -->
                <div class="rounded-3xl border border-line-soft bg-surface shadow-sm p-5">
                  <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <div class="text-xs font-bold text-high tracking-tight">Raw Unsigned Transaction</div>
                      <p class="mt-1 text-[11px] text-mid">The literal hex byte array presented to wallets for the ECDSA signature.</p>
                    </div>
                    <span class="text-[10px] font-black uppercase tracking-[0.2em] text-low px-2 py-1 bg-surface-muted rounded-md">Hex Payload</span>
                  </div>
                  <div class="rounded-2xl border border-line-soft bg-[#0f172a] p-4 font-mono text-xs break-all text-slate-300 max-h-32 overflow-y-auto shadow-inner leading-relaxed dark:bg-[#020617]">
                    {{ proposal.params?.unsigned_tx || "Unavailable" }}
                  </div>
                </div>

                <!-- Collected Witnesses -->
                <div class="pt-6 border-t border-line-soft">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <div>
                      <h3 class="text-lg font-black tracking-tight text-high">Collected Signatures</h3>
                      <p class="mt-1 text-sm text-mid">Valid ECDSA signatures stored off-chain until quorum is reached.</p>
                    </div>
                    <div class="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl dark:bg-emerald-950/20 dark:border-emerald-900/30">
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
                            :data-testid="`signature-witness-logo-${row.signerAddress}`"
                            alt=""
                            class="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow-md bg-white shrink-0 dark:ring-slate-800"
                            @error="$event.target.src = '/img/brand/neo.png'"
                          />
                          <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2 mb-1.5">
                              <span class="rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:bg-slate-800 dark:text-slate-400">
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
                            <div class="mt-1 font-mono text-[11px] text-mid truncate opacity-80" :title="row.signerAddress">{{ row.signerAddress }}</div>
                          </div>
                        </div>

                        <div class="flex items-center gap-2 rounded-xl bg-surface px-4 py-2 border border-line-soft shrink-0">
                           <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                           <span class="text-xs font-bold text-high">Cryptographically Valid</span>
                        </div>
                      </div>

                      <!-- Witness Data Grid -->
                      <div class="grid gap-4 xl:grid-cols-2">
                        <div class="rounded-2xl border border-line-soft bg-surface p-4">
                          <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low mb-2">Stored ECDSA Signature</div>
                          <div class="rounded-xl border border-line-soft bg-[#0f172a] p-3 font-mono text-[10px] break-all text-slate-300 shadow-inner dark:bg-[#020617]">
                            {{ row.signature }}
                          </div>
                        </div>
                        <div class="rounded-2xl border border-line-soft bg-surface p-4">
                          <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low mb-2">
                            {{ row.witnessJson ? "Attached Witness Meta" : "Empty Fragment" }}
                          </div>
                          <div class="rounded-xl border border-line-soft bg-[#0f172a] p-3 font-mono text-[10px] break-all text-slate-300 shadow-inner max-h-[80px] overflow-y-auto dark:bg-[#020617]">
                            {{ row.witnessJson || "Awaiting final multisig assembly..." }}
                          </div>
                        </div>
                      </div>

                      <!-- Parsed Invocation Script Window -->
                      <div v-if="row.invocationScriptBase64" class="mt-5 rounded-2xl border border-line-soft bg-[#0f172a] shadow-lg overflow-hidden dark:bg-[#020617]">
                        <div class="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-2.5">
                          <div class="flex items-center gap-2">
                            <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <span class="text-[11px] font-bold tracking-wider text-slate-300 uppercase">Parsed Invocation OpCodes</span>
                          </div>
                        </div>
                        <div class="dark p-2">
                          <ScriptViewer :script="row.invocationScriptBase64" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="mt-6 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line-soft bg-surface-muted/30 py-16 text-center">
                    <div class="h-16 w-16 rounded-full bg-surface shadow-sm border border-line-soft flex items-center justify-center mb-4 text-mid">
                       <svg class="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </div>
                    <h4 class="text-base font-bold text-high tracking-tight">No signatures stored yet</h4>
                    <p class="mt-2 max-w-sm text-sm text-mid leading-relaxed">Once council nodes approve and sign this payload, their ECDSA witness fragments will automatically stream here.</p>
                  </div>
                </div>

                <div
                  v-if="proposal.params?.broadcast_witness"
                  class="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-slate-950"
                >
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
                    <div>
                      <h3 class="text-lg font-black tracking-tight text-emerald-800 dark:text-emerald-400">Final Broadcast Witness</h3>
                      <p class="mt-1 text-sm text-emerald-600/80 dark:text-emerald-400/80">Quorum reached. The multi-sig witness assembled to broadcast.</p>
                    </div>
                    <span class="inline-flex items-center rounded-full bg-emerald-500 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-md shadow-emerald-500/20">
                      Successfully Broadcast
                    </span>
                  </div>

                  <div class="grid gap-4 md:grid-cols-2">
                    <div class="rounded-2xl border border-emerald-200/60 bg-white/60 p-4 dark:border-emerald-800/30 dark:bg-black/20">
                      <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700/70 dark:text-emerald-400/70 mb-2">Assembled Invocation Script</div>
                      <div class="rounded-xl border border-line-soft bg-[#0f172a] p-3 font-mono text-[10px] break-all text-slate-300 shadow-inner max-h-40 overflow-y-auto dark:bg-[#020617]">
                        {{ proposal.params.broadcast_witness.invocationScript || "Unavailable" }}
                      </div>
                    </div>
                    <div class="rounded-2xl border border-emerald-200/60 bg-white/60 p-4 dark:border-emerald-800/30 dark:bg-black/20">
                      <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700/70 dark:text-emerald-400/70 mb-2">Council Verification Script</div>
                      <div class="rounded-xl border border-line-soft bg-[#0f172a] p-3 font-mono text-[10px] break-all text-slate-300 shadow-inner max-h-40 overflow-y-auto dark:bg-[#020617]">
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
              <div class="border-b border-line-soft bg-surface/30 px-6 py-6">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h2 class="text-lg font-black text-high tracking-tight">Council Vote Status</h2>
                    <p class="mt-1.5 text-xs text-mid max-w-[250px] leading-relaxed">Track which eligible council members have signed the governance payload.</p>
                  </div>
                  <span class="inline-flex items-center rounded-xl border border-line-soft bg-surface-muted px-3 py-1.5 text-xs font-black tracking-widest text-low shadow-inner">
                    {{ signedCount }} / {{ requiredCount }}
                  </span>
                </div>
              </div>

              <div class="p-5 space-y-3">
                <div
                  v-for="signer in signerRows"
                  :key="signer.address"
                  class="flex items-center justify-between gap-3 rounded-2xl border border-line-soft bg-surface-muted/30 px-4 py-3.5 hover:bg-surface-muted/60 transition-colors duration-200"
                  :class="{ 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/20': signer.signed }"
                >
                  <div class="flex min-w-0 items-center gap-3.5" :title="signer.address">
                    <img
                      :src="signer.logo"
                      :data-testid="`council-status-logo-${signer.address}`"
                      alt=""
                      class="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm bg-white shrink-0 dark:ring-slate-800"
                      @error="$event.target.src = '/img/brand/neo.png'"
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
                      <div class="text-[10px] uppercase tracking-[0.18em] font-semibold" :class="signer.signed ? 'text-emerald-600 dark:text-emerald-400' : 'text-low'">
                        {{ signer.signed ? "Witness stored" : "Awaiting witness" }}
                      </div>
                    </div>
                  </div>
                  <div
                    class="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm"
                    :class="signer.signed ? 'bg-emerald-500 text-white' : 'bg-surface-elevated text-mid border border-line-soft'"
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
              <div v-else class="mt-5 space-y-3">
                <div v-if="!canCurrentSignerVote" class="text-sm text-mid">
                  Only eligible council nodes can sign directly with a connected wallet, but you can still collect and submit an external witness from another council signer.
                </div>
                <button
                  v-if="canCurrentSignerVote && !hasSigned"
                  @click="openSignModal"
                  class="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 hover:-translate-y-0.5 hover:bg-primary-700 transition-all"
                >
                  Vote / Sign Proposal
                </button>
                <button
                  @click="openSignModal"
                  class="w-full rounded-xl border border-line-soft bg-surface px-4 py-3 text-sm font-semibold text-high hover:bg-surface-muted transition-all"
                >
                  Add External Witness
                </button>
                <p class="text-xs text-mid">
                  The collected signature or imported witness is stored in Supabase and will be used to assemble the final multisig witness.
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
              <div class="rounded-xl border border-line-soft bg-[#0f172a] p-3 font-mono text-[10px] break-all text-slate-300 max-h-40 overflow-y-auto shadow-inner dark:bg-[#020617]">
                {{ proposal?.params?.unsigned_tx }}
              </div>
            </div>
            
            <div v-if="decodedUnsignedScript" class="dark bg-[#0f172a] p-3 rounded-xl border border-line-soft shadow-inner dark:bg-[#020617]">
              <ScriptViewer
                :script="decodedUnsignedScript"
                label="Decoded Contract Script"
              />
            </div>
            
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

            <div class="relative py-2">
              <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-line-soft"></div></div>
              <div class="relative flex justify-center"><span class="px-3 bg-white dark:bg-slate-950 text-xs font-bold text-low tracking-widest uppercase rounded-full">OR</span></div>
            </div>

            <div class="space-y-3">
              <label class="block text-sm font-bold text-high">Option 3: External Witness Script</label>
              <input
                v-model="externalSignerAddress"
                type="text"
                class="form-input w-full text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
                placeholder="Signer address (optional if public key is provided)"
              />
              <input
                v-model="externalSignerPublicKey"
                type="text"
                class="form-input w-full font-mono text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
                placeholder="Signer public key (optional)"
              />
              <input
                v-model="externalInvocationScript"
                type="text"
                class="form-input w-full font-mono text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
                placeholder="Invocation script hex from external signer"
              />
              <input
                v-model="externalVerificationScript"
                type="text"
                class="form-input w-full font-mono text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
                placeholder="Verification script hex (optional)"
              />
              <button
                @click="submitExternalWitness"
                :disabled="!externalInvocationScript.trim() || isSubmittingExternalWitness"
                class="w-full px-4 py-3 bg-surface-muted text-high border border-line-soft rounded-xl font-bold hover:bg-surface transition-all active:scale-95 hover:border-line disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmittingExternalWitness ? "Submitting Witness..." : "Submit External Witness" }}
              </button>
              <p class="text-[11px] text-mid text-center">Use this when a council member signs outside the tool and sends their witness script to you directly.</p>
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
import {
  buildExternalWitnessPayload,
  buildSignatureInvocationScriptBase64,
} from "@/utils/multisigWitness";

const route = useRoute();
const toast = useToast();

const proposal = ref(null);
const committeePubkeys = ref([]);
const validatorMetadata = ref([]);
const showSignModal = ref(false);
const manualSignature = ref("");
const isSigning = ref(false);
const externalSignerAddress = ref("");
const externalSignerPublicKey = ref("");
const externalInvocationScript = ref("");
const externalVerificationScript = ref("");
const isSubmittingExternalWitness = ref(false);
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
const INVOCATION_TARGETS = {
  PolicyContract: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
  RoleManagement: "49cf4e5378ffcd4dec034fd98a174c5491e395e2",
  OracleContract: "fe924b7cfe89ddd271abaf7210a80a7e11178758",
  NEO: "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
};
const proposalInvocations = computed(() => {
  const invocations = Array.isArray(proposal.value?.params?.invocations)
    ? proposal.value.params.invocations
    : [];

  if (invocations.length > 0) {
    return invocations.map((invocation, index) => ({
      index: index + 1,
      selectedContract: invocation?.selectedContract || "",
      selectedMethod: invocation?.selectedMethod || "",
      params: invocation?.params || {},
      targetHash:
        INVOCATION_TARGETS[invocation?.selectedContract] ||
        invocation?.targetHash ||
        proposal.value?.target_contract ||
        "",
    }));
  }

  return [
    {
      index: 1,
      selectedContract: "",
      selectedMethod: String(proposal.value?.method || "").trim(),
      params: {},
      targetHash: String(proposal.value?.target_contract || "").trim(),
    },
  ].filter((invocation) => invocation.selectedMethod || invocation.targetHash);
});
const proposalMethodSummary = computed(() => {
  const methods = proposalInvocations.value
    .map((invocation) => String(invocation.selectedMethod || "").trim())
    .filter(Boolean);
  return methods.join(", ") || String(proposal.value?.method || "Unavailable");
});
const proposalTargetSummary = computed(() => {
  if (proposalInvocations.value.length > 1) {
    return `${proposalInvocations.value.length} chained invocations`;
  }
  return (
    proposalInvocations.value[0]?.targetHash ||
    String(proposal.value?.target_contract || "").trim() ||
    "Unavailable"
  );
});
const proposalSubtitle = computed(() => {
  if (proposalInvocations.value.length > 1) {
    return `${proposalInvocations.value.length} chained council invocations are bundled into one governance packet. Review each contract call, verify the unsigned transaction, and broadcast once quorum is met.`;
  }
  return `Council method ${proposalMethodSummary.value} is queued against ${proposalTargetSummary.value}. Review the packet, track collected witnesses, and broadcast once quorum is met.`;
});
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
      councilIndex: index + 1
    };
  });
});

const signatureWitnessRows = computed(() => {
  const eligible = Array.isArray(proposal.value?.eligible_signers) ? proposal.value.eligible_signers : [];
  
  return (proposal.value?.signatures || []).map((signature, index) => {
    const resolved = resolveCouncilIdentity(signature.signer_address, councilIdentityMap.value);
    
    // Find the true council index based on the original eligible signers array to keep naming consistent
    const eligibleIndex = eligible.findIndex(addr => addr === signature.signer_address);
    const displayIndex = eligibleIndex >= 0 ? eligibleIndex + 1 : index + 1;
    
    return {
      signerAddress: signature.signer_address,
      name: resolved.name === signature.signer_address ? `Council Node ${displayIndex}` : resolved.name,
      logo: resolveCouncilLogo(signature.signer_address, resolved.logo),
      signature: signature.signature,
      invocationScriptBase64: signature.invocation_script
        ? hexToBase64(signature.invocation_script.replace(/^0x/i, ""))
        : buildSignatureInvocationScriptBase64(signature.signature),
      witnessJson: signature.witness ? JSON.stringify(signature.witness, null, 2) : "",
      councilIndex: displayIndex
    };
  });
});

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
  externalSignerAddress.value = "";
  externalSignerPublicKey.value = "";
  externalInvocationScript.value = "";
  externalVerificationScript.value = "";
}

function closeSignModal() {
  showSignModal.value = false;
  manualSignature.value = "";
  externalSignerAddress.value = "";
  externalSignerPublicKey.value = "";
  externalInvocationScript.value = "";
  externalVerificationScript.value = "";
}

function findRequestSignerPublicKey(signerAddress) {
  const target = String(signerAddress || "").trim();
  const pubkeys =
    proposal.value?.params?.committee_pubkeys ||
    proposal.value?.params?.committee ||
    committeePubkeys.value ||
    [];
  if (!target || !Array.isArray(pubkeys) || !neonJs) return "";

  for (const pubkey of pubkeys) {
    try {
      if (new neonJs.wallet.Account(pubkey).address === target) {
        return pubkey;
      }
    } catch {
      // Ignore malformed signer pubkeys.
    }
  }

  return "";
}

async function maybeBroadcastIfReady() {
  await loadProposal();
  if (proposal.value && thresholdMet.value && proposal.value.status !== "EXECUTED") {
    await handleBroadcast(proposal.value);
  }
}

async function submitSignature(signatureHex, source = "manual_signature") {
  const signerPublicKey = findRequestSignerPublicKey(connectedAccount.value);
  const payload = buildExternalWitnessPayload({
    signerAddress: connectedAccount.value,
    signerPublicKey,
    signatureHex,
    eligibleSigners: proposal.value?.eligible_signers || [],
    source,
  });

  const result = await supabaseService.addMultisigSignature(
    proposal.value.id,
    payload.signerAddress,
    payload.signature,
    {
      publicKey: payload.publicKey,
      witness: payload.witness,
      invocationScript: payload.invocationScript,
      verificationScript: payload.verificationScript,
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
    await submitSignature(signature, "wallet_signature");
  } catch (error) {
    toast.error(`Signing failed: ${error.message}`);
  } finally {
    isSigning.value = false;
  }
}

async function submitManualSignature() {
  try {
    await submitSignature(manualSignature.value.trim(), "manual_signature");
  } catch (error) {
    toast.error(`Failed to submit signature: ${error.message}`);
  }
}

async function submitExternalWitness() {
  if (!proposal.value) return;
  isSubmittingExternalWitness.value = true;
  try {
    const payload = buildExternalWitnessPayload({
      signerAddress: externalSignerAddress.value,
      signerPublicKey: externalSignerPublicKey.value,
      invocationScript: externalInvocationScript.value,
      verificationScript: externalVerificationScript.value,
      eligibleSigners: proposal.value?.eligible_signers || [],
    });

    const result = await supabaseService.addMultisigSignature(
      proposal.value.id,
      payload.signerAddress,
      payload.signature,
      {
        publicKey: payload.publicKey,
        witness: payload.witness,
        invocationScript: payload.invocationScript,
        verificationScript: payload.verificationScript,
      }
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    toast.success("External witness recorded.");
    closeSignModal();
    await maybeBroadcastIfReady();
  } catch (error) {
    toast.error(`Failed to submit witness: ${error.message}`);
  } finally {
    isSubmittingExternalWitness.value = false;
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
