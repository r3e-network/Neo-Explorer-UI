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
        <div class="etherscan-card p-6">
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
          <div class="etherscan-card p-6">
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
            <div class="etherscan-card p-6">
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

            <div class="etherscan-card p-6">
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

      <div v-if="showSignModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
        <div class="w-full max-w-lg rounded-2xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950">
          <div class="px-6 py-4 border-b border-line-soft flex items-center justify-between">
            <h2 class="text-lg font-bold text-high">Vote / Sign Proposal</h2>
            <button @click="closeSignModal" class="text-low hover:text-high">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div class="p-6 space-y-4">
            <div class="rounded-xl border border-line-soft bg-surface-muted p-3 font-mono text-[11px] break-all text-low max-h-40 overflow-y-auto">
              {{ proposal?.params?.unsigned_tx }}
            </div>
            <ScriptViewer
              v-if="decodedUnsignedScript"
              :script="decodedUnsignedScript"
              label="Decoded Contract Script"
            />
            <button
              @click="autoSignTx"
              :disabled="isSigning"
              class="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {{ isSigning ? "Waiting for wallet..." : "Sign with connected wallet" }}
            </button>
            <div class="relative py-2">
              <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-line-soft"></div></div>
              <div class="relative flex justify-center"><span class="px-2 bg-white dark:bg-slate-950 text-xs text-mid">OR</span></div>
            </div>
            <div>
              <label class="block text-sm font-medium text-high mb-1">Manual signature</label>
              <input
                v-model="manualSignature"
                type="text"
                class="form-input w-full font-mono text-xs"
                placeholder="Paste 64-byte signature hex here..."
              />
            </div>
            <button
              @click="submitManualSignature"
              :disabled="manualSignature.trim().length < 128"
              class="w-full rounded-lg border border-line-soft bg-surface-muted px-4 py-2 text-sm font-semibold text-high hover:bg-line-soft transition-colors disabled:opacity-50"
            >
              Submit manual signature
            </button>
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
    signed: signed.has(address),
    };
  });
});

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
