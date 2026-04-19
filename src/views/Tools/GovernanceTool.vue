<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <GovernanceHeaderCard
        :committee-multi-sig="committeeMultiSig"
        :committee-pubkeys="committeePubkeys"
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
        @create-proposal="openCreateModal"
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
        @sign="openAddWitnessModal"
        @add-witness="openAddWitnessModal"
        @view-details="viewDetails"
        @broadcast="handleBroadcast"
        @create-proposal="openCreateModal"
        @fork-proposal="openForkProposal"
      />

      <!-- Create Modal -->
      <GovernanceCreateModal
        :is-open="showCreateModal"
        :is-governance-lab-mode-available="isGovernanceLabModeAvailable"
        :connected-account="connectedAccount"
        :committee-pubkeys="committeePubkeys"
        :threshold="threshold"
        :committee-multi-sig="committeeMultiSig"
        :is-council-node="isCouncilNode"
        :prefill-proposal="forkProposalDraft"
        @close="closeCreateModal"
        @created="handleCreated"
      />

      <!-- Add Witness Modal -->
      <GovernanceAddWitnessModal :request="addWitnessModalReq" @close="addWitnessModalReq = null" @signed="loadRequests()" />

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
import GovernanceAddWitnessModal from "@/views/Tools/components/GovernanceAddWitnessModal.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount } from "@/utils/wallet";
import { getRpcClientUrl, getCurrentEnv } from "@/utils/env";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { toNetworkMode } from "@/utils/rpcEndpoints";
import {
  getRequiredSignatureCount,
  getStoredSignatureCount,
  isGovernanceRequest,
  isOffchainReviewPacket,
  matchesRequestNetwork,
  resolveCommitteePubkeys,
} from "@/utils/governanceRequests";
import { buildCouncilIdentityMap } from "@/utils/councilIdentity";
import { useToast } from "vue-toastification";

const toast = useToast();
const loading = ref(true);
const requests = ref([]);
const showCreateModal = ref(false);
const forkProposalDraft = ref(null);

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
        request.status === "PENDING" &&
        !isOffchainReviewPacket(request) &&
        getRequestSignatureCount(request) >= getRequestRequiredCount(request),
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
    committeePubkeys.value = Array.isArray(committee) ? committee : [];
    committeeSize.value = committeePubkeys.value.length;
    threshold.value = Math.floor(committeeSize.value / 2) + 1;
    committeeMultiSig.value = neonJs.wallet.Account.createMultiSig(threshold.value, committeePubkeys.value);
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
  return getStoredSignatureCount(req);
}

function getRequestRequiredCount(req) {
  return getRequiredSignatureCount(req);
}

const addWitnessModalReq = ref(null);
const detailsModalReq = ref(null);

function viewDetails(req) {
  detailsModalReq.value = req;
}

function openAddWitnessModal(req) {
  addWitnessModalReq.value = req;
}

function openCreateModal() {
  forkProposalDraft.value = null;
  showCreateModal.value = true;
}

function openForkProposal(req) {
  forkProposalDraft.value = req;
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
  forkProposalDraft.value = null;
}

async function handleCreated() {
  closeCreateModal();
  await loadRequests();
}

async function handleBroadcast(req) {
  if (isOffchainReviewPacket(req)) {
    toast.error("This is an off-chain review packet. Regenerate a fresh on-chain transaction before broadcast.");
    return;
  }

  if (!req.params?.unsigned_tx || !req.signatures || req.signatures.length < getRequestRequiredCount(req)) {
    toast.error("Not enough signatures or missing tx data.");
    return;
  }

  try {
    toast.info("Assembling multisig transaction...");
    const t = neonJs.tx.Transaction.deserialize(req.params.unsigned_tx);

    // Sort signatures based on the order of public keys in the committee
    const committee = resolveCommitteePubkeys(req, committeePubkeys.value);
    const sortedSignatures = [];

    for (const pubkey of committee) {
      const addr = new neonJs.wallet.Account(pubkey).address;
      const sigObj = req.signatures.find((s) => s.signer_address === addr);
      if (sigObj) {
        sortedSignatures.push(sigObj.signature);
      }
      if (sortedSignatures.length >= getRequestRequiredCount(req)) break; // We only need M sigs
    }

    if (sortedSignatures.length < getRequestRequiredCount(req)) {
      throw new Error("Failed to match enough signatures to valid committee members.");
    }

    // Construct the MultiSig Invocation script
    const builder = new neonJs.sc.ScriptBuilder();
    for (const sig of sortedSignatures) {
      builder.emitPush(neonJs.u.HexString.fromHex(sig));
    }

    const invocationScript = builder.build();

    // The verification script is the multisig script
    const verificationScript = neonJs.wallet.Account.createMultiSig(
      getRequestRequiredCount(req),
      committee,
    ).contract.script;

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
    neonJs = await (await import("@/utils/neonLoader.js")).loadNeonJs();
    await Promise.all([loadCommittee(), loadValidatorMetadata(), loadRequests()]);
  } catch (e) {
    if (import.meta.env.DEV) console.error("Initialization error", e);
  } finally {
    loading.value = false;
  }
});

useNetworkChange(handleNetworkChange);
</script>
