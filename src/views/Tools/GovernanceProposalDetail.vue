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
        <GovernanceDetailHero
          :proposal="proposal"
          :status-classes="statusClasses"
          :signed-count="signedCount"
          :required-count="requiredCount"
          :remaining-votes="remainingVotes"
          :threshold-met="thresholdMet"
          :progress-width="progressWidth"
          :progress-headline="progressHeadline"
          :progress-description="progressDescription"
          :lifecycle-steps="lifecycleSteps"
          :proposal-method-summary="proposalMethodSummary"
          :proposal-target-summary="proposalTargetSummary"
          :proposal-subtitle="proposalSubtitle"
          :active-network-mode="activeNetworkMode"
        />

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
          <div class="space-y-6">
            <GovernanceDetailPayload
              :proposal="proposal"
              :proposal-method-summary="proposalMethodSummary"
              :proposal-target-summary="proposalTargetSummary"
              :proposal-invocations="proposalInvocations"
              :signature-witness-rows="signatureWitnessRows"
              :connected-account="connectedAccount"
            />
          </div>

          <div class="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <GovernanceDetailCouncilPanel
              :signer-rows="signerRows"
              :signed-count="signedCount"
              :required-count="requiredCount"
              :connected-account="connectedAccount"
            />

            <GovernanceDetailActionCenter
              :proposal="proposal"
              :signed-count="signedCount"
              :required-count="requiredCount"
              :threshold-met="thresholdMet"
              :has-signed="hasSigned"
              :can-current-signer-vote="canCurrentSignerVote"
              :action-title="actionTitle"
              :action-description="actionDescription"
              :action-tone-class="actionToneClass"
              @open-sign-modal="openSignModal"
              @broadcast="handleBroadcast(proposal)"
            />
          </div>
        </div>
      </div>

      <GovernanceSignModal
        v-if="showSignModal"
        :request="proposal"
        test-id-prefix="governance-detail-sign-modal"
        @close="closeSignModal"
        @signed="handleSigned"
      />
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import GovernanceDetailHero from "./components/GovernanceDetailHero.vue";
import GovernanceDetailPayload from "./components/GovernanceDetailPayload.vue";
import GovernanceDetailCouncilPanel from "./components/GovernanceDetailCouncilPanel.vue";
import GovernanceDetailActionCenter from "./components/GovernanceDetailActionCenter.vue";
import GovernanceSignModal from "./components/GovernanceSignModal.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount } from "@/utils/wallet";
import { getCurrentEnv, getRpcClientUrl } from "@/utils/env";
import { toNetworkMode } from "@/utils/rpcEndpoints";
import { buildCouncilIdentityMap, resolveCouncilIdentity } from "@/utils/councilIdentity";
import { getDefaultCandidateLogoUrl, resolveCandidateLogoUrl } from "@/utils/logoOptimization";
import { hexToBase64 } from "@/utils/neoHelpers";
import { buildSignatureInvocationScriptBase64 } from "@/utils/multisigWitness";

const route = useRoute();
const toast = useToast();

const proposal = ref(null);
const committeePubkeys = ref([]);
const validatorMetadata = ref([]);
const showSignModal = ref(false);
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
    proposal.value?.signatures?.some((signature) => signature.signer_address === connectedAccount.value),
  ),
);
const canCurrentSignerVote = computed(() =>
  Boolean(
    connectedAccount.value &&
    proposal.value?.status !== "EXECUTED" &&
    Array.isArray(proposal.value?.eligible_signers) &&
    proposal.value.eligible_signers.includes(connectedAccount.value),
  ),
);
const progressWidth = computed(
  () => `${Math.min(100, requiredCount.value ? (signedCount.value / requiredCount.value) * 100 : 0)}%`,
);
const INVOCATION_TARGETS = {
  PolicyContract: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
  RoleManagement: "49cf4e5378ffcd4dec034fd98a174c5491e395e2",
  OracleContract: "fe924b7cfe89ddd271abaf7210a80a7e11178758",
  NEO: "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
};
const proposalInvocations = computed(() => {
  const invocations = Array.isArray(proposal.value?.params?.invocations) ? proposal.value.params.invocations : [];

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
    proposalInvocations.value[0]?.targetHash || String(proposal.value?.target_contract || "").trim() || "Unavailable"
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
    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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
    stateClass:
      "border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/10 dark:text-amber-200",
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
      logoSources: buildCouncilLogoSources(address, resolved.logo),
      signed: signed.has(address),
      councilIndex: index + 1,
    };
  });
});

const signatureWitnessRows = computed(() => {
  const eligible = Array.isArray(proposal.value?.eligible_signers) ? proposal.value.eligible_signers : [];

  return (proposal.value?.signatures || []).map((signature, index) => {
    const resolved = resolveCouncilIdentity(signature.signer_address, councilIdentityMap.value);

    // Find the true council index based on the original eligible signers array to keep naming consistent
    const eligibleIndex = eligible.findIndex((addr) => addr === signature.signer_address);
    const displayIndex = eligibleIndex >= 0 ? eligibleIndex + 1 : index + 1;

    return {
      signerAddress: signature.signer_address,
      name: resolved.name === signature.signer_address ? `Council Node ${displayIndex}` : resolved.name,
      logo: resolveCouncilLogo(signature.signer_address, resolved.logo),
      logoSources: buildCouncilLogoSources(signature.signer_address, resolved.logo),
      signature: signature.signature,
      invocationScriptBase64: signature.invocation_script
        ? hexToBase64(signature.invocation_script.replace(/^0x/i, ""))
        : buildSignatureInvocationScriptBase64(signature.signature),
      witnessJson: signature.witness ? JSON.stringify(signature.witness, null, 2) : "",
      councilIndex: displayIndex,
    };
  });
});

function findCommitteePubkeyForAddress(address) {
  const target = String(address || "").trim();
  if (!target || !neonJs) return "";

  const sourcePubkeys = [
    ...(Array.isArray(proposal.value?.params?.committee_pubkeys) ? proposal.value.params.committee_pubkeys : []),
    ...(Array.isArray(proposal.value?.params?.committee) ? proposal.value.params.committee : []),
    ...(Array.isArray(committeePubkeys.value) ? committeePubkeys.value : []),
  ];

  for (const pubkey of [...new Set(sourcePubkeys.filter(Boolean))]) {
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
  return buildCouncilLogoSources(address, explicitLogo)[0] || NEO_LOGO_FALLBACK;
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

  candidates.push(NEO_LOGO_FALLBACK);
  return [...new Set(candidates.filter(Boolean))];
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
}

function closeSignModal() {
  showSignModal.value = false;
}

async function maybeBroadcastIfReady() {
  await loadProposal();
  if (proposal.value && thresholdMet.value && proposal.value.status !== "EXECUTED") {
    await handleBroadcast(proposal.value);
  }
}

async function handleSigned() {
  await maybeBroadcastIfReady();
}

async function handleBroadcast(currentProposal) {
  if (!currentProposal?.params?.unsigned_tx || !thresholdMet.value) return;
  try {
    const tx = neonJs.tx.Transaction.deserialize(currentProposal.params.unsigned_tx);
    const committeePubkeyList =
      currentProposal.params?.committee_pubkeys || currentProposal.params?.committee || committeePubkeys.value || [];

    const orderedSignatures = [];
    for (const pubkey of committeePubkeyList) {
      const signerAddress = new neonJs.wallet.Account(pubkey).address;
      const signatureRow = currentProposal.signatures?.find((signature) => signature.signer_address === signerAddress);
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
      committeePubkeyList,
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
    neonJs = window.Neon || (await import("@r3e/neo-js-sdk"));
    await Promise.all([loadCommittee(), loadValidatorMetadata(), loadProposal()]);
  } finally {
    loading.value = false;
  }
});
</script>
