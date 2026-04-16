<template>
  <div
    v-if="request"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-2xl rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[90vh]">
      <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
        <h2 class="text-lg font-bold text-high tracking-tight">Add Signature</h2>
        <button @click="$emit('close')" aria-label="Close" class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-5 overflow-y-auto custom-scrollbar min-h-0">

        <!-- neo-cli Transaction JSON -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-high">Transaction (neo-cli JSON format)</label>
            <CopyButton v-if="contextJson" :text="contextJson" size="md" />
          </div>
          <div v-if="contextJson" class="rounded-xl bg-slate-950 p-3 max-h-32 overflow-y-auto custom-scrollbar dark:bg-slate-900">
            <code class="block break-all font-mono text-[10px] leading-5 text-emerald-300 select-all">{{ contextJson }}</code>
          </div>
          <p v-else class="text-xs text-amber-600">Loading...</p>
          <p class="text-[11px] text-mid">Copy this JSON into neo-cli: <code class="font-mono text-high">neo> sign &#123;paste JSON here&#125;</code></p>
        </div>

        <!-- Public Key + Signature -->
        <div class="space-y-3">
          <label class="text-xs font-bold text-high">Public Key + Signature</label>
          <input
            v-model="signerPublicKey"
            type="text"
            class="form-input w-full font-mono text-xs py-2.5 rounded-xl"
            placeholder="Public key (66 hex)"
          />
          <input
            v-model="signatureHex"
            type="text"
            class="form-input w-full font-mono text-xs py-2.5 rounded-xl"
            placeholder="Signature (128 hex or base64 from neo-cli)"
          />
          <button
            @click="submitWitness"
            :disabled="!signatureHex.trim() || signatureHex.trim().length < 64 || !signerPublicKey.trim() || isSubmitting"
            class="w-full px-4 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {{ isSubmitting ? "Submitting..." : "Submit" }}
          </button>
          <p v-if="submitError" class="text-xs text-red-600 dark:text-red-400">{{ submitError }}</p>

          <div class="text-center pt-2 border-t border-line-soft">
            <p class="text-[11px] text-mid mb-1">Or send your public key and signature via email:</p>
            <a :href="emailLink" class="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400">jimmy@r3e.network</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { supabaseService } from "@/services/supabaseService";
import { walletService } from "@/services/walletService";
import { buildExternalWitnessPayload } from "@/utils/multisigWitness";
import { isPublicKeyHex, publicKeyToAddress, hexToBase64 } from "@/utils/neoHelpers";
import { useToast } from "vue-toastification";

const props = defineProps({
  request: { type: Object, default: null },
});

const emit = defineEmits(["close", "signed"]);
const toast = useToast();

const signingPayload = ref(null);
const signerPublicKey = ref("");
const signatureHex = ref("");
const isSubmitting = ref(false);
const submitError = ref("");

let neonJs = null;

async function ensureNeonJs() {
  if (!neonJs) neonJs = window.Neon || (await import("@cityofzion/neon-js"));
}

const contextJson = computed(() => {
  if (!signingPayload.value || !props.request?.params?.unsigned_tx) return "";
  try {
    const unsignedTxHex = props.request.params.unsigned_tx;
    const committeePubkeys = props.request.params?.committee_pubkeys || [];
    const threshold = props.request.signers_required || Math.floor(committeePubkeys.length / 2) + 1;
    const scriptHash = props.request.params?.scriptHash || "";

    // Build ContractParametersContext JSON for neo-cli
    const base64Tx = hexToBase64(unsignedTxHex);
    const verificationScriptHex = props.request.params?.committee_verification_script || "";

    // Build the verification script from committee pubkeys if not stored
    let base64VerificationScript = "";
    if (verificationScriptHex) {
      base64VerificationScript = hexToBase64(verificationScriptHex);
    } else if (neonJs && committeePubkeys.length > 0) {
      const multiSig = neonJs.wallet.Account.createMultiSig(threshold, committeePubkeys);
      base64VerificationScript = multiSig.contract.script;
    }

    const normalizedHash = String(scriptHash).replace(/^0x/i, "").toLowerCase();
    const parameters = Array.from({ length: threshold }, () => ({ type: "Signature" }));

    const context = {
      type: "Neo.Network.P2P.Payloads.Transaction",
      hash: "0x" + signingPayload.value.transactionHash,
      data: base64Tx,
      items: {
        [normalizedHash]: {
          script: base64VerificationScript,
          parameters,
          signatures: {},
        },
      },
      network: signingPayload.value.networkMagic,
    };

    return JSON.stringify(context);
  } catch {
    return "";
  }
});

const emailLink = computed(() => {
  const subject = encodeURIComponent("Council Governance Signature - Proposal #" + (props.request?.id || ""));
  const body = encodeURIComponent("Public Key: " + signerPublicKey.value + "\nSignature: " + signatureHex.value + "\nProposal: #" + (props.request?.id || ""));
  return "mailto:jimmy@r3e.network?subject=" + subject + "&body=" + body;
});

watch(() => props.request, async (req) => {
  if (!req) return;
  signerPublicKey.value = "";
  signatureHex.value = "";
  submitError.value = "";
  signingPayload.value = null;

  await ensureNeonJs();

  if (req.params?.unsigned_tx) {
    try {
      signingPayload.value = await walletService.getRawTransactionSigningPayload(req.params.unsigned_tx);
    } catch (e) {
      console.error("Failed to prepare signing payload:", e);
    }
  }
}, { immediate: true });

async function submitWitness() {
  submitError.value = "";
  isSubmitting.value = true;
  try {
    let sig = signatureHex.value.trim().replace(/^0x/i, "");
    const pk = signerPublicKey.value.trim().replace(/^0x/i, "");

    // Auto-detect base64 signature (neo-cli outputs base64) and convert to hex
    if (sig && !/^[0-9a-f]+$/i.test(sig) && /^[A-Za-z0-9+/=]+$/.test(sig)) {
      try {
        const decoded = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
        if (decoded.length === 64) {
          sig = Array.from(decoded, (b) => b.toString(16).padStart(2, "0")).join("");
        }
      } catch { /* not valid base64, will fail hex check below */ }
    }

    if (!sig || sig.length < 128 || !/^[0-9a-f]+$/i.test(sig)) throw new Error("Signature must be 128 hex characters or 64-byte base64.");
    if (!pk || !isPublicKeyHex(pk)) throw new Error("Valid public key required (66 hex chars).");

    const addr = publicKeyToAddress(pk);
    if (!addr) throw new Error("Could not derive address from public key.");

    // 1. Public key must be a committee member
    const committee = (props.request?.params?.committee_pubkeys || []).map((p) => p.toLowerCase());
    if (!committee.length) throw new Error("Committee pubkeys not available for this proposal.");
    if (!committee.includes(pk.toLowerCase())) {
      throw new Error("This public key is not a committee member.");
    }

    // 2 & 3. Signature must be cryptographically valid for this public key AND the current transaction payload
    const unsignedTx = props.request?.params?.unsigned_tx;
    if (!unsignedTx) throw new Error("Proposal has no unsigned transaction.");
    await ensureNeonJs();
    if (typeof neonJs?.wallet?.verify !== "function") throw new Error("Crypto library not available.");
    const freshPayload = await walletService.getRawTransactionSigningPayload(unsignedTx);
    if (!neonJs.wallet.verify(freshPayload.payload, sig, pk)) {
      throw new Error("Signature does not verify against the transaction. Make sure you signed the correct proposal and your public key matches.");
    }

    const payload = buildExternalWitnessPayload({
      signerAddress: addr, signerPublicKey: pk, signatureHex: sig,
      eligibleSigners: props.request?.eligible_signers || [],
      source: "offline_signing",
    });

    const res = await supabaseService.addMultisigSignature(
      props.request.id, payload.signerAddress, payload.signature, {
        publicKey: payload.publicKey, witness: payload.witness,
        invocationScript: payload.invocationScript,
        verificationScript: payload.verificationScript,
        overwrite: true,
      }
    );

    if (!res.success) throw new Error(res.error);
    toast.success("Signature added!");
    emit("signed", { requestId: props.request.id });
    emit("close");
  } catch (e) {
    submitError.value = e.message;
  } finally {
    isSubmitting.value = false;
  }
}
</script>
