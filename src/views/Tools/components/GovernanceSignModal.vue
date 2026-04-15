<template>
  <div
    v-if="request"
    :data-testid="testId('overlay')"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
    @click.self="$emit('close')"
  >
    <div
      :data-testid="testId('panel')"
      class="w-full max-w-2xl rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[90vh]"
    >
      <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-high tracking-tight">{{ $t("tools.governance.signProposalTitle") }}</h2>
        </div>
        <button @click="$emit('close')" aria-label="Close" class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div :data-testid="testId('body')" class="p-6 space-y-6 overflow-y-auto custom-scrollbar min-h-0">

        <!-- ═══ Sign with Wallet ═══ -->
        <div class="space-y-3">
          <label class="block text-sm font-bold text-high">{{ $t("tools.governance.optionWallet") }}</label>
          <button
            @click="autoSignTx"
            :disabled="isSigning || Boolean(walletSignBlockReason)"
            class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md"
          >
            <svg v-if="isSigning" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {{ isSigning ? $t("tools.governance.awaitingWallet") : $t("tools.governance.signWithWallet") }}
          </button>
          <p class="text-[11px] text-center" :class="walletSignBlockReason ? 'text-amber-600 dark:text-amber-400' : 'text-mid'">
            {{ walletSignBlockReason || $t("tools.governance.walletSignNote") }}
          </p>
        </div>

        <div class="relative py-2">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-line-soft"></div></div>
          <div class="relative flex justify-center">
            <span class="px-3 bg-white dark:bg-slate-950 text-xs font-bold text-low tracking-widest uppercase rounded-full">{{ $t("tools.governance.or") }}</span>
          </div>
        </div>

        <!-- ═══ Section 3: Transaction Data + External Witness ═══ -->
        <div class="space-y-4">
          <label class="block text-sm font-bold text-high">{{ $t("tools.governance.optionExternalWitness") }}</label>

          <!-- Unsigned Transaction Viewer -->
          <UnsignedTransactionViewer
            v-if="request.params?.unsigned_tx"
            :transaction-hex="request.params.unsigned_tx"
            label="Unsigned Transaction Packet"
            description="Review the governance transaction. Copy the signing payload below to sign with an external tool."
          />

          <!-- Signing Payload -->
          <div class="rounded-2xl border border-line-soft bg-surface/70 p-4 space-y-3">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="space-y-1">
                <p class="text-sm font-semibold text-high">Signing Payload</p>
                <p class="text-xs text-mid">The exact hex bytes to sign with your private key (SHA-256 + ECDSA).</p>
              </div>
              <button
                :data-testid="testId('prepare-payload')"
                @click="prepareSigningPayload"
                :disabled="!request.params?.unsigned_tx || isPreparingSigningPayload"
                class="shrink-0 px-4 py-2.5 bg-slate-950 text-white rounded-xl font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
              >
                {{ isPreparingSigningPayload ? "Preparing..." : (preparedSigningPayload ? "Refresh Payload" : "Prepare Signing Payload") }}
              </button>
            </div>
            <div v-if="preparedSigningPayload" class="rounded-2xl bg-slate-950 text-slate-100 p-4 space-y-3 dark:bg-slate-900">
              <div class="flex items-center justify-between gap-3">
                <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Payload Hex</p>
                <CopyButton :text="preparedSigningPayload.payload" size="md" />
              </div>
              <code :data-testid="testId('signing-payload')" class="block break-all font-mono text-[11px] leading-5 text-slate-100">{{ preparedSigningPayload.payload }}</code>
              <div class="grid grid-cols-1 gap-2 text-[11px] text-slate-300 sm:grid-cols-2">
                <p>Network magic: {{ preparedSigningPayload.networkMagic }}</p>
                <p>Transaction hash: {{ preparedSigningPayload.transactionHash }}</p>
              </div>
            </div>
          </div>

          <!-- Submit Witness -->
          <div class="space-y-3">
            <p class="text-sm font-semibold text-high">Submit Witness</p>
            <p class="text-xs text-mid">Paste a 64-byte signature from any valid committee member. The system validates the signer is in the committee before accepting.</p>
            <input
              :data-testid="testId('external-address')"
              v-model="externalSignerAddress"
              type="text"
              class="form-input w-full text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
              :placeholder="$t('tools.governance.signerAddressPlaceholder')"
            />
            <input
              :data-testid="testId('external-pubkey')"
              v-model="externalSignerPublicKey"
              type="text"
              class="form-input w-full font-mono text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
              :placeholder="$t('tools.governance.signerPubkeyPlaceholder')"
            />
            <input
              :data-testid="testId('external-signature')"
              v-model="externalSignature"
              type="text"
              class="form-input w-full font-mono text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
              placeholder="Paste raw 64-byte signature hex"
            />

            <input
              :data-testid="testId('external-invocation')"
              v-model="externalInvocationScript"
              type="text"
              class="form-input w-full font-mono text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
              :placeholder="$t('tools.governance.invocationScriptPlaceholder')"
            />

            <!-- Overwrite toggle -->
            <label class="flex items-center gap-2 text-xs text-mid cursor-pointer select-none">
              <input v-model="allowOverwrite" type="checkbox" class="rounded border-line-soft" />
              Allow overwriting existing signature from this signer
            </label>

            <button
              :data-testid="testId('submit-witness')"
              @click="submitExternalWitness"
              :disabled="!externalSignature.trim() || isSubmittingExternalWitness"
              class="w-full px-4 py-3 bg-surface-muted text-high border border-line-soft rounded-xl font-bold hover:bg-surface transition-all active:scale-95 hover:border-line disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmittingExternalWitness ? $t("tools.governance.submittingWitness") : $t("tools.governance.submitExternalWitness") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import UnsignedTransactionViewer from "@/components/trace/UnsignedTransactionViewer.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount } from "@/utils/wallet";
import { walletService } from "@/services/walletService";
import { PROVIDERS } from "@/constants/walletProviders";
import { buildExternalWitnessPayload } from "@/utils/multisigWitness";
import { normalizeHash160 } from "@/utils/walletNormalization";
import { isPublicKeyHex, publicKeyToAddress } from "@/utils/neoHelpers";
import { useToast } from "vue-toastification";

const props = defineProps({
  request: { type: Object, default: null },
  testIdPrefix: { type: String, default: "governance-sign-modal" },
});

const emit = defineEmits(["close", "signed"]);
const toast = useToast();

let neonJs = null;

const manualSignature = ref("");
const isSigning = ref(false);
const externalSignerAddress = ref("");
const externalSignerPublicKey = ref("");
const externalSignature = ref("");
const externalInvocationScript = ref("");
const inlineWif = ref("");
const preparedSigningPayload = ref(null);
const isPreparingSigningPayload = ref(false);
const isSubmittingExternalWitness = ref(false);
const neonReadyTick = ref(0);
const allowOverwrite = ref(false);


const RAW_TRANSACTION_SIGNING_PROVIDERS = new Set([
  PROVIDERS.NEOLINE,
  PROVIDERS.WEB3AUTH,
  PROVIDERS.TESTNET_WIF,
]);

function testId(suffix) {
  return `${props.testIdPrefix}-${suffix}`;
}

watch(
  () => props.request,
  async (newVal) => {
    if (newVal) {
      manualSignature.value = "";
      externalSignerAddress.value = "";
      externalSignerPublicKey.value = "";
      externalSignature.value = "";
      externalInvocationScript.value = "";
      inlineWif.value = "";
      preparedSigningPayload.value = null;
      allowOverwrite.value = false;
      await ensureNeonJs();
      await prefillExternalWitnessSigner();
    }
  },
  { immediate: true },
);

watch(connectedAccount, async () => {
  if (!props.request || externalSignerAddress.value || externalSignerPublicKey.value) return;
  await ensureNeonJs();
  await prefillExternalWitnessSigner();
});

async function ensureNeonJs() {
  if (!neonJs) {
    neonJs = window.Neon || (await import("@cityofzion/neon-js"));
  }
  neonReadyTick.value += 1;
}

function getActiveWalletProvider() {
  return String(walletService.provider || walletService.account?.label || "").trim();
}

function getConnectedWalletAddress() {
  return String(walletService.account?.address || connectedAccount.value || "").trim();
}

async function getConnectedWalletPublicKey() {
  try {
    return String((await walletService.getPublicKey?.()) || "").trim().replace(/^0x/i, "");
  } catch {
    return "";
  }
}

function getUnsignedTransactionSignerAccounts(requestLike) {
  neonReadyTick.value;
  const unsignedTx = String(requestLike?.params?.unsigned_tx || "").trim();
  if (!unsignedTx || typeof neonJs?.tx?.Transaction?.deserialize !== "function") return [];
  try {
    const transaction = neonJs.tx.Transaction.deserialize(unsignedTx);
    const signerList = Array.isArray(transaction?.signers)
      ? transaction.signers
      : Array.isArray(transaction?.data?.signers) ? transaction.data.signers : [];
    return signerList.map((signer) => normalizeHash160(String(signer?.account || "").trim())).filter(Boolean);
  } catch {
    return [];
  }
}

const isNeoLineMultisigSignerMismatch = computed(() => {
  neonReadyTick.value;
  if (getActiveWalletProvider() !== PROVIDERS.NEOLINE) return false;
  const transactionSignerAccounts = getUnsignedTransactionSignerAccounts(props.request);
  const currentSignerHash = normalizeHash160(getConnectedWalletAddress());
  return transactionSignerAccounts.length > 0 && currentSignerHash && !transactionSignerAccounts.includes(currentSignerHash);
});

const walletSignBlockReason = computed(() => {
  neonReadyTick.value;
  if (!props.request) return "";
  const walletAddress = getConnectedWalletAddress();
  const provider = getActiveWalletProvider();

  if (!walletService.isConnected || !walletAddress) {
    return "Connect the council wallet before requesting a governance signature.";
  }
  if (provider && !RAW_TRANSACTION_SIGNING_PROVIDERS.has(provider)) {
    return `${provider} cannot sign governance transaction packets in-browser yet. Submit an external witness instead.`;
  }
  return "";
});

const isNeoLineAssistedFlow = computed(() => getActiveWalletProvider() === PROVIDERS.NEOLINE);

function findRequestSignerPublicKey(requestLike, signerAddress) {
  const target = String(signerAddress || "").trim();
  const pubkeys = requestLike?.params?.committee_pubkeys || requestLike?.params?.committee || [];
  if (!target || !Array.isArray(pubkeys)) return "";
  for (const pubkey of pubkeys) {
    try { if (publicKeyToAddress(pubkey) === target) return pubkey; } catch { /* skip */ }
    try { if (typeof neonJs?.wallet?.Account === "function" && new neonJs.wallet.Account(pubkey).address === target) return pubkey; } catch { /* skip */ }
  }
  return "";
}

async function prefillExternalWitnessSigner() {
  const signerAddress = getConnectedWalletAddress();
  if (!signerAddress) return;
  if (!externalSignerAddress.value) externalSignerAddress.value = signerAddress;
  if (!externalSignerPublicKey.value) {
    const signerPublicKey = findRequestSignerPublicKey(props.request, signerAddress) || (await getConnectedWalletPublicKey());
    if (signerPublicKey) externalSignerPublicKey.value = signerPublicKey;
  }
}

async function prepareSigningPayload() {
  const unsignedTxHex = String(props.request?.params?.unsigned_tx || "").trim();
  if (!unsignedTxHex) return;
  isPreparingSigningPayload.value = true;
  try {
    await prefillExternalWitnessSigner();
    preparedSigningPayload.value = await walletService.getRawTransactionSigningPayload(unsignedTxHex);
  } catch (e) {
    console.error(e);
    toast.error("Failed to prepare signing payload: " + (e?.message || String(e)));
  } finally {
    isPreparingSigningPayload.value = false;
  }
}

async function autoSignTx() {
  if (!props.request) return;
  await ensureNeonJs();

  const blockReason = walletSignBlockReason.value;
  if (blockReason) {
    toast.error(blockReason);
    return;
  }

  isSigning.value = true;
  try {
    const unsignedTxHex = props.request.params.unsigned_tx;
    const signature = await walletService.signRawTransaction(unsignedTxHex);
    await submitSig(signature, "wallet_signature");
  } catch (e) {
    console.error(e);
    toast.error("Signing failed: " + (e?.message || String(e)));
  } finally {
    isSigning.value = false;
  }
}

async function signWithInlineWif() {
  if (!props.request || !inlineWif.value.trim()) return;
  await ensureNeonJs();

  isSigning.value = true;
  try {
    const unsignedTxHex = props.request.params.unsigned_tx;
    if (!unsignedTxHex) throw new Error("Missing unsigned transaction.");

    // Derive account from WIF
    const account = new neonJs.wallet.Account(inlineWif.value.trim());

    // Validate committee membership
    const committeePubkeys = props.request.params?.committee_pubkeys || [];
    if (committeePubkeys.length > 0 && !committeePubkeys.includes(account.publicKey)) {
      throw new Error("This WIF key does not belong to a committee member for this proposal.");
    }

    // Compute signing payload and sign
    const { payload } = await walletService.getRawTransactionSigningPayload(unsignedTxHex);
    const signature = neonJs.wallet.sign(payload, account.WIF);

    // Verify
    const verified = neonJs.wallet.verify(payload, signature, account.publicKey);
    if (!verified) throw new Error("Signature verification failed.");

    // Build witness payload and submit
    const witnessPayload = buildExternalWitnessPayload({
      signerAddress: account.address,
      signerPublicKey: account.publicKey,
      signatureHex: signature,
      eligibleSigners: props.request?.eligible_signers || [],
      source: "inline_wif_signature",
    });

    let res = await supabaseService.addMultisigSignature(props.request.id, witnessPayload.signerAddress, witnessPayload.signature, {
      publicKey: witnessPayload.publicKey,
      witness: witnessPayload.witness,
      invocationScript: witnessPayload.invocationScript,
      verificationScript: witnessPayload.verificationScript,
      overwrite: true,
    });

    if (!res.success) throw new Error(res.error);
    inlineWif.value = "";
    toast.success("Signature added successfully!");
    emit("close");
    emit("signed", { requestId: props.request.id });
  } catch (e) {
    console.error(e);
    toast.error("Signing failed: " + (e?.message || String(e)));
  } finally {
    isSigning.value = false;
  }
}

// ═══ Signature Submission ═══

function assertSignerIdentityMatches({ signerAddress, signerPublicKey }) {
  const normalizedAddress = String(signerAddress || "").trim();
  const normalizedPublicKey = String(signerPublicKey || "").trim().replace(/^0x/i, "");
  if (!normalizedAddress || !normalizedPublicKey || !isPublicKeyHex(normalizedPublicKey)) return normalizedPublicKey;
  const derivedAddress = publicKeyToAddress(normalizedPublicKey);
  if (derivedAddress && derivedAddress !== normalizedAddress) {
    throw new Error("Signer address does not match the provided public key.");
  }
  return normalizedPublicKey;
}

async function getGovernanceSigningPayloadHex() {
  if (preparedSigningPayload.value?.payload) return String(preparedSigningPayload.value.payload).trim();
  const unsignedTxHex = String(props.request?.params?.unsigned_tx || "").trim();
  if (!unsignedTxHex) throw new Error("Missing unsigned transaction payload.");
  const payload = await walletService.getRawTransactionSigningPayload(unsignedTxHex);
  preparedSigningPayload.value = payload;
  return String(payload?.payload || "").trim();
}

async function verifyGovernanceSignature(signatureHex, signerPublicKey) {
  await ensureNeonJs();
  const normalizedSignature = String(signatureHex || "").trim().replace(/^0x/i, "");
  const normalizedPublicKey = String(signerPublicKey || "").trim().replace(/^0x/i, "");
  if (!normalizedSignature) throw new Error("Missing signature.");
  if (!normalizedPublicKey || !isPublicKeyHex(normalizedPublicKey)) return;
  if (typeof neonJs?.wallet?.verify !== "function") return;
  const signingPayload = await getGovernanceSigningPayloadHex();
  const isValid = neonJs.wallet.verify(signingPayload, normalizedSignature, normalizedPublicKey);
  if (!isValid) throw new Error("Signature does not match the governance signing payload for this signer.");
}

function validateCommitteeMember(signerPublicKey) {
  const committeePubkeys = props.request?.params?.committee_pubkeys || [];
  if (!committeePubkeys.length) return; // No committee data to validate against
  const normalizedPubkey = String(signerPublicKey || "").trim().replace(/^0x/i, "");
  if (!normalizedPubkey) return;
  if (!committeePubkeys.includes(normalizedPubkey)) {
    throw new Error("This signer is not a member of the committee for this proposal.");
  }
}

async function submitSig(signatureHex, source = "manual_signature") {
  if (!signatureHex || signatureHex.length < 128) {
    throw new Error("Invalid signature length. Expected at least 64 bytes (128 hex chars).");
  }
  try {
    const requestId = props.request.id;
    const signerAddress = getConnectedWalletAddress();
    const signerPublicKey = assertSignerIdentityMatches({
      signerAddress,
      signerPublicKey: findRequestSignerPublicKey(props.request, signerAddress) || (await getConnectedWalletPublicKey()),
    });
    await verifyGovernanceSignature(signatureHex, signerPublicKey);
    const payload = buildExternalWitnessPayload({
      signerAddress,
      signerPublicKey,
      signatureHex,
      eligibleSigners: props.request?.eligible_signers || [],
      source,
    });

    let res = await supabaseService.addMultisigSignature(requestId, payload.signerAddress, payload.signature, {
      publicKey: payload.publicKey,
      witness: payload.witness,
      invocationScript: payload.invocationScript,
      verificationScript: payload.verificationScript,
    });

    // Auto-retry with overwrite if duplicate
    if (!res.success && res.isDuplicate) {
      res = await supabaseService.addMultisigSignature(requestId, payload.signerAddress, payload.signature, {
        publicKey: payload.publicKey,
        witness: payload.witness,
        invocationScript: payload.invocationScript,
        verificationScript: payload.verificationScript,
        overwrite: true,
      });
    }

    if (!res.success) throw new Error(res.error);
    toast.success("Signature added successfully!");
    emit("close");
    emit("signed", { requestId });
  } catch (e) {
    throw new Error("Failed to submit signature: " + e.message);
  }
}

async function submitExternalWitness() {
  if (!props.request) return;
  isSubmittingExternalWitness.value = true;
  try {
    const requestId = props.request.id;
    const signerAddress = String(externalSignerAddress.value || "").trim();
    const signerPublicKey = assertSignerIdentityMatches({
      signerAddress,
      signerPublicKey:
        String(externalSignerPublicKey.value || "").trim() ||
        findRequestSignerPublicKey(props.request, signerAddress) ||
        (await getConnectedWalletPublicKey()),
    });

    // Validate committee membership
    validateCommitteeMember(signerPublicKey);

    const suppliedSignature = String(externalSignature.value || "").trim().replace(/^0x/i, "");
    const payload = buildExternalWitnessPayload({
      signerAddress,
      signerPublicKey,
      signatureHex: suppliedSignature,
      invocationScript: String(externalInvocationScript?.value || "").trim(),
      eligibleSigners: props.request?.eligible_signers || [],
    });
    await verifyGovernanceSignature(payload.signature, payload.publicKey || signerPublicKey);

    let res = await supabaseService.addMultisigSignature(requestId, payload.signerAddress, payload.signature, {
      publicKey: payload.publicKey,
      witness: payload.witness,
      invocationScript: payload.invocationScript,
      verificationScript: payload.verificationScript,
      overwrite: allowOverwrite.value,
    });

    if (!res.success && res.isDuplicate && !allowOverwrite.value) {
      toast.warning("This signer already has a signature. Enable 'Allow overwriting' to update it.");
      return;
    }

    if (!res.success) throw new Error(res.error);
    toast.success("External witness added successfully!");
    emit("close");
    emit("signed", { requestId });
  } catch (e) {
    console.error(e);
    toast.error("Failed to submit witness: " + e.message);
  } finally {
    isSubmittingExternalWitness.value = false;
  }
}
</script>
