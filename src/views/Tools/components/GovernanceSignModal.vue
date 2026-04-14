<template>
  <div
    v-if="request"
    :data-testid="testId('overlay')"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
    @click.self="$emit('close')"
  >
    <div
      :data-testid="testId('panel')"
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
          <h2 class="text-xl font-bold text-high tracking-tight">{{ $t("tools.governance.signProposalTitle") }}</h2>
        </div>
        <button
          @click="$emit('close')"
          aria-label="Close"
          class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div :data-testid="testId('body')" class="p-6 space-y-6 overflow-y-auto custom-scrollbar min-h-0">
        <UnsignedTransactionViewer
          v-if="request.params?.unsigned_tx"
          :transaction-hex="request.params.unsigned_tx"
          label="Unsigned Transaction Packet"
          description="Review the complete unsigned governance transaction before signing or importing a witness."
        />

        <div class="space-y-3">
          <label class="block text-sm font-bold text-high">{{ $t("tools.governance.optionWallet") }}</label>
          <button
            @click="autoSignTx"
            :disabled="isSigning || Boolean(walletSignBlockReason)"
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
            {{ isSigning ? $t("tools.governance.awaitingWallet") : $t("tools.governance.signWithWallet") }}
          </button>
          <p
            class="text-[11px] text-center"
            :class="walletSignBlockReason ? 'text-amber-600 dark:text-amber-400' : 'text-mid'"
          >
            {{ walletSignBlockReason || $t("tools.governance.walletSignNote") }}
          </p>
        </div>

        <div class="relative py-2">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-line-soft"></div></div>
          <div class="relative flex justify-center">
            <span
              class="px-3 bg-white dark:bg-slate-950 text-xs font-bold text-low tracking-widest uppercase rounded-full"
              >{{ $t("tools.governance.or") }}</span
            >
          </div>
        </div>

        <div class="space-y-3">
          <label class="block text-sm font-bold text-high">{{ $t("tools.governance.optionManual") }}</label>
          <input
            v-model="manualSignature"
            type="text"
            class="form-input w-full font-mono text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
            :placeholder="$t('tools.governance.manualSigPlaceholder')"
          />
          <button
            @click="submitManualSignature"
            :disabled="!manualSignature || manualSignature.length < 128"
            class="w-full px-4 py-3 bg-surface-muted text-high border border-line-soft rounded-xl font-bold hover:bg-surface transition-all active:scale-95 hover:border-line disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ $t("tools.governance.submitManualSig") }}
          </button>
        </div>

        <div class="relative py-2">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-line-soft"></div></div>
          <div class="relative flex justify-center">
            <span
              class="px-3 bg-white dark:bg-slate-950 text-xs font-bold text-low tracking-widest uppercase rounded-full"
              >{{ $t("tools.governance.or") }}</span
            >
          </div>
        </div>

        <div class="space-y-4">
          <label class="block text-sm font-bold text-high">{{ $t("tools.governance.optionExternalWitness") }}</label>

          <div class="rounded-2xl border border-line-soft bg-surface/70 p-4 space-y-3">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-high">{{ $t("tools.governance.offlineSigningGuideTitle") }}</p>
              <p class="text-xs text-mid">
                {{
                  isNeoLineAssistedFlow
                    ? $t("tools.governance.neoLineMultisigNotice")
                    : $t("tools.governance.offlineSigningGuideDesc")
                }}
              </p>
            </div>
            <ol class="space-y-2 text-xs text-mid list-decimal pl-4">
              <li>{{ $t("tools.governance.offlineSigningStepPrepare") }}</li>
              <li>{{ $t("tools.governance.offlineSigningStepSign") }}</li>
              <li>{{ $t("tools.governance.offlineSigningStepSubmit") }}</li>
            </ol>
            <p class="text-[11px] text-mid">
              {{ $t("tools.governance.offlineSigningVerificationNote") }}
            </p>
          </div>

          <div class="rounded-2xl border border-line-soft bg-surface/70 p-4 space-y-3">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="space-y-1">
                <p class="text-sm font-semibold text-high">Prepare Offline Signing Payload</p>
                <p class="text-xs text-mid">
                  Export the exact payload for an external raw-signing tool, then paste the 64-byte signature below.
                </p>
              </div>
              <button
                :data-testid="testId('prepare-payload')"
                @click="prepareSigningPayload"
                :disabled="!request.params?.unsigned_tx || isPreparingSigningPayload"
                class="shrink-0 px-4 py-2.5 bg-slate-950 text-white rounded-xl font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
              >
                {{ isPreparingSigningPayload ? "Preparing..." : "Prepare Signing Payload" }}
              </button>
            </div>

            <div
              v-if="preparedSigningPayload"
              class="rounded-2xl bg-slate-950 text-slate-100 p-4 space-y-3 dark:bg-slate-900"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Signing Payload</p>
                <CopyButton :text="preparedSigningPayload.payload" size="md" />
              </div>
              <code
                :data-testid="testId('signing-payload')"
                class="block break-all font-mono text-[11px] leading-5 text-slate-100"
              >{{ preparedSigningPayload.payload }}</code>
              <div class="grid grid-cols-1 gap-2 text-[11px] text-slate-300 sm:grid-cols-2">
                <p>Network magic: {{ preparedSigningPayload.networkMagic }}</p>
                <p>Transaction hash: {{ preparedSigningPayload.transactionHash }}</p>
              </div>
            </div>
          </div>

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
          <input
            :data-testid="testId('external-verification')"
            v-model="externalVerificationScript"
            type="text"
            class="form-input w-full font-mono text-xs py-3 rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500/20 hover:border-amber-400 focus:border-amber-400 transition-all outline-none"
            :placeholder="$t('tools.governance.verificationScriptPlaceholder')"
          />
          <button
            :data-testid="testId('submit-witness')"
            @click="submitExternalWitness"
            :disabled="(!externalSignature.trim() && !externalInvocationScript.trim()) || isSubmittingExternalWitness"
            class="w-full px-4 py-3 bg-surface-muted text-high border border-line-soft rounded-xl font-bold hover:bg-surface transition-all active:scale-95 hover:border-line disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{
              isSubmittingExternalWitness
                ? $t("tools.governance.submittingWitness")
                : $t("tools.governance.submitExternalWitness")
            }}
          </button>
          <p class="text-[11px] text-mid text-center">
            Paste either a raw signature or a full invocation script. Raw signatures are converted into the witness automatically.
          </p>
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
const externalVerificationScript = ref("");
const preparedSigningPayload = ref(null);
const isPreparingSigningPayload = ref(false);
const isSubmittingExternalWitness = ref(false);
const neonReadyTick = ref(0);

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
      externalVerificationScript.value = "";
      preparedSigningPayload.value = null;
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
      : Array.isArray(transaction?.data?.signers)
        ? transaction.data.signers
        : [];

    return signerList
      .map((signer) => normalizeHash160(String(signer?.account || "").trim()))
      .filter(Boolean);
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
    try {
      if (publicKeyToAddress(pubkey) === target) {
        return pubkey;
      }
    } catch {
      // Ignore malformed signer pubkeys.
    }

    try {
      if (typeof neonJs?.wallet?.Account === "function" && new neonJs.wallet.Account(pubkey).address === target) {
        return pubkey;
      }
    } catch {
      // Ignore mocked or malformed wallet account conversions.
    }
  }

  return "";
}

async function prefillExternalWitnessSigner() {
  const signerAddress = getConnectedWalletAddress();
  if (!signerAddress) return;

  if (!externalSignerAddress.value) {
    externalSignerAddress.value = signerAddress;
  }

  if (!externalSignerPublicKey.value) {
    const signerPublicKey =
      findRequestSignerPublicKey(props.request, signerAddress) || (await getConnectedWalletPublicKey());
    if (signerPublicKey) {
      externalSignerPublicKey.value = signerPublicKey;
    }
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

    try {
      const signature = await walletService.signRawTransaction(unsignedTxHex);
      await submitSig(signature, "wallet_signature");
      return;
    } catch (directError) {
      // If this is NOT a NeoLine multisig mismatch, rethrow immediately.
      if (!isNeoLineMultisigSignerMismatch.value) throw directError;
      if (import.meta.env.DEV) console.warn("[GovernanceSignModal] NeoLine signTransaction rejected for multisig signer, trying context flow:", directError.message);
    }

    // NeoLine rejected because the tx signer is the committee multisig.
    // Use the ContractParametersContext flow to sign as an individual council member.
    try {
      const committeePubkeys = props.request.params?.committee_pubkeys || [];
      const multisigScriptHash = props.request.params?.scriptHash || "";
      if (!committeePubkeys.length || !multisigScriptHash) {
        throw new Error("Missing committee pubkeys or multisig script hash in proposal.");
      }

      await ensureNeonJs();
      const threshold = props.request.signers_required
        || Math.floor(committeePubkeys.length / 2) + 1;
      const multisigAccount = neonJs.wallet.Account.createMultiSig(threshold, committeePubkeys);
      const verificationScript = neonJs.u.base642hex(multisigAccount.contract.script);

      const { signature, publicKey } = await walletService.signTransactionWithContext(
        unsignedTxHex,
        verificationScript,
        multisigScriptHash,
      );
      await submitSig(signature, "neoline_context_signature");
      return;
    } catch (contextError) {
      if (import.meta.env.DEV) console.warn("[GovernanceSignModal] NeoLine context signing also failed:", contextError.message);
      // Last resort: auto-prepare the offline signing payload.
      try {
        await prepareSigningPayload();
      } catch {
        // Best-effort.
      }
      toast.warning(
        "NeoLine could not sign this governance transaction. The signing payload has been prepared below — copy it, sign with an offline tool, and paste the signature."
      );
      return;
    }
  } catch (e) {
    console.error(e);
    toast.error("Signing failed: " + (e?.message || String(e)));
  } finally {
    isSigning.value = false;
  }
}

async function submitManualSignature() {
  if (!manualSignature.value) return;
  await submitSig(manualSignature.value.trim(), "manual_signature");
}

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
  if (preparedSigningPayload.value?.payload) {
    return String(preparedSigningPayload.value.payload).trim();
  }

  const unsignedTxHex = String(props.request?.params?.unsigned_tx || "").trim();
  if (!unsignedTxHex) {
    throw new Error("Missing unsigned transaction payload.");
  }

  const payload = await walletService.getRawTransactionSigningPayload(unsignedTxHex);
  preparedSigningPayload.value = payload;
  return String(payload?.payload || "").trim();
}

async function verifyGovernanceSignature(signatureHex, signerPublicKey) {
  await ensureNeonJs();
  const normalizedSignature = String(signatureHex || "").trim().replace(/^0x/i, "");
  const normalizedPublicKey = String(signerPublicKey || "").trim().replace(/^0x/i, "");

  if (!normalizedSignature) {
    throw new Error("Missing signature.");
  }

  if (!normalizedPublicKey || !isPublicKeyHex(normalizedPublicKey)) {
    return;
  }

  if (typeof neonJs?.wallet?.verify !== "function") {
    return;
  }

  const signingPayload = await getGovernanceSigningPayloadHex();
  const isValid = neonJs.wallet.verify(signingPayload, normalizedSignature, normalizedPublicKey);
  if (!isValid) {
    throw new Error("Signature does not match the governance signing payload for this signer.");
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

    const res = await supabaseService.addMultisigSignature(requestId, payload.signerAddress, payload.signature, {
      publicKey: payload.publicKey,
      witness: payload.witness,
      invocationScript: payload.invocationScript,
      verificationScript: payload.verificationScript,
    });
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
    const suppliedSignature = String(externalSignature.value || "").trim().replace(/^0x/i, "");
    const payload = buildExternalWitnessPayload({
      signerAddress,
      signerPublicKey,
      signatureHex: suppliedSignature,
      invocationScript: externalInvocationScript.value,
      verificationScript: externalVerificationScript.value,
      eligibleSigners: props.request?.eligible_signers || [],
    });
    await verifyGovernanceSignature(payload.signature, payload.publicKey || signerPublicKey);

    const res = await supabaseService.addMultisigSignature(requestId, payload.signerAddress, payload.signature, {
      publicKey: payload.publicKey,
      witness: payload.witness,
      invocationScript: payload.invocationScript,
      verificationScript: payload.verificationScript,
    });
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
