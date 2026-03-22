<template>
  <div
    v-if="request"
    data-testid="governance-sign-modal-overlay"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
    @click.self="$emit('close')"
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
          @click="$emit('close')"
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
          v-if="request.params?.unsigned_tx"
          :transaction-hex="request.params.unsigned_tx"
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
</template>

<script setup>
import { ref, watch } from "vue";
import UnsignedTransactionViewer from "@/components/trace/UnsignedTransactionViewer.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount } from "@/utils/wallet";
import { walletService } from "@/services/walletService";
import { buildExternalWitnessPayload } from "@/utils/multisigWitness";
import { useToast } from "vue-toastification";

const props = defineProps({
  request: { type: Object, default: null },
});

const emit = defineEmits(["close", "signed"]);

const toast = useToast();

let neonJs = null;

const manualSignature = ref("");
const isSigning = ref(false);
const externalSignerAddress = ref("");
const externalSignerPublicKey = ref("");
const externalInvocationScript = ref("");
const externalVerificationScript = ref("");
const isSubmittingExternalWitness = ref(false);

watch(
  () => props.request,
  (newVal) => {
    if (newVal) {
      manualSignature.value = "";
      externalSignerAddress.value = "";
      externalSignerPublicKey.value = "";
      externalInvocationScript.value = "";
      externalVerificationScript.value = "";
      ensureNeonJs();
    }
  },
);

async function ensureNeonJs() {
  if (!neonJs) {
    neonJs = window.Neon || (await import("@cityofzion/neon-js"));
  }
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
  if (!props.request) return;
  isSigning.value = true;
  try {
    const unsignedTxHex = props.request.params.unsigned_tx;
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
    const requestId = props.request.id;
    const signerPublicKey = findRequestSignerPublicKey(props.request, connectedAccount.value);
    const payload = buildExternalWitnessPayload({
      signerAddress: connectedAccount.value,
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
    const payload = buildExternalWitnessPayload({
      signerAddress: externalSignerAddress.value,
      signerPublicKey: externalSignerPublicKey.value,
      invocationScript: externalInvocationScript.value,
      verificationScript: externalVerificationScript.value,
      eligibleSigners: props.request?.eligible_signers || [],
    });

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
