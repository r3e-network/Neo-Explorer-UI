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

      <div v-if="!loading && (committeeError || requestsError || validatorError)" class="mb-6 space-y-3">
        <div v-if="committeeError" class="etherscan-card overflow-hidden">
          <ErrorState :title="$t('errorTitles.failedToLoadCommittee')" :message="committeeError" @retry="loadCommittee()" />
        </div>
        <div v-if="requestsError" class="etherscan-card overflow-hidden">
          <ErrorState :title="$t('errorTitles.failedToLoadProposals')" :message="requestsError" @retry="loadRequests()" />
        </div>
        <div v-if="validatorError" class="etherscan-card overflow-hidden">
          <ErrorState
            :title="$t('errorTitles.failedToLoadValidatorMetadata')"
            :message="validatorError"
            :show-retry="false"
          />
        </div>
      </div>

      <GovernanceProposalList
        :requests="requests"
        :loading="requestsLoading"
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
import ErrorState from "@/components/common/ErrorState.vue";
import GovernanceHeaderCard from "@/views/Tools/components/GovernanceHeaderCard.vue";
import GovernanceProposalList from "@/views/Tools/components/GovernanceProposalList.vue";
import GovernanceDetailsModal from "@/views/Tools/components/GovernanceDetailsModal.vue";
import GovernanceCreateModal from "@/views/Tools/components/GovernanceCreateModal.vue";
import GovernanceAddWitnessModal from "@/views/Tools/components/GovernanceAddWitnessModal.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount } from "@/utils/wallet";
import { getRpcClientUrl, getCurrentEnv, resolveNetworkName } from "@/utils/env";
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
import { GOVERNANCE_INVOCATION_TARGETS as NATIVE_CONTRACTS } from "@/constants/governance";
import { useToast } from "vue-toastification";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const toast = useToast();
const loading = ref(true);
const requestsLoading = ref(true);
const requests = ref([]);
const showCreateModal = ref(false);
const forkProposalDraft = ref(null);
const committeeError = ref(null);
const requestsError = ref(null);
const validatorError = ref(null);

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
const activeNetworkLabel = computed(() => (toNetworkMode(getCurrentEnv()) === "testnet" ? t("common.netLabelTestnet") : t("common.netLabelMainnet")));
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
  if (pendingRequestCount.value === 0) return t("tools.governance.queueHeadlineNone");
  if (pendingRequestCount.value === 1) return t("tools.governance.queueHeadlineOne");
  return t("tools.governance.queueHeadlineMany", { count: pendingRequestCount.value });
});

const isCouncilNode = computed(() => {
  if (!connectedAccount.value || !committeeMultiSig.value || !neonJs) return false;
  try {
    return committeePubkeys.value.some((pk) => new neonJs.wallet.Account(pk).address === connectedAccount.value);
  } catch (e) {
    return false;
  }
});

async function loadCommittee() {
  if (!neonJs) return;
  committeeError.value = null;
  try {
    const rpcClient = new neonJs.rpc.RPCClient(getRpcClientUrl());
    const committee = await rpcClient.getCommittee();
    committeePubkeys.value = Array.isArray(committee) ? committee : [];
    committeeSize.value = committeePubkeys.value.length;
    threshold.value = Math.floor(committeeSize.value / 2) + 1;
    committeeMultiSig.value = neonJs.wallet.Account.createMultiSig(threshold.value, committeePubkeys.value);
  } catch (e) {
    if (import.meta.env.DEV) console.error("Failed to load committee:", e);
    committeeError.value = "Failed to load committee data. Please try again.";
  }
}

async function loadRequests() {
  requestsLoading.value = true;
  requestsError.value = null;
  try {
    const data = await supabaseService.getMultisigRequests();
    const activeNetwork = getCurrentEnv();
    requests.value = Array.isArray(data)
      ? data.filter(
          (request) => isGovernanceRequest(request, NATIVE_CONTRACTS) && matchesRequestNetwork(request, activeNetwork),
        )
      : [];
  } catch (e) {
    if (import.meta.env.DEV) console.error("Error loading requests", e);
    requestsError.value = "Failed to load governance proposals. Please try again.";
  } finally {
    requestsLoading.value = false;
  }
}

async function loadValidatorMetadata() {
  validatorError.value = null;
  try {
    validatorMetadata.value = await supabaseService.getValidatorMetadata(resolveNetworkName());
  } catch (e) {
    if (import.meta.env.DEV) console.error("Failed to load validator metadata:", e);
    validatorError.value = "Failed to load validator metadata. Council member names may not be shown.";
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
    toast.error(t("tools.governance.toasts.offchainReviewPacket"));
    return;
  }

  if (!req.params?.unsigned_tx || !req.signatures || req.signatures.length < getRequestRequiredCount(req)) {
    toast.error(t("tools.governance.toasts.notEnoughSignatures"));
    return;
  }

  try {
    if (!neonJs) {
      toast.error(t("tools.governance.toasts.walletLibraryNotLoaded"));
      return;
    }
    toast.info(t("tools.governance.toasts.assemblingMultisig"));
    const tx = neonJs.tx.Transaction.deserialize(req.params.unsigned_tx);

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
      throw new Error(t("tools.governance.errors.notEnoughCommitteeSignatures"));
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

    tx.witnesses = [new neonJs.tx.Witness({ invocationScript, verificationScript })];

    const signedTxHex = tx.serialize(true);

    toast.info(t("tools.governance.toasts.broadcastingNetwork"));
    const rpcClient = new neonJs.rpc.RPCClient(getRpcClientUrl());
    const txid = await rpcClient.sendRawTransaction(signedTxHex);

    toast.success(t("tools.governance.toasts.broadcastSuccess", { txid }));
    await supabaseService.updateMultisigRequestStatus(req.id, "EXECUTED", {
      signer_address: connectedAccount.value,
      tx_hash: txid,
      executed_at: new Date().toISOString(),
      network: getCurrentEnv(),
      metadata: {
        ...(req.metadata || {}),
        broadcast_witness: {
          invocationScript,
          verificationScript,
        },
      },
    });
    await loadRequests();
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
    toast.error(t("tools.governance.toasts.broadcastFailed", { reason: e.message }));
  }
}

async function handleNetworkChange() {
  await Promise.allSettled([loadCommittee(), loadValidatorMetadata(), loadRequests()]);
}

onMounted(async () => {
  try {
    neonJs = await (await import("@/utils/neonLoader.js")).loadNeonJs();
    await Promise.allSettled([loadCommittee(), loadValidatorMetadata(), loadRequests()]);
  } catch (e) {
    if (import.meta.env.DEV) console.error("Initialization error", e);
  } finally {
    loading.value = false;
  }
});

useNetworkChange(handleNetworkChange);
</script>
