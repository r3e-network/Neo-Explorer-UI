<template>
  <div
    v-if="request"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-lg rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[90vh]">
      <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
        <h2 class="text-lg font-bold text-high tracking-tight">Add Signature</h2>
        <button @click="$emit('close')" aria-label="Close" class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-5 overflow-y-auto custom-scrollbar min-h-0">
        <!-- Signing Payload -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-high">Signing Payload</label>
          <div v-if="signingPayload" class="flex items-center gap-2">
            <code class="flex-1 block break-all font-mono text-[11px] leading-5 text-mid bg-surface-muted rounded-lg px-3 py-2 select-all">{{ signingPayload.payload }}</code>
            <CopyButton :text="signingPayload.payload" size="md" />
          </div>
          <p v-else class="text-xs text-amber-600">Loading...</p>
          <p v-if="signingPayload" class="text-[11px] text-mid font-mono">TX Hash: {{ signingPayload.transactionHash }}</p>
        </div>

        <!-- Public Key + Signature -->
        <div class="space-y-3">
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
            placeholder="Signature (128 hex)"
          />
          <button
            @click="submitWitness"
            :disabled="!signatureHex.trim() || signatureHex.trim().length < 128 || !signerPublicKey.trim() || isSubmitting"
            class="w-full px-4 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {{ isSubmitting ? "Submitting..." : "Submit" }}
          </button>
          <p v-if="submitError" class="text-xs text-red-600 dark:text-red-400">{{ submitError }}</p>
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
import { isPublicKeyHex, publicKeyToAddress } from "@/utils/neoHelpers";
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

watch(() => props.request, async (req) => {
  if (!req) return;
  signerPublicKey.value = "";
  signatureHex.value = "";
  submitError.value = "";
  signingPayload.value = null;

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
    const sig = signatureHex.value.trim().replace(/^0x/i, "");
    const pk = signerPublicKey.value.trim().replace(/^0x/i, "");

    if (!sig || sig.length < 128) throw new Error("Signature must be 128 hex characters.");
    if (!pk || !isPublicKeyHex(pk)) throw new Error("Valid public key required (66 hex chars).");

    const addr = publicKeyToAddress(pk);
    if (!addr) throw new Error("Could not derive address from public key.");

    const committee = props.request?.params?.committee_pubkeys || [];
    if (committee.length > 0 && !committee.includes(pk)) {
      throw new Error("This public key is not a committee member.");
    }

    if (pk && signingPayload.value?.payload) {
      const neonJs = window.Neon || (await import("@cityofzion/neon-js"));
      if (typeof neonJs.wallet?.verify === "function") {
        if (!neonJs.wallet.verify(signingPayload.value.payload, sig, pk)) {
          throw new Error("Signature does not verify against the signing payload.");
        }
      }
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
