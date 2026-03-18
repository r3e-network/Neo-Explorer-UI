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
        <div class="etherscan-card p-6 md:p-8">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <span
                  class="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-semibold"
                  :class="statusClasses"
                >
                  {{ proposal.status || "PENDING" }}
                </span>
                <span class="text-xs font-mono text-low">Proposal #{{ proposal.id }}</span>
              </div>
              <h1 class="page-title mb-2">{{ proposal.description || "Council Proposal" }}</h1>
              <p class="page-subtitle">
                {{ proposal.method }} on
                <span class="font-mono text-low">{{ proposal.target_contract }}</span>
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3 lg:min-w-[260px]">
              <div class="rounded-xl border border-line-soft bg-surface-muted p-4">
                <div class="text-[10px] uppercase tracking-wide font-semibold text-low">Votes</div>
                <div class="mt-1 text-2xl font-black text-primary-600">{{ signedCount }} / {{ requiredCount }}</div>
              </div>
              <div class="rounded-xl border border-line-soft bg-surface-muted p-4">
                <div class="text-[10px] uppercase tracking-wide font-semibold text-low">Threshold</div>
                <div class="mt-1 text-2xl font-black text-high">{{ requiredCount }}</div>
              </div>
            </div>
          </div>

          <div class="mt-4 grid gap-3 text-sm text-mid md:grid-cols-3">
            <div class="rounded-xl border border-line-soft p-3">
              <div class="text-[10px] uppercase tracking-wide font-semibold text-low mb-1">Created</div>
              <div>{{ formatDate(proposal.created_at) }}</div>
            </div>
            <div class="rounded-xl border border-line-soft p-3">
              <div class="text-[10px] uppercase tracking-wide font-semibold text-low mb-1">Network</div>
              <div>{{ proposal.network || activeNetworkMode }}</div>
            </div>
            <div class="rounded-xl border border-line-soft p-3">
              <div class="text-[10px] uppercase tracking-wide font-semibold text-low mb-1">Tx Hash</div>
              <div class="font-mono break-all">{{ proposal.tx_hash || proposal.params?.hash || "Pending" }}</div>
            </div>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div class="etherscan-card p-6 md:p-8">
            <h2 class="text-lg font-bold text-high mb-4">Proposal Detail</h2>

            <div class="space-y-4">
              <div>
                <div class="text-[10px] uppercase tracking-wide font-semibold text-low mb-1">Method</div>
                <div class="text-high font-semibold">{{ proposal.method }}</div>
              </div>

              <div>
                <div class="text-[10px] uppercase tracking-wide font-semibold text-low mb-1">Target Contract</div>
                <div class="font-mono text-sm break-all text-mid">{{ proposal.target_contract }}</div>
              </div>

              <div>
                <div class="text-[10px] uppercase tracking-wide font-semibold text-low mb-1">Unsigned Transaction</div>
                <div class="rounded-xl border border-line-soft bg-surface-muted p-3 font-mono text-[11px] break-all text-low max-h-40 overflow-y-auto">
                  {{ proposal.params?.unsigned_tx || "Unavailable" }}
                </div>
              </div>

              <div>
                <div class="text-[10px] uppercase tracking-wide font-semibold text-low mb-2">Collected Witnesses</div>
                <div v-if="signatureWitnessRows.length" class="space-y-3">
                  <div
                    v-for="row in signatureWitnessRows"
                    :key="row.signerAddress"
                    class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex min-w-0 items-center gap-3">
                        <img
                          v-if="row.logo"
                          :src="row.logo"
                          alt=""
                          class="h-10 w-10 rounded-full object-cover ring-1 ring-line-soft bg-white shrink-0"
                          @error="$event.target.src = '/img/brand/neo.png'"
                        />
                        <div class="min-w-0">
                          <div class="font-semibold text-high truncate">{{ row.name }}</div>
                          <div class="text-[11px] font-mono text-low break-all">{{ row.signerAddress }}</div>
                        </div>
                      </div>
                      <span class="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Witness Ready
                      </span>
                    </div>
                    <div class="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <div class="text-[10px] uppercase tracking-wide font-semibold text-low mb-1">Invocation Signature</div>
                        <div class="rounded-xl border border-line-soft bg-surface p-3 font-mono text-[11px] break-all text-low">
                          {{ row.signature }}
                        </div>
                      </div>
                      <div v-if="row.witnessJson">
                        <div class="text-[10px] uppercase tracking-wide font-semibold text-low mb-1">Witness Metadata</div>
                        <div class="rounded-xl border border-line-soft bg-surface p-3 font-mono text-[11px] break-all text-low">
                          {{ row.witnessJson }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="rounded-xl border border-dashed border-line-soft bg-surface-muted/40 p-4 text-sm text-mid">
                  No collected witnesses yet.
                </div>
              </div>

              <div v-if="proposal.params?.broadcast_witness" class="space-y-3">
                <div class="text-[10px] uppercase tracking-wide font-semibold text-low">Broadcast Witness</div>
                <div class="grid gap-3 md:grid-cols-2">
                  <div>
                    <div class="text-[10px] uppercase tracking-wide font-semibold text-low mb-1">Invocation Script</div>
                    <div class="rounded-xl border border-line-soft bg-surface-muted p-3 font-mono text-[11px] break-all text-low max-h-40 overflow-y-auto">
                      {{ proposal.params.broadcast_witness.invocationScript || "Unavailable" }}
                    </div>
                  </div>
                  <div>
                    <div class="text-[10px] uppercase tracking-wide font-semibold text-low mb-1">Verification Script</div>
                    <div class="rounded-xl border border-line-soft bg-surface-muted p-3 font-mono text-[11px] break-all text-low max-h-40 overflow-y-auto">
                      {{ proposal.params.broadcast_witness.verificationScript || "Unavailable" }}
                    </div>
                  </div>
                </div>
              </div>

              <ScriptViewer
                v-if="decodedUnsignedScript"
                :script="decodedUnsignedScript"
                label="Decoded Contract Script"
              />

              <div>
                <div class="text-[10px] uppercase tracking-wide font-semibold text-low mb-1">Vote Status</div>
                <div class="text-sm text-mid">
                  {{ signedCount }} of {{ requiredCount }} council votes collected.
                  <span v-if="hasSigned" class="font-semibold text-emerald-600">You already voted.</span>
                </div>
                <div class="mt-2 h-2 rounded-full bg-line-soft overflow-hidden">
                  <div
                    class="h-2 rounded-full transition-all duration-300"
                    :class="thresholdMet ? 'bg-emerald-500' : 'bg-primary-500'"
                    :style="{ width: progressWidth }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div class="etherscan-card p-6 md:p-8">
              <h2 class="text-lg font-bold text-high mb-4">Council Vote Status</h2>
              <div class="space-y-2">
                <div
                  v-for="signer in signerRows"
                  :key="signer.address"
                  class="flex items-center justify-between rounded-lg border border-line-soft px-3 py-2 text-sm"
                >
                  <div class="flex items-center gap-3 min-w-0" :title="signer.address">
                    <img
                      v-if="signer.logo"
                      :src="signer.logo"
                      alt=""
                      class="h-8 w-8 rounded-full object-cover ring-1 ring-line-soft bg-white shrink-0"
                      @error="$event.target.src = '/img/brand/neo.png'"
                    />
                    <div class="min-w-0">
                      <div class="font-semibold text-high truncate">{{ signer.name }}</div>
                    </div>
                  </div>
                  <div
                    class="text-xs font-semibold"
                    :class="signer.signed ? 'text-emerald-600' : 'text-mid'"
                  >
                    {{ signer.signed ? "Voted" : "Pending" }}
                  </div>
                </div>
              </div>
            </div>

            <div class="etherscan-card p-6 md:p-8">
              <h2 class="text-lg font-bold text-high mb-4">Action</h2>

              <div v-if="proposal.status === 'EXECUTED'" class="text-sm text-emerald-600 font-semibold">
                Executed on-chain.
              </div>
              <div v-else-if="hasSigned" class="text-sm text-emerald-600 font-semibold">
                You already voted.
              </div>
              <div v-else-if="!canCurrentSignerVote" class="text-sm text-mid">
                Only eligible council nodes can vote on this proposal.
              </div>
              <div v-else class="space-y-3">
                <button
                  @click="openSignModal"
                  class="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
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
                class="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
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

const activeNetworkMode = computed(() => toNetworkMode(getCurrentEnv()) || "mainnet");
const signedCount = computed(() => proposal.value?.signatures?.length || 0);
const requiredCount = computed(() => Number(proposal.value?.signers_required || 0));
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

  return "";
}

function formatDate(value) {
  if (!value) return "Unknown";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Unknown";
  }
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
