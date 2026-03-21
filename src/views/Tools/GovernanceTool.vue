<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <GovernanceHeaderCard
        :committee-multi-sig="committeeMultiSig"
        :threshold="threshold"
        :committee-size="committeeSize"
        :active-network-label="activeNetworkLabel"
        :pending-request-count="pendingRequestCount"
        :collected-signature-count="collectedSignatureCount"
        :ready-to-broadcast-count="readyToBroadcastCount"
        :request-queue-headline="requestQueueHeadline"
        :connected-account="connectedAccount"
        :can-create-proposal="canCreateProposal"
        :is-governance-lab-mode-available="isGovernanceLabModeAvailable"
        @create-proposal="showCreateModal = true"
      />

      <GovernanceProposalList
        :requests="requests"
        :loading="loading"
        :connected-account="connectedAccount"
        :threshold="threshold"
        :council-identity-map="councilIdentityMap"
        :can-create-proposal="canCreateProposal"
        :is-council-node="isCouncilNode"
        :committee-pubkeys="committeePubkeys"
        @sign="openSignModal"
        @add-witness="openSignModal"
        @view-details="viewDetails"
        @broadcast="handleBroadcast"
        @create-proposal="showCreateModal = true"
      />

      <!-- Sign Modal -->
      <div
        v-if="signModalReq"
        data-testid="governance-sign-modal-overlay"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
        @click.self="signModalReq = null"
      >
        <div
          data-testid="governance-sign-modal-panel"
          class="w-full max-w-lg rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[90vh]"
        >
          <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  ></path>
                </svg>
              </div>
              <h2 class="text-xl font-bold text-high tracking-tight">Sign Proposal</h2>
            </div>
            <button
              @click="signModalReq = null"
              aria-label="Close"
              class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div data-testid="governance-sign-modal-body" class="p-6 space-y-6 overflow-y-auto custom-scrollbar min-h-0">
            <UnsignedTransactionViewer
              v-if="signModalReq.params?.unsigned_tx"
              :transaction-hex="signModalReq.params.unsigned_tx"
              label="Unsigned Transaction Packet"
              description="Review the complete unsigned governance transaction before signing or importing a witness."
            />

            <div class="space-y-3">
              <label class="block text-sm font-bold text-high">Option 1: Wallet Signature</label>
              <button
                @click="autoSignTx"
                :disabled="isSigning"
                class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md"
              >
                <svg v-if="isSigning" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  ></path>
                </svg>
                {{ isSigning ? "Awaiting Wallet..." : "Sign with Connected Wallet" }}
              </button>
              <p class="text-[11px] text-mid text-center">Requires a wallet capable of signing raw bytes.</p>
            </div>

            <div class="relative py-2">
              <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-line-soft"></div></div>
              <div class="relative flex justify-center">
                <span
                  class="px-3 bg-white dark:bg-slate-950 text-xs font-bold text-low tracking-widest uppercase rounded-full"
                  >OR</span
                >
              </div>
            </div>

            <div class="space-y-3">
              <label class="block text-sm font-bold text-high">Option 2: Manual Entry</label>
              <input
                v-model="manualSignature"
                type="text"
                class="form-input w-full font-mono text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
                placeholder="Paste 64-byte signature hex here..."
              />
              <button
                @click="submitManualSignature"
                :disabled="!manualSignature || manualSignature.length < 128"
                class="w-full px-4 py-3 bg-surface-muted text-high border border-line-soft rounded-xl font-bold hover:bg-surface transition-all active:scale-95 hover:border-line disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Manual Signature
              </button>
            </div>

            <div class="relative py-2">
              <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-line-soft"></div></div>
              <div class="relative flex justify-center">
                <span
                  class="px-3 bg-white dark:bg-slate-950 text-xs font-bold text-low tracking-widest uppercase rounded-full"
                  >OR</span
                >
              </div>
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
              <p class="text-[11px] text-mid text-center">
                Use this when a council member signed elsewhere and sent you the witness script directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Modal -->
      <GovernanceCreateModal
        :is-open="showCreateModal"
        :is-governance-lab-mode-available="isGovernanceLabModeAvailable"
        :connected-account="connectedAccount"
        :committee-pubkeys="committeePubkeys"
        :threshold="threshold"
        :committee-multi-sig="committeeMultiSig"
        :is-council-node="isCouncilNode"
        @close="showCreateModal = false"
        @created="loadRequests()"
      />

      <!-- Details Modal -->
      <GovernanceDetailsModal :request="detailsModalReq" @close="detailsModalReq = null" />
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import GovernanceHeaderCard from "@/views/Tools/components/GovernanceHeaderCard.vue";
import GovernanceProposalList from "@/views/Tools/components/GovernanceProposalList.vue";
import GovernanceDetailsModal from "@/views/Tools/components/GovernanceDetailsModal.vue";
import GovernanceCreateModal from "@/views/Tools/components/GovernanceCreateModal.vue";
import UnsignedTransactionViewer from "@/components/trace/UnsignedTransactionViewer.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount } from "@/utils/wallet";
import { walletService } from "@/services/walletService";
import { getRpcClientUrl, getCurrentEnv } from "@/utils/env";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { toNetworkMode } from "@/utils/rpcEndpoints";
import { isGovernanceRequest, matchesRequestNetwork } from "@/utils/governanceRequests";
import { buildCouncilIdentityMap } from "@/utils/councilIdentity";
import { buildExternalWitnessPayload } from "@/utils/multisigWitness";
import { useToast } from "vue-toastification";

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
const isGovernanceLabModeAvailable = computed(() => toNetworkMode(getCurrentEnv()) === "testnet");
const canCreateProposal = computed(
  () => Boolean(connectedAccount.value) && (isCouncilNode.value || isGovernanceLabModeAvailable.value),
);
const activeNetworkLabel = computed(() => (toNetworkMode(getCurrentEnv()) === "testnet" ? "Testnet" : "Mainnet"));
const pendingRequestCount = computed(() => requests.value.filter((request) => request.status === "PENDING").length);
const readyToBroadcastCount = computed(
  () =>
    requests.value.filter(
      (request) =>
        request.status === "PENDING" && getRequestSignatureCount(request) >= Number(request.signers_required || 0),
    ).length,
);
const collectedSignatureCount = computed(() =>
  requests.value.reduce((sum, request) => sum + getRequestSignatureCount(request), 0),
);
const requestQueueHeadline = computed(() => {
  if (pendingRequestCount.value === 0) return "No active proposals under review";
  if (pendingRequestCount.value === 1) return "1 active proposal under review";
  return `${pendingRequestCount.value} active proposals under review`;
});

const isCouncilNode = computed(() => {
  if (!connectedAccount.value || !committeeMultiSig.value || !neonJs) return false;
  try {
    return committeePubkeys.value.some((pk) => new neonJs.wallet.Account(pk).address === connectedAccount.value);
  } catch (e) {
    return false;
  }
});

const NATIVE_CONTRACTS = {
  PolicyContract: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
  RoleManagement: "49cf4e5378ffcd4dec034fd98a174c5491e395e2",
  OracleContract: "fe924b7cfe89ddd271abaf7210a80a7e11178758",
  NEO: "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
};

async function loadCommittee() {
  if (!neonJs) return;
  try {
    const rpcClient = new neonJs.rpc.RPCClient(getRpcClientUrl());
    const committee = await rpcClient.getCommittee();
    const sorted = [...committee].sort((a, b) => a.localeCompare(b));
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
      ? data.filter(
          (request) => isGovernanceRequest(request, NATIVE_CONTRACTS) && matchesRequestNetwork(request, activeNetwork),
        )
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

function getRequestSignatureCount(req) {
  return Array.isArray(req?.signatures) ? req.signatures.length : 0;
}

const signModalReq = ref(null);
const manualSignature = ref("");
const isSigning = ref(false);
const externalSignerAddress = ref("");
const externalSignerPublicKey = ref("");
const externalInvocationScript = ref("");
const externalVerificationScript = ref("");
const isSubmittingExternalWitness = ref(false);
const detailsModalReq = ref(null);

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

    const res = await supabaseService.addMultisigSignature(requestId, payload.signerAddress, payload.signature, {
      publicKey: payload.publicKey,
      witness: payload.witness,
      invocationScript: payload.invocationScript,
      verificationScript: payload.verificationScript,
    });
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

    const res = await supabaseService.addMultisigSignature(requestId, payload.signerAddress, payload.signature, {
      publicKey: payload.publicKey,
      witness: payload.witness,
      invocationScript: payload.invocationScript,
      verificationScript: payload.verificationScript,
    });
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
      const sigObj = req.signatures.find((s) => s.signer_address === addr);
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
    neonJs = window.Neon || (await import("@cityofzion/neon-js"));
    await Promise.all([loadCommittee(), loadValidatorMetadata(), loadRequests()]);
  } catch (e) {
    if (import.meta.env.DEV) console.error("Initialization error", e);
  } finally {
    loading.value = false;
  }
});

useNetworkChange(handleNetworkChange);
</script>
