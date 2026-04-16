<template>
  <div
    v-if="request"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-2xl rounded-3xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface/50">
        <h2 class="text-lg font-bold text-high tracking-tight">Add Signature / Witness</h2>
        <button @click="$emit('close')" aria-label="Close" class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-5 overflow-y-auto custom-scrollbar min-h-0">
        <!-- Step 1: Signing Payload -->
        <div class="space-y-2">
          <p class="text-sm font-bold text-high">Step 1: Copy the Signing Payload</p>
          <p class="text-xs text-mid">This is the exact hex data that must be signed with your council private key using ECDSA (secp256r1 + SHA-256).</p>
          <div v-if="signingPayload" class="rounded-xl bg-slate-950 p-4 space-y-2 dark:bg-slate-900">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Payload Hex</span>
              <CopyButton :text="signingPayload.payload" size="md" />
            </div>
            <code class="block break-all font-mono text-[11px] leading-5 text-emerald-300">{{ signingPayload.payload }}</code>
            <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
              <span>Magic: {{ signingPayload.networkMagic }}</span>
              <span>TX Hash: {{ signingPayload.transactionHash }}</span>
            </div>
          </div>
          <div v-else class="text-xs text-amber-600">Loading signing payload...</div>
        </div>

        <!-- Step 2: How to Sign -->
        <div class="space-y-2">
          <p class="text-sm font-bold text-high">Step 2: Sign Offline</p>
          <p class="text-xs text-mid">Run one of these commands in your terminal. Replace <strong>YOUR_WIF</strong> with your council WIF private key.</p>
          <div class="rounded-xl bg-slate-950 p-4 space-y-3 dark:bg-slate-900">
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">neon-js (Node.js)</span>
                <CopyButton v-if="signingPayload" :text="neonJsCmd" size="sm" />
              </div>
              <code class="block font-mono text-[10px] text-emerald-300 leading-5 whitespace-pre-wrap">{{ neonJsCmd }}</code>
            </div>
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">neo-cli</span>
              </div>
              <code class="block font-mono text-[10px] text-sky-300 leading-5 whitespace-pre-wrap">neo> open wallet your-wallet.json
neo> sign {{ signingPayload?.payload || 'PAYLOAD' }}</code>
            </div>
          </div>
          <p class="text-[11px] text-mid">The output is a 128-character hex string (64 bytes). Copy it for step 3.</p>
        </div>

        <!-- Step 3: Paste Public Key + Signature -->
        <div class="space-y-3">
          <p class="text-sm font-bold text-high">Step 3: Paste Public Key + Signature</p>
          <input
            v-model="signerPublicKey"
            type="text"
            class="form-input w-full font-mono text-xs py-2.5 rounded-xl"
            placeholder="Public key (66 hex chars, starts with 02 or 03)"
          />
          <input
            v-model="signatureHex"
            type="text"
            class="form-input w-full font-mono text-xs py-2.5 rounded-xl"
            placeholder="128-char hex signature"
          />
          <p v-if="derivedAddress" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
            {{ derivedAddress }}
          </p>
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

const derivedAddress = computed(() => {
  const pk = signerPublicKey.value.trim().replace(/^0x/i, "");
  if (!pk || !isPublicKeyHex(pk)) return "";
  try { return publicKeyToAddress(pk); } catch { return ""; }
});

const neonJsCmd = computed(() => {
  const p = signingPayload.value?.payload || "PAYLOAD";
  return "node -e \"const n=require('@cityofzion/neon-js');" +
    "console.log(n.wallet.sign('" + p + "','YOUR_WIF'))\"";
});

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

    if (!sig || sig.length < 128) throw new Error("Signature must be at least 128 hex characters (64 bytes).");
    if (!pk || !isPublicKeyHex(pk)) throw new Error("A valid public key is required (66 hex chars, starting with 02 or 03).");

    const addr = publicKeyToAddress(pk);
    if (!addr) throw new Error("Could not derive address from public key.");

    // Validate committee membership
    const committee = props.request?.params?.committee_pubkeys || [];
    if (pk && committee.length > 0 && !committee.includes(pk)) {
      throw new Error("This public key is not a committee member for this proposal.");
    }

    // Verify signature cryptographically
    if (pk && signingPayload.value?.payload) {
      let neonJs = window.Neon || (await import("@cityofzion/neon-js"));
      if (typeof neonJs.wallet?.verify === "function") {
        const valid = neonJs.wallet.verify(signingPayload.value.payload, sig, pk);
        if (!valid) throw new Error("Signature does not verify against the governance signing payload.");
      }
    }

    // Build witness payload
    const payload = buildExternalWitnessPayload({
      signerAddress: addr,
      signerPublicKey: pk,
      signatureHex: sig,
      eligibleSigners: props.request?.eligible_signers || [],
      source: "offline_signing",
    });

    const res = await supabaseService.addMultisigSignature(
      props.request.id, payload.signerAddress, payload.signature, {
        publicKey: payload.publicKey,
        witness: payload.witness,
        invocationScript: payload.invocationScript,
        verificationScript: payload.verificationScript,
        overwrite: true,
      }
    );

    if (!res.success) throw new Error(res.error);

    toast.success("Witness added successfully!");
    emit("signed", { requestId: props.request.id });
    emit("close");
  } catch (e) {
    submitError.value = e.message;
  } finally {
    isSubmitting.value = false;
  }
}
</script>
