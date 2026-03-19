<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
    <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Council Governance' }]" />

    <div class="mb-6 overflow-hidden rounded-[32px] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-xl shadow-amber-900/5 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950">
      <div class="relative p-6 md:p-8">
        <div class="pointer-events-none absolute -right-20 -top-12 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/10"></div>
        <div class="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full bg-orange-300/10 blur-3xl dark:bg-orange-500/10"></div>

        <div class="relative grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <div>
            <div class="mb-4 flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center rounded-full border border-amber-200/80 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 dark:border-amber-900/40 dark:bg-slate-950/50 dark:text-amber-400">
                Public Oversight
              </span>
              <span class="inline-flex items-center rounded-full border border-line-soft bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-low dark:bg-slate-950/50">
                {{ activeNetworkLabel }}
              </span>
              <span
                v-if="committeeMultiSig"
                class="inline-flex items-center rounded-full border border-line-soft bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-low dark:bg-slate-950/50"
              >
                {{ threshold }} of {{ committeeSize }} quorum
              </span>
            </div>

            <div class="flex items-start gap-4">
              <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              </div>
              <div class="min-w-0">
                <h1 class="page-title">Council Governance</h1>
                <p class="page-subtitle max-w-3xl">
                  The public command surface for Neo council decisions. Review official proposal packets, monitor quorum pressure, and step into the signing workflow only when you need to act.
                </p>
              </div>
            </div>

            <div class="mt-5 grid gap-4 md:grid-cols-3">
              <div class="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                <div class="text-[10px] font-black uppercase tracking-[0.18em] text-low">Proposal Queue</div>
                <div class="mt-2 text-3xl font-black tracking-tight text-high">{{ pendingRequestCount }}</div>
                <p class="mt-1 text-sm text-mid">{{ requestQueueHeadline }}</p>
              </div>
              <div class="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                <div class="text-[10px] font-black uppercase tracking-[0.18em] text-low">Signature Pressure</div>
                <div class="mt-2 text-3xl font-black tracking-tight text-high">{{ collectedSignatureCount }}</div>
                <p class="mt-1 text-sm text-mid">Council witness fragments currently stored across the active queue.</p>
              </div>
              <div class="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
                <div class="text-[10px] font-black uppercase tracking-[0.18em] text-low">Ready To Broadcast</div>
                <div class="mt-2 text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">{{ readyToBroadcastCount }}</div>
                <p class="mt-1 text-sm text-mid">Packets that already crossed quorum and can be submitted on-chain.</p>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
              <div class="text-[10px] font-black uppercase tracking-[0.2em] text-low mb-3">Committee Snapshot</div>
              <div v-if="committeeMultiSig" class="space-y-3">
                <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
                  <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">Committee Multi-Sig</div>
                  <div class="mt-2 font-mono text-xs break-all text-high">{{ committeeMultiSig.address }}</div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
                    <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">Threshold</div>
                    <div class="mt-1 text-xl font-black text-high">{{ threshold }}</div>
                  </div>
                  <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
                    <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">Committee Size</div>
                    <div class="mt-1 text-xl font-black text-high">{{ committeeSize }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="rounded-2xl border border-dashed border-line-soft bg-surface-muted/50 p-4 text-sm text-mid">
                Committee state is still loading.
              </div>
            </div>

            <div class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70">
              <div class="text-[10px] font-black uppercase tracking-[0.2em] text-low mb-3">Action Gate</div>
              <p class="text-sm text-mid leading-relaxed">
                Anyone can review council proposals without connecting a wallet. A wallet is only required to create proposals, add signatures, or broadcast.
              </p>
              <div class="mt-4 flex flex-wrap gap-3">
                <button
                  v-if="!connectedAccount"
                  disabled
                  class="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-low cursor-not-allowed"
                >
                  Connect in Header
                </button>
                <button
                  v-else-if="!canCreateProposal"
                  disabled
                  class="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-low cursor-not-allowed"
                  :title="isGovernanceLabModeAvailable ? 'Connect a signer that participates in your custom lab signer set' : 'Only active council nodes can create proposals'"
                >
                  Not a Council Node
                </button>
                <button
                  v-else
                  @click="showCreateModal = true"
                  class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                  New Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="etherscan-card overflow-hidden">
      <div class="border-b border-line-soft bg-surface/30 px-6 py-6 md:px-8">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 class="text-xl font-black text-high tracking-tight">Proposal Queue</h2>
            <p class="mt-1.5 text-sm text-mid max-w-2xl leading-relaxed">
              Live council packets awaiting signatures or final broadcast. Each card tracks quorum progress, signer activity, and the exact transaction packet under review.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="inline-flex items-center rounded-full border border-line-soft bg-surface-muted px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-low">
              {{ pendingRequestCount }} active
            </span>
            <span class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400">
              {{ readyToBroadcastCount }} ready
            </span>
          </div>
        </div>
      </div>

      <div class="p-6 md:p-8">
      <div v-if="loading" class="space-y-4">
        <Skeleton v-for="i in 3" :key="i" height="80px" />
      </div>
      <div v-else-if="requests.length === 0" class="rounded-3xl border-2 border-dashed border-line-soft bg-surface-muted/30 py-16 px-6 text-center text-mid">
        <svg class="mx-auto h-14 w-14 text-low mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <p class="text-lg font-bold text-high">No pending council proposals found.</p>
        <p class="mt-2 text-sm text-mid max-w-md mx-auto">The queue is clear right now. When a new governance packet is created, it will appear here with quorum tracking and signer status.</p>
        <span v-if="!connectedAccount" class="mt-2 block text-sm font-medium text-mid">Connect wallet from the top bar to create</span>
        <span v-else-if="!canCreateProposal" class="text-mid mt-2 text-sm font-medium">Only council nodes can create proposals</span>
        <button v-else @click="showCreateModal = true" class="text-primary-500 hover:underline mt-2 text-sm font-medium">Create the first one</button>
      </div>
      <div v-else class="space-y-4">
        <div
          v-for="req in requests"
          :key="req.id"
          class="rounded-3xl border border-line-soft bg-gradient-to-br from-surface to-surface-muted/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-900/5"
        >
          <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span class="inline-flex items-center rounded-full border border-line-soft bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-low dark:bg-slate-950/50">
                  Proposal #{{ req.id }}
                </span>
                <span
                  class="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                  :class="req.status === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'"
                >
                  {{ req.status }}
                </span>
                <span class="inline-flex items-center rounded-full border border-line-soft bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-low dark:bg-slate-950/50">
                  {{ getRequestInvocationCount(req) }} call<span v-if="getRequestInvocationCount(req) > 1">s</span>
                </span>
              </div>

              <h3 class="text-lg font-black tracking-tight text-high">{{ req.description || req.method || "Council Proposal" }}</h3>
              <p class="mt-1.5 text-sm text-mid leading-relaxed">
                {{ getRequestMethodSummary(req) }}
              </p>

              <div class="mt-4 grid gap-3 md:grid-cols-3">
                <div class="rounded-2xl border border-line-soft bg-surface p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.15em] text-low">Target Surface</div>
                  <div class="mt-1 font-mono text-xs break-all text-high">{{ getRequestTargetSummary(req) }}</div>
                </div>
                <div class="rounded-2xl border border-line-soft bg-surface p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.15em] text-low">Created</div>
                  <div class="mt-1 text-sm font-bold text-high">{{ formatRequestCreatedAt(req.created_at) }}</div>
                </div>
                <div class="rounded-2xl border border-line-soft bg-surface p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.15em] text-low">Transaction Hash</div>
                  <div class="mt-1 font-mono text-xs break-all text-high">{{ req.params?.hash || "Unavailable" }}</div>
                </div>
              </div>

              <div class="mt-4">
                <div class="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span class="font-semibold text-high">Signature Progress</span>
                  <span class="text-mid">{{ getRequestSignatureCount(req) }} / {{ req.signers_required }} approvals captured</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full border border-line-soft bg-surface-muted shadow-inner">
                  <div
                    class="h-full rounded-full transition-all duration-500 ease-out"
                    :class="getRequestProgressPercent(req) >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'"
                    :style="{ width: `${getRequestProgressPercent(req)}%` }"
                  ></div>
                </div>
              </div>

              <div class="mt-4 flex flex-wrap gap-3 text-xs">
                <RouterLink :to="{ name: 'governance-proposal-detail', params: { id: req.id } }" class="font-semibold text-primary-500 hover:underline">Open Proposal Page</RouterLink>
                <button @click="viewDetails(req)" class="font-semibold text-primary-500 hover:underline">View JSON / Details</button>
              </div>
            </div>

            <div class="rounded-3xl border border-line-soft bg-white/80 p-5 shadow-sm dark:bg-slate-950/60">
              <div class="text-[10px] font-black uppercase tracking-[0.18em] text-low">Action Panel</div>
              <div class="mt-3 text-3xl font-black tracking-tight text-high">{{ getRequestSignatureCount(req) }}</div>
              <div class="text-sm text-mid">of {{ req.signers_required }} required signatures</div>

              <div class="mt-4 space-y-2">
                <div v-if="req.status === 'PENDING'">
                  <div v-if="getRequestSignatureCount(req) >= req.signers_required" class="space-y-2">
                    <button @click="handleBroadcast(req)" class="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors">Broadcast Tx</button>
                  </div>
                  <div v-else class="space-y-2">
                    <button
                      v-if="isCouncilNode && !hasSigned(req)"
                      @click="openSignModal(req)"
                      class="w-full px-4 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-colors"
                    >
                      Sign Proposal
                    </button>
                    <button
                      @click="openSignModal(req)"
                      class="w-full px-4 py-2.5 bg-surface-muted text-high border border-line-soft text-sm font-bold rounded-xl hover:bg-surface transition-colors"
                    >
                      Add Witness
                    </button>
                    <span v-if="hasSigned(req)" class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      Signed
                    </span>
                  </div>
                </div>
                <div v-if="req.status === 'EXECUTED' && req.tx_hash">
                  <a :href="'/tx/' + req.tx_hash" class="text-xs font-semibold text-primary-500 hover:underline">View Tx</a>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="req.signatures?.length > 0" class="mt-4 pt-3 border-t border-line-soft">
            <div class="text-xs font-semibold text-mid mb-2">Approved By</div>
            <div class="flex flex-wrap gap-2">
               <span
                 v-for="sig in req.signatures"
                 :key="sig.id"
                 class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded bg-surface-muted border border-line-soft text-xs text-low"
                 :title="sig.signer_address"
               >
                 <img
                   v-if="getCouncilIdentity(sig.signer_address).logo"
                   :src="getCouncilIdentity(sig.signer_address).logo"
                   :data-logo-fallback-index="0"
                   alt=""
                   class="h-5 w-5 rounded-full object-cover ring-1 ring-line-soft bg-white shrink-0"
                   @error="handleCouncilLogoError($event, getCouncilIdentity(sig.signer_address).logoSources)"
                 />
                 <span class="font-medium text-high">
                   {{ sig.signer_address === connectedAccount ? `You · ${getCouncilIdentity(sig.signer_address).name}` : getCouncilIdentity(sig.signer_address).name }}
                 </span>
               </span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
    
    <!-- Sign Modal -->
    <div v-if="signModalReq" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity">
      <div class="w-full max-w-lg rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col">
        <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </div>
            <h2 class="text-xl font-bold text-high tracking-tight">Sign Proposal</h2>
          </div>
          <button @click="signModalReq = null" class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div class="p-6 space-y-6">
           <div>
             <p class="text-xs font-bold text-low uppercase tracking-wider mb-2">Unsigned Payload Hex</p>
             <div class="p-3 bg-surface-muted rounded-xl border border-line-soft font-mono text-[10px] break-all text-mid overflow-y-auto max-h-32 shadow-inner">
               {{ signModalReq.params?.unsigned_tx }}
             </div>
           </div>
           
           <ScriptViewer
             v-if="signModalDecodedScript"
             :script="signModalDecodedScript"
             label="Decoded Contract Script"
           />
           
           <div class="space-y-3">
             <label class="block text-sm font-bold text-high">Option 1: Wallet Signature</label>
             <button @click="autoSignTx" :disabled="isSigning" class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md">
               <svg v-if="isSigning" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
               {{ isSigning ? 'Awaiting Wallet...' : 'Sign with Connected Wallet' }}
             </button>
             <p class="text-[11px] text-mid text-center">Requires a wallet capable of signing raw bytes.</p>
           </div>
           
           <div class="relative py-2">
             <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-line-soft"></div></div>
             <div class="relative flex justify-center"><span class="px-3 bg-white dark:bg-slate-950 text-xs font-bold text-low tracking-widest uppercase rounded-full">OR</span></div>
           </div>

           <div class="space-y-3">
             <label class="block text-sm font-bold text-high">Option 2: Manual Entry</label>
             <input v-model="manualSignature" type="text" class="form-input w-full font-mono text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none" placeholder="Paste 64-byte signature hex here..." />
             <button @click="submitManualSignature" :disabled="!manualSignature || manualSignature.length < 128" class="w-full px-4 py-3 bg-surface-muted text-high border border-line-soft rounded-xl font-bold hover:bg-surface transition-all active:scale-95 hover:border-line disabled:opacity-50 disabled:cursor-not-allowed">
               Submit Manual Signature
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
             <p class="text-[11px] text-mid text-center">Use this when a council member signed elsewhere and sent you the witness script directly.</p>
           </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity">
      <div class="w-full max-w-2xl rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[90vh]">
        <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <h2 class="text-xl font-bold text-high tracking-tight">Create Council Proposal</h2>
          </div>
          <button @click="showCreateModal = false" class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar">
           <div v-if="isGovernanceLabModeAvailable" class="space-y-3 rounded-2xl border border-line-soft bg-surface-muted/50 p-4">
             <div class="flex flex-wrap items-center justify-between gap-3">
               <div>
                 <h3 class="text-sm font-bold text-high tracking-tight">Proposal Mode</h3>
                 <p class="mt-1 text-xs text-mid">
                   Official council mode uses the live testnet committee. Lab mode lets you mock the signer set and threshold while still using the same proposal and signature collection flow.
                 </p>
               </div>
               <div class="inline-flex rounded-xl border border-line-soft bg-surface p-1">
                 <button
                   data-testid="governance-mode-official"
                   type="button"
                   class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                   :class="createForm.mode === 'official' ? 'bg-amber-500 text-white' : 'text-mid hover:text-high'"
                   @click="setCreateMode('official')"
                 >
                   Official Council
                 </button>
                 <button
                   data-testid="governance-mode-lab"
                   type="button"
                   class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                   :class="createForm.mode === 'lab' ? 'bg-amber-500 text-white' : 'text-mid hover:text-high'"
                   @click="setCreateMode('lab')"
                 >
                   Lab Mode
                 </button>
               </div>
             </div>

             <div v-if="createForm.mode === 'lab'" class="grid grid-cols-1 gap-4 md:grid-cols-[1fr,180px]">
               <div class="space-y-2">
                 <label class="block text-xs font-bold text-high uppercase tracking-wider opacity-80">Signer Public Keys</label>
                 <textarea
                   data-testid="lab-signer-pubkeys"
                   v-model="createForm.labSignerPubkeys"
                   rows="5"
                   class="form-input w-full bg-surface text-sm py-2 px-3 rounded-xl border-line-soft shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none font-mono"
                   placeholder="One compressed public key per line, or comma-separated"
                 ></textarea>
                 <p class="text-xs text-mid">
                   Include the connected wallet signer in this list. The tool will derive eligible signer addresses from these public keys and use your chosen threshold instead of the live council threshold.
                 </p>
               </div>
               <div class="space-y-2">
                 <label class="block text-xs font-bold text-high uppercase tracking-wider opacity-80">Signature Threshold</label>
                 <input
                   data-testid="lab-threshold"
                   v-model="createForm.labThreshold"
                   type="number"
                   min="1"
                   class="form-input w-full bg-surface text-sm py-2 px-3 rounded-xl border-line-soft shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
                 />
                 <div class="rounded-xl border border-dashed border-line-soft bg-surface/50 px-3 py-2 text-xs text-mid">
                   Signers detected: <span class="font-semibold text-high">{{ parsedLabSignerCount }}</span>
                 </div>
               </div>
             </div>
           </div>

           <div class="space-y-2">
             <label class="block text-sm font-bold text-high tracking-tight">Proposal Description</label>
             <input v-model="createForm.description" type="text" class="form-input w-full bg-surface text-sm py-2.5 px-4 rounded-xl border-line-soft shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none" placeholder="e.g. Decrease GAS Network Fee" />
           </div>

           <div class="space-y-6">
             <div v-for="(inv, idx) in createForm.invocations" :key="idx" class="p-5 rounded-2xl bg-surface-muted/50 border border-line-soft space-y-5 relative group transition-colors hover:border-amber-400">
               <div class="flex justify-between items-center pb-2 border-b border-line-soft">
                 <h3 class="text-sm font-bold text-high tracking-tight flex items-center gap-2">
                   <span class="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs">{{ idx + 1 }}</span>
                   Invocation
                 </h3>
                 <button v-if="createForm.invocations.length > 1" @click="removeInvocation(idx)" class="text-red-500 hover:text-red-600 text-xs font-bold px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors flex items-center gap-1">
                   <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                   Remove
                 </button>
               </div>

               <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div class="space-y-2">
                   <label class="block text-xs font-bold text-high uppercase tracking-wider opacity-80">Target Contract</label>
                   <select v-model="inv.selectedContract" @change="handleContractChange(idx)" class="form-input w-full bg-surface text-sm py-2 px-3 rounded-xl border-line-soft shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all cursor-pointer outline-none">
                     <option v-for="(addr, name) in NATIVE_CONTRACTS" :key="name" :value="name">{{ name }}</option>
                   </select>
                 </div>
                 <div class="space-y-2">
                   <label class="block text-xs font-bold text-high uppercase tracking-wider opacity-80">Method to Invoke</label>
                   <select v-model="inv.selectedMethod" @change="inv.params = {}" class="form-input w-full bg-surface text-sm py-2 px-3 rounded-xl border-line-soft shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all cursor-pointer outline-none">
                     <option v-for="m in getAvailableMethods(inv.selectedContract)" :key="m.name" :value="m.name">{{ m.name }}</option>
                   </select>
                 </div>
               </div>

               <div
                 v-if="getMethodDefinition(inv.selectedContract, inv.selectedMethod)?.description || formatMethodCallFlags(getMethodDefinition(inv.selectedContract, inv.selectedMethod))"
                 class="rounded-2xl border border-line-soft bg-surface/70 p-4 space-y-2"
               >
                 <p
                   v-if="getMethodDefinition(inv.selectedContract, inv.selectedMethod)?.description"
                   class="text-sm text-high leading-relaxed"
                 >
                   {{ getMethodDefinition(inv.selectedContract, inv.selectedMethod).description }}
                 </p>
                 <p
                   v-if="formatMethodCallFlags(getMethodDefinition(inv.selectedContract, inv.selectedMethod))"
                   class="text-[11px] font-medium uppercase tracking-[0.18em] text-low"
                 >
                   Call Flags: {{ formatMethodCallFlags(getMethodDefinition(inv.selectedContract, inv.selectedMethod)) }}
                 </p>
               </div>

               <div v-if="getMethodParams(inv.selectedContract, inv.selectedMethod).length > 0" class="space-y-3 pt-2">
                 <div v-for="(param, pIdx) in getMethodParams(inv.selectedContract, inv.selectedMethod)" :key="pIdx" class="space-y-1.5">
                   <label class="block text-xs font-bold text-high tracking-tight">{{ param.label || param.name }} <span class="font-normal text-mid ml-1">({{ param.type }})</span></label>
                   <p v-if="param.description" class="text-xs text-mid leading-relaxed">{{ param.description }}</p>
                   <p v-if="param.example || param.hint" class="text-[11px] text-low leading-relaxed">
                     <span v-if="param.example">Example: <span class="font-mono text-high">{{ param.example }}</span></span>
                     <span v-if="param.example && param.hint"> · </span>
                     <span v-if="param.hint">{{ param.hint }}</span>
                   </p>
                   <input
                     v-model="inv.params[param.name]"
                     type="text"
                     class="form-input w-full bg-surface text-sm py-2 px-3 rounded-lg border-line-soft shadow-inner focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all outline-none"
                     :placeholder="param.placeholder || `Enter ${param.type} value`"
                   />
                 </div>
               </div>
               
               <div v-else class="p-4 text-center border border-dashed border-line-soft rounded-xl bg-surface/50 text-mid text-xs">
                 No parameters required for this method.
               </div>
             </div>
             
             <button @click="addInvocation" class="w-full py-3.5 border-2 border-dashed border-line-soft rounded-2xl text-amber-600 dark:text-amber-500 font-bold hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-400 transition-all flex items-center justify-center gap-2 group">
               <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
               Add Another Invocation
             </button>
           </div>
        </div>
        <div class="px-6 py-4 border-t border-line-soft bg-surface/50 flex justify-end gap-3">
          <button @click="showCreateModal = false" class="px-6 py-2.5 text-sm font-bold text-mid hover:text-high hover:bg-surface-muted rounded-xl transition-all">Cancel</button>
          <button @click="handleCreateProposal" :disabled="isCreating || !createForm.description" class="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-amber-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95">
            <svg v-if="isCreating" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {{ isCreating ? 'Creating...' : 'Create Proposal' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Details Modal -->
    <div v-if="detailsModalReq" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity">
      <div class="w-full max-w-2xl rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[90vh]">
        <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
            </div>
            <h2 class="text-xl font-bold text-high tracking-tight">Proposal Details JSON</h2>
          </div>
          <button @click="detailsModalReq = null" class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div class="p-6 overflow-y-auto font-mono text-xs text-mid whitespace-pre-wrap bg-surface-muted shadow-inner">
          {{ JSON.stringify(detailsModalReq, null, 2) }}
          <div v-if="detailsModalDecodedScript" class="mt-6 whitespace-normal font-sans">
            <ScriptViewer :script="detailsModalDecodedScript" label="Decoded Contract Script" />
          </div>
        </div>
      </div>
    </div>

    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ScriptViewer from "@/components/trace/ScriptViewer.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount } from '@/utils/wallet';
import { walletService } from "@/services/walletService";
import { getRpcClientUrl, getCurrentEnv } from '@/utils/env';
import { useNetworkChange } from '@/composables/useNetworkChange';
import { toNetworkMode } from '@/utils/rpcEndpoints';
import { isGovernanceRequest, matchesRequestNetwork } from '@/utils/governanceRequests';
import { extractScriptBase64FromUnsignedTx } from "@/utils/unsignedTransaction";
import { buildCouncilIdentityMap, resolveCouncilIdentity } from "@/utils/councilIdentity";
import { getDefaultCandidateLogoUrl, resolveCandidateLogoUrl } from "@/utils/logoOptimization";
import { buildExternalWitnessPayload } from "@/utils/multisigWitness";
import { useToast } from "vue-toastification";
import { isPublicKeyHex } from "@/utils/neoHelpers";

const toast = useToast();
const loading = ref(true);
const requests = ref([]);
const showCreateModal = ref(false);

const committeePubkeys = ref([]);
const committeeMultiSig = ref(null);
const threshold = ref(0);
const committeeSize = ref(0);
const validatorMetadata = ref([]);

let neonJs = null;
const councilIdentityMap = computed(() => buildCouncilIdentityMap(validatorMetadata.value));
const isGovernanceLabModeAvailable = computed(() => toNetworkMode(getCurrentEnv()) === 'testnet');
const canCreateProposal = computed(() => Boolean(connectedAccount.value) && (isCouncilNode.value || isGovernanceLabModeAvailable.value));
const activeNetworkLabel = computed(() => toNetworkMode(getCurrentEnv()) === "testnet" ? "Testnet" : "Mainnet");
const pendingRequestCount = computed(() => requests.value.filter((request) => request.status === "PENDING").length);
const readyToBroadcastCount = computed(() =>
  requests.value.filter((request) => request.status === "PENDING" && getRequestSignatureCount(request) >= Number(request.signers_required || 0)).length
);
const collectedSignatureCount = computed(() =>
  requests.value.reduce((sum, request) => sum + getRequestSignatureCount(request), 0)
);
const requestQueueHeadline = computed(() => {
  if (pendingRequestCount.value === 0) return "No active proposals under review";
  if (pendingRequestCount.value === 1) return "1 active proposal under review";
  return `${pendingRequestCount.value} active proposals under review`;
});

const isCouncilNode = computed(() => {
  if (!connectedAccount.value || !committeeMultiSig.value || !neonJs) return false;
  try {
    return committeePubkeys.value.some(pk => new neonJs.wallet.Account(pk).address === connectedAccount.value);
  } catch(e) {
    return false;
  }
});

const NATIVE_CONTRACTS = {
  PolicyContract: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
  RoleManagement: "49cf4e5378ffcd4dec034fd98a174c5491e395e2",
  OracleContract: "fe924b7cfe89ddd271abaf7210a80a7e11178758",
  NEO: "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"
};

const NATIVE_METHODS = {
  PolicyContract: [
    {
      name: "setFeePerByte",
      params: [{ name: "value", type: "Integer" }],
    },
    {
      name: "setExecFeeFactor",
      params: [{ name: "value", type: "Integer" }],
    },
    {
      name: "setStoragePrice",
      params: [{ name: "value", type: "Integer" }],
    },
    {
      name: "setMillisecondsPerBlock",
      description: "Block generation time in milliseconds.",
      callFlags: ["States", "AllowNotify"],
      params: [
        {
          name: "value",
          type: "Integer",
          label: "Milliseconds Per Block",
          description: "Block generation time in milliseconds.",
          example: "3000",
          hint: "Use 3000 for a 3 second block interval.",
          placeholder: "e.g. 3000",
        },
      ],
    },
    {
      name: "blockAccount",
      params: [{ name: "account", type: "Hash160" }],
    },
    {
      name: "unblockAccount",
      params: [{ name: "account", type: "Hash160" }],
    }
  ],
  RoleManagement: [
    { name: "designateAsRole", params: [{ name: "role", type: "Integer" }, { name: "nodes", type: "Array" }] }
  ],
  OracleContract: [
    { name: "setPrice", params: [{ name: "price", type: "Integer" }] }
  ],
  NEO: [
    {
      name: "setGasPerBlock",
      description: "GAS generated per block, expressed in GAS fractions.",
      callFlags: ["States"],
      params: [
        {
          name: "gasPerBlock",
          type: "Integer",
          label: "GAS Per Block",
          description: "GAS generated per block, expressed in GAS fractions.",
          example: "100000000",
          hint: "1 GAS = 100000000.",
          placeholder: "e.g. 100000000",
        },
      ],
    },
    { name: "setRegisterPrice", params: [{ name: "registerPrice", type: "Integer" }] }
  ]
};

function createInvocation() {
  const defaultContract = 'PolicyContract';
  const methods = getAvailableMethods(defaultContract);
  return {
    selectedContract: defaultContract,
    selectedMethod: methods.length > 0 ? methods[0].name : '',
    params: {},
  };
}

const createForm = ref({
  description: '',
  mode: 'official',
  labSignerPubkeys: '',
  labThreshold: '2',
  invocations: [createInvocation()]
});

const isCreating = ref(false);

function getAvailableMethods(contract) {
  return NATIVE_METHODS[contract] || [];
}

function getMethodDefinition(contract, methodName) {
  const methods = getAvailableMethods(contract);
  return methods.find((method) => method.name === methodName) || null;
}

function getMethodParams(contract, methodName) {
  const method = getMethodDefinition(contract, methodName);
  return method ? method.params : [];
}

function resolveMethodCallFlags(method) {
  if (!method?.callFlags?.length || !neonJs?.sc?.CallFlags) return undefined;
  return method.callFlags.reduce((value, flagName) => {
    const flagValue = neonJs.sc.CallFlags?.[flagName];
    return Number.isFinite(flagValue) ? value | flagValue : value;
  }, 0);
}

function formatMethodCallFlags(method) {
  if (!method?.callFlags?.length) return "";
  return method.callFlags.join(" | ");
}

function handleContractChange(index) {
  const inv = createForm.value.invocations[index];
  const methods = getAvailableMethods(inv.selectedContract);
  if (methods.length > 0) {
    inv.selectedMethod = methods[0].name;
    inv.params = {};
  }
}

function addInvocation() {
  createForm.value.invocations.push(createInvocation());
}

function removeInvocation(index) {
  if (createForm.value.invocations.length > 1) {
    createForm.value.invocations.splice(index, 1);
  }
}

function normalizeSignerPubkeys(rawValue) {
  return [...new Set(
    String(rawValue || '')
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}

const parsedLabSignerCount = computed(() => normalizeSignerPubkeys(createForm.value.labSignerPubkeys).length);

function setCreateMode(mode) {
  createForm.value.mode = mode;
}

function resolveSignerConfig() {
  if (createForm.value.mode === 'lab') {
    if (!isGovernanceLabModeAvailable.value) {
      throw new Error("Lab mode is only available on testnet.");
    }

    const signerPubkeys = normalizeSignerPubkeys(createForm.value.labSignerPubkeys);
    if (signerPubkeys.length === 0) {
      throw new Error("Add at least one signer public key for lab mode.");
    }

    for (const pubkey of signerPubkeys) {
      if (!isPublicKeyHex(pubkey)) {
        throw new Error(`Invalid signer public key: ${pubkey}`);
      }
    }

    const thresholdValue = Number.parseInt(String(createForm.value.labThreshold || ''), 10);
    if (!Number.isFinite(thresholdValue) || thresholdValue < 1 || thresholdValue > signerPubkeys.length) {
      throw new Error("Lab threshold must be between 1 and the number of signer public keys.");
    }

    const signerAddresses = signerPubkeys.map((pubkey) => new neonJs.wallet.Account(pubkey).address);
    if (!signerAddresses.includes(connectedAccount.value)) {
      throw new Error("Connected wallet must be included in the lab signer public keys.");
    }

    return {
      mode: 'lab',
      signerPubkeys,
      signerAddresses,
      thresholdValue,
      multiSigAccount: neonJs.wallet.Account.createMultiSig(thresholdValue, signerPubkeys),
    };
  }

  return {
    mode: 'official',
    signerPubkeys: committeePubkeys.value,
    signerAddresses: getCommitteeAddresses(),
    thresholdValue: threshold.value,
    multiSigAccount: committeeMultiSig.value,
  };
}

async function loadCommittee() {
  if (!neonJs) return;
  try {
    const rpcClient = new neonJs.rpc.RPCClient(getRpcClientUrl());
    const committee = await rpcClient.getCommittee();
    const sorted = [...committee].sort((a,b) => a.localeCompare(b));
    committeePubkeys.value = sorted;
    committeeSize.value = sorted.length;
    threshold.value = Math.floor(sorted.length / 2) + 1;
    committeeMultiSig.value = neonJs.wallet.Account.createMultiSig(threshold.value, sorted);
  } catch (e) {
    console.error("Failed to load committee:", e);
  }
}

async function loadRequests() {
  try {
    const data = await supabaseService.getMultisigRequests();
    const activeNetwork = getCurrentEnv();
    requests.value = Array.isArray(data)
      ? data.filter((request) => isGovernanceRequest(request, NATIVE_CONTRACTS) && matchesRequestNetwork(request, activeNetwork))
      : [];
  } catch (e) {
    console.error("Error loading requests", e);
  }
}

async function loadValidatorMetadata() {
  try {
    validatorMetadata.value = await supabaseService.getValidatorMetadata(getCurrentEnv());
  } catch {
    validatorMetadata.value = [];
  }
}

function hasSigned(req) {
  if (!connectedAccount.value || !req.signatures) return false;
  return req.signatures.some(s => s.signer_address === connectedAccount.value);
}

function getRequestSignatureCount(req) {
  return Array.isArray(req?.signatures) ? req.signatures.length : 0;
}

function getRequestInvocationCount(req) {
  if (Array.isArray(req?.params?.invocations) && req.params.invocations.length > 0) {
    return req.params.invocations.length;
  }

  const methods = String(req?.method || "").split(",").map((item) => item.trim()).filter(Boolean);
  return methods.length || 1;
}

function getRequestMethodSummary(req) {
  if (Array.isArray(req?.params?.invocations) && req.params.invocations.length > 1) {
    return req.params.invocations.map((invocation) => `${invocation.selectedContract}.${invocation.selectedMethod}`).join(" • ");
  }

  return String(req?.method || "No method metadata available.");
}

function getRequestTargetSummary(req) {
  if (Array.isArray(req?.params?.target_contracts) && req.params.target_contracts.length > 1) {
    return `${req.params.target_contracts.length} contract targets`;
  }

  return req?.target_contract || "Unavailable";
}

function getRequestProgressPercent(req) {
  const required = Number(req?.signers_required || 0);
  if (!Number.isFinite(required) || required <= 0) return 0;
  return Math.min(100, (getRequestSignatureCount(req) / required) * 100);
}

function formatRequestCreatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString();
}

function getCommitteeAddresses(pubkeys = committeePubkeys.value) {
  if (!neonJs) return [];
  return pubkeys.map((pubkey) => new neonJs.wallet.Account(pubkey).address);
}

const signModalReq = ref(null);
const manualSignature = ref("");
const isSigning = ref(false);
const externalSignerAddress = ref("");
const externalSignerPublicKey = ref("");
const externalInvocationScript = ref("");
const externalVerificationScript = ref("");
const isSubmittingExternalWitness = ref(false);
const signModalDecodedScript = computed(() =>
  extractScriptBase64FromUnsignedTx(signModalReq.value?.params?.unsigned_tx || "")
);

const detailsModalReq = ref(null);
const detailsModalDecodedScript = computed(() =>
  extractScriptBase64FromUnsignedTx(detailsModalReq.value?.params?.unsigned_tx || "")
);
function getCouncilIdentity(address) {
  const resolved = resolveCouncilIdentity(address, councilIdentityMap.value);
  return {
    ...resolved,
    name: resolved.name === address ? "Council Signer" : resolved.name,
    logo: resolveCouncilLogo(address, resolved.logo),
    logoSources: buildCouncilLogoSources(address, resolved.logo),
  };
}

function findCommitteePubkeyForAddress(address) {
  const target = String(address || "").trim();
  if (!target || !Array.isArray(committeePubkeys.value) || !neonJs) return "";

  for (const pubkey of committeePubkeys.value) {
    try {
      if (new neonJs.wallet.Account(pubkey).address === target) {
        return pubkey;
      }
    } catch {
      // Ignore malformed committee pubkeys.
    }
  }

  return "";
}

function buildCouncilLogoSources(address, explicitLogo = "") {
  const candidates = [];
  const normalizedLogo = String(explicitLogo || "").trim();
  if (normalizedLogo) {
    candidates.push(resolveCandidateLogoUrl(normalizedLogo));
  }

  const pubkey = findCommitteePubkeyForAddress(address);
  if (pubkey) {
    candidates.push(getDefaultCandidateLogoUrl(pubkey));
  }

  candidates.push("/img/brand/neo.png");
  return [...new Set(candidates.filter(Boolean))];
}

function resolveCouncilLogo(address, explicitLogo = "") {
  return buildCouncilLogoSources(address, explicitLogo)[0] || "/img/brand/neo.png";
}

function handleCouncilLogoError(event, sources = []) {
  const element = event?.target;
  if (!element) return;

  const currentIndex = Number.parseInt(element.dataset.logoFallbackIndex || "0", 10);
  const nextIndex = Number.isFinite(currentIndex) ? currentIndex + 1 : 1;
  const nextSource = sources[nextIndex] || "/img/brand/neo.png";

  element.dataset.logoFallbackIndex = String(nextIndex);
  element.src = nextSource;
}

function viewDetails(req) {
  detailsModalReq.value = req;
}

function openSignModal(req) {
  signModalReq.value = req;
  manualSignature.value = "";
  externalSignerAddress.value = "";
  externalSignerPublicKey.value = "";
  externalInvocationScript.value = "";
  externalVerificationScript.value = "";
}

function findRequestSignerPublicKey(requestLike, signerAddress) {
  const target = String(signerAddress || "").trim();
  const pubkeys = requestLike?.params?.committee_pubkeys || requestLike?.params?.committee || [];
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

function normalizeArg(val, type) {
  if (!neonJs) return val;
  if (type === "Integer") return neonJs.sc.ContractParam.integer(val);
  if (type === "Hash160") {
    // If it's an address, convert to Hash160 hex
    if (val.startsWith("N") && val.length === 34) {
      return neonJs.sc.ContractParam.hash160(neonJs.wallet.getScriptHashFromAddress(val));
    }
    return neonJs.sc.ContractParam.hash160(val);
  }
  if (type === "Array") {
    // Assume JSON array string
    try {
      const arr = JSON.parse(val);
      return neonJs.sc.ContractParam.array(arr.map(i => neonJs.sc.ContractParam.any(i)));
    } catch {
      throw new Error("Invalid Array format. Provide a JSON array.");
    }
  }
  return neonJs.sc.ContractParam.string(val);
}

async function handleCreateProposal() {
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first.");
    return;
  }
  if (createForm.value.mode !== 'lab' && !isCouncilNode.value) {
    toast.error("Only council nodes can create proposals.");
    return;
  }
  if (!createForm.value.description) {
    toast.error("Please enter a description.");
    return;
  }
  if (createForm.value.invocations.length === 0) {
    toast.error("At least one invocation is required.");
    return;
  }

  isCreating.value = true;
  try {
    const rpcClient = new neonJs.rpc.RPCClient(getRpcClientUrl());
    const currentHeight = await rpcClient.getBlockCount();
    const signerConfig = resolveSignerConfig();
    
    // Parse args for all invocations
    const intents = createForm.value.invocations.map(inv => {
      const targetContract = NATIVE_CONTRACTS[inv.selectedContract];
      const method = inv.selectedMethod;
      
      const mDef = getMethodDefinition(inv.selectedContract, method);
      
      const args = mDef.params.map(p => {
        const val = inv.params[p.name];
        if (val === undefined || val === '') throw new Error(`Missing param: ${p.name} in method ${method}`);
        return normalizeArg(val, p.type);
      });

      const callFlags = resolveMethodCallFlags(mDef);
      
      return {
        scriptHash: targetContract,
        operation: method,
        args,
        ...(callFlags !== undefined ? { callFlags } : {}),
      };
    });
    
    const script = neonJs.sc.createScript(...intents);
    
    // Create unsigned transaction
    const t = new neonJs.tx.Transaction({
      signers: [{ account: signerConfig.multiSigAccount.scriptHash, scopes: neonJs.tx.WitnessScope.Global }],
      validUntilBlock: currentHeight + 100000, // Long expiration for multisig gathering (~17 days)
      systemFee: "100000000", // 1 GAS
      networkFee: "500000000", // 5 GAS
      script: neonJs.u.HexString.fromHex(script)
    });
    
    const unsignedTxHex = t.serialize(false);
    const txHash = t.hash();
    
    // Format descriptive targets for the UI representation
    const targetContracts = createForm.value.invocations.map(inv => NATIVE_CONTRACTS[inv.selectedContract]);
    const methods = createForm.value.invocations.map(inv => inv.selectedMethod).join(',');
    const targetSummary = targetContracts.length > 1
      ? "MULTI_CALL"
      : (targetContracts[0] || "");

    const payload = {
      type: "governance",
      creator_address: connectedAccount.value,
      target_contract: targetSummary,
      method: methods.length > 255 ? methods.substring(0, 250) + "..." : methods,
      description: createForm.value.description,
      signers_required: signerConfig.thresholdValue,
      eligible_signers: signerConfig.signerAddresses,
      status: "PENDING",
      network: toNetworkMode(getCurrentEnv()) || "mainnet",
      params: {
        unsigned_tx: unsignedTxHex,
        hash: txHash,
        scriptHash: signerConfig.multiSigAccount.scriptHash,
        committee_pubkeys: signerConfig.signerPubkeys,
        governance_mode: signerConfig.mode,
        lab_mode: signerConfig.mode === 'lab',
        lab_signer_addresses: signerConfig.mode === 'lab' ? signerConfig.signerAddresses : undefined,
        target_contracts: targetContracts,
        invocations: createForm.value.invocations.map((inv) => ({
          ...inv,
          targetHash: NATIVE_CONTRACTS[inv.selectedContract],
        })),
      }
    };
    
    const res = await supabaseService.createMultisigRequest(payload);
    if (!res.success) throw new Error(res.error);
    
    toast.success("Proposal created successfully!");
    showCreateModal.value = false;
    createForm.value = {
      description: '',
      mode: 'official',
      labSignerPubkeys: '',
      labThreshold: '2',
      invocations: [createInvocation()]
    };
    await loadRequests();
  } catch (e) {
    console.error(e);
    toast.error("Failed to create proposal: " + e.message);
  } finally {
    isCreating.value = false;
  }
}

async function autoSignTx() {
  if (!signModalReq.value) return;
  isSigning.value = true;
  try {
    const unsignedTxHex = signModalReq.value.params.unsigned_tx;
    const signature = await walletService.signRawTransaction(unsignedTxHex);
    await submitSig(signature, "wallet_signature");
  } catch (e) {
    console.error(e);
    toast.error("Signing failed: " + e.message);
  } finally {
    isSigning.value = false;
  }
}

async function submitManualSignature() {
  if (!manualSignature.value) return;
  await submitSig(manualSignature.value.trim(), "manual_signature");
}

async function submitSig(signatureHex, source = "manual_signature") {
  if (!signatureHex || signatureHex.length < 128) {
    throw new Error("Invalid signature length. Expected at least 64 bytes (128 hex chars).");
  }
  try {
    const requestId = signModalReq.value.id;
    const signerPublicKey = findRequestSignerPublicKey(signModalReq.value, connectedAccount.value);
    const payload = buildExternalWitnessPayload({
      signerAddress: connectedAccount.value,
      signerPublicKey,
      signatureHex,
      eligibleSigners: signModalReq.value?.eligible_signers || [],
      source,
    });

    const res = await supabaseService.addMultisigSignature(
      requestId,
      payload.signerAddress,
      payload.signature,
      {
        publicKey: payload.publicKey,
        witness: payload.witness,
        invocationScript: payload.invocationScript,
        verificationScript: payload.verificationScript,
      }
    );
    if (!res.success) throw new Error(res.error);
    
    toast.success("Signature added successfully!");
    signModalReq.value = null;
    await loadRequests();

    const updatedRequest = await supabaseService.getMultisigRequestById(requestId, getCurrentEnv());
    if (updatedRequest && (updatedRequest.signatures?.length || 0) >= updatedRequest.signers_required) {
      await handleBroadcast(updatedRequest);
    }
  } catch (e) {
    throw new Error("Failed to submit signature: " + e.message);
  }
}

async function submitExternalWitness() {
  if (!signModalReq.value) return;
  isSubmittingExternalWitness.value = true;
  try {
    const requestId = signModalReq.value.id;
    const payload = buildExternalWitnessPayload({
      signerAddress: externalSignerAddress.value,
      signerPublicKey: externalSignerPublicKey.value,
      invocationScript: externalInvocationScript.value,
      verificationScript: externalVerificationScript.value,
      eligibleSigners: signModalReq.value?.eligible_signers || [],
    });

    const res = await supabaseService.addMultisigSignature(
      requestId,
      payload.signerAddress,
      payload.signature,
      {
        publicKey: payload.publicKey,
        witness: payload.witness,
        invocationScript: payload.invocationScript,
        verificationScript: payload.verificationScript,
      }
    );
    if (!res.success) throw new Error(res.error);

    toast.success("External witness added successfully!");
    signModalReq.value = null;
    await loadRequests();

    const updatedRequest = await supabaseService.getMultisigRequestById(requestId, getCurrentEnv());
    if (updatedRequest && (updatedRequest.signatures?.length || 0) >= updatedRequest.signers_required) {
      await handleBroadcast(updatedRequest);
    }
  } catch (e) {
    console.error(e);
    toast.error("Failed to submit witness: " + e.message);
  } finally {
    isSubmittingExternalWitness.value = false;
  }
}

async function handleBroadcast(req) {
  if (!req.params?.unsigned_tx || !req.signatures || req.signatures.length < req.signers_required) {
    toast.error("Not enough signatures or missing tx data.");
    return;
  }
  
  try {
    toast.info("Assembling multisig transaction...");
    const t = neonJs.tx.Transaction.deserialize(req.params.unsigned_tx);
    
    // Sort signatures based on the order of public keys in the committee
    const committee = req.params?.committee_pubkeys || req.params?.committee || []; // Array of pubkeys
    const sortedSignatures = [];
    
    for (const pubkey of committee) {
      const addr = new neonJs.wallet.Account(pubkey).address;
      const sigObj = req.signatures.find(s => s.signer_address === addr);
      if (sigObj) {
        sortedSignatures.push(sigObj.signature);
      }
      if (sortedSignatures.length >= req.signers_required) break; // We only need M sigs
    }
    
    if (sortedSignatures.length < req.signers_required) {
      throw new Error("Failed to match enough signatures to valid committee members.");
    }
    
    // Construct the MultiSig Invocation script
    const builder = new neonJs.sc.ScriptBuilder();
    for (const sig of sortedSignatures) {
      builder.emitPush(neonJs.u.HexString.fromHex(sig));
    }
    
    const invocationScript = builder.build();
    
    // The verification script is the multisig script
    const verificationScript = neonJs.wallet.Account.createMultiSig(req.signers_required, committee).contract.script;
    
    t.witnesses = [new neonJs.tx.Witness({ invocationScript, verificationScript })];
    
    const signedTxHex = t.serialize(true);
    
    toast.info("Broadcasting to network...");
    const rpcClient = new neonJs.rpc.RPCClient(getRpcClientUrl());
    const txid = await rpcClient.sendRawTransaction(signedTxHex);
    
    toast.success("Transaction broadcasted! TXID: " + txid);
    await supabaseService.updateMultisigRequestStatus(req.id, "EXECUTED", {
      tx_hash: txid,
      executed_at: new Date().toISOString(),
      params: {
        ...req.params,
        broadcast_witness: {
          invocationScript,
          verificationScript,
        },
      },
    });
    await loadRequests();
    
  } catch (e) {
    console.error(e);
    toast.error("Failed to broadcast: " + e.message);
  }
}

async function handleNetworkChange() {
  await Promise.all([loadCommittee(), loadValidatorMetadata(), loadRequests()]);
}

onMounted(async () => {
  try {
    neonJs = window.Neon || await import('@cityofzion/neon-js');
    await Promise.all([loadCommittee(), loadValidatorMetadata(), loadRequests()]);
      } catch (e) {
    if (import.meta.env.DEV) console.error("Initialization error", e);
  } finally {
    loading.value = false;
  }
});

useNetworkChange(handleNetworkChange);
</script>
