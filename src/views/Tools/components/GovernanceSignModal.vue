<template>
  <div
    v-if="request"
    ref="dialogRef"
    :data-testid="testId('overlay')"
    role="dialog"
    tabindex="0"
    aria-modal="true"
    :aria-label="$t('tools.governance.signProposalTitle')"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 transition-opacity"
    @click.self="$emit('close')"
    @keydown.escape="$emit('close')"
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
        <button @click="$emit('close')" :aria-label="$t('tools.governance.signModalCloseAria')" class="p-2 rounded-xl text-mid hover:text-high hover:bg-surface-muted transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div :data-testid="testId('body')" class="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar min-h-0">
        <div class="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200">
          {{ $t('tools.governance.preferredCollectionHint') }}
          <div class="mt-3 flex flex-wrap gap-3">
            <button
              :data-testid="testId('jump-to-submit')"
              type="button"
              class="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
              @click="jumpToWitnessForm"
            >
              {{ $t('tools.governance.jumpToWitnessForm') }}
            </button>
            <button
              :data-testid="testId('jump-to-payload')"
              type="button"
              class="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-800 transition-colors hover:bg-white dark:border-sky-900/40 dark:bg-slate-950/40 dark:text-sky-200 dark:hover:bg-slate-950"
              @click="jumpToSigningPayload"
            >
              {{ $t('tools.governance.jumpToSigningPayload') }}
            </button>
          </div>
        </div>

        <!-- ═══ Sign with Wallet ═══ -->
        <div class="order-3 space-y-3 rounded-2xl border border-line-soft bg-surface-muted/40 p-4">
          <label class="block text-sm font-bold text-high">{{ $t('tools.governance.directWalletSignLabel') }}</label>
          <p class="text-xs text-mid">
            {{ $t('tools.governance.directWalletSignHint') }}
          </p>
          <button
            @click="autoSignTx"
            :disabled="isSigning || Boolean(walletSignBlockReason)"
            class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-950 text-white rounded-xl font-bold hover:bg-slate-900 hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
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

        <!-- NeoLine Mismatch Guide: NEXO Identity Impersonation Pattern -->
        <div
          v-if="isNeoLineMultisigSignerMismatch"
          class="order-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3 dark:bg-amber-900/20 dark:border-amber-800"
        >
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="space-y-1">
              <p class="text-sm font-bold text-high">{{ $t('tools.governance.neoLineMismatchHeading') }}</p>
              <p class="text-xs text-mid leading-relaxed">
                {{ $t('tools.governance.neoLineMismatchBody') }}
              </p>
            </div>
          </div>

          <ol class="text-xs text-mid list-decimal pl-4 space-y-1">
            <li>{{ $t('tools.governance.neoLineStep1') }}</li>
            <li>{{ $t('tools.governance.neoLineStep2', { threshold: committeeThreshold, count: committeePubkeys.length }) }}</li>
            <li>{{ $t('tools.governance.neoLineStep3') }}</li>
          </ol>

          <div class="rounded-xl border border-amber-200 bg-white/70 p-3 space-y-2 dark:border-amber-800 dark:bg-slate-950/40">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-low">{{ $t('tools.governance.expectedCommitteeMultisig') }}</p>
              <CopyButton v-if="committeeMultiSigAddress" :text="committeeMultiSigAddress" size="sm" />
            </div>
            <p class="font-mono text-[11px] break-all text-high">{{ committeeMultiSigAddress || $t('tools.governance.committeeKeysUnavailable') }}</p>
          </div>

          <button
            :data-testid="testId('switch-neoline-account')"
            @click="switchNeoLineAccount"
            :disabled="isSwitchingWalletAccount"
            class="w-full px-4 py-3 bg-slate-950 text-white rounded-xl font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
          >
            {{ isSwitchingWalletAccount ? $t('tools.governance.waitingForNeoLine') : $t('tools.governance.switchNeoLineAccount') }}
          </button>

          <div class="rounded-xl bg-slate-950 text-slate-100 p-3 space-y-2 dark:bg-slate-900">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{{ $t('tools.governance.committeePublicKeys') }}</p>
              <CopyButton :text="committeePubkeys.join('\n')" size="md" />
            </div>
            <div class="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
              <code v-for="(pk, idx) in committeePubkeys" :key="idx" class="block break-all font-mono text-[10px] text-slate-300">{{ pk }}</code>
            </div>
          </div>

          <p class="text-xs text-mid">{{ $t('tools.governance.orSignExternallyHint') }}</p>
        </div>

        <div class="order-2 relative py-2">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-line-soft"></div></div>
          <div class="relative flex justify-center">
            <span class="px-3 bg-white dark:bg-slate-950 text-xs font-bold text-low tracking-widest uppercase rounded-full">{{ $t('tools.governance.recommendedCollectionFlow') }}</span>
          </div>
        </div>

        <!-- ═══ Section 3: Transaction Data + External Witness ═══ -->
        <div class="order-1 space-y-4">
          <label class="block text-sm font-bold text-high">{{ $t('tools.governance.addSignatureOrWitnessLabel') }}</label>
          <p class="text-xs text-mid">
            {{ $t('tools.governance.addSignatureOrWitnessHint') }}
          </p>

          <!-- Unsigned Transaction Viewer -->
          <UnsignedTransactionViewer
            v-if="request.params?.unsigned_tx"
            :transaction-hex="request.params.unsigned_tx"
            :label="$t('tools.governance.unsignedTransactionPacket')"
            :description="$t('tools.governance.unsignedTransactionPacketDesc')"
          />

          <!-- Signing Payload + neo-cli Guide -->
          <div ref="signingPayloadSectionRef" class="rounded-2xl border border-line-soft bg-surface/70 p-4 space-y-3">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="space-y-1">
                <p class="text-sm font-semibold text-high">{{ $t('tools.governance.signingPayloadHeading') }}</p>
                <p class="text-xs text-mid">{{ $t('tools.governance.signingPayloadHint') }}</p>
              </div>
              <button
                :data-testid="testId('prepare-payload')"
                @click="prepareSigningPayload"
                :disabled="!request.params?.unsigned_tx || isPreparingSigningPayload"
                class="shrink-0 px-4 py-2.5 bg-slate-950 text-white rounded-xl font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
              >
                {{ isPreparingSigningPayload ? $t('tools.governance.preparing') : (preparedSigningPayload ? $t('tools.governance.refresh') : $t('tools.governance.prepareSigningPayload')) }}
              </button>
            </div>
            <div v-if="preparedSigningPayload" class="space-y-3">
              <div class="rounded-2xl bg-slate-950 text-slate-100 p-4 space-y-3 dark:bg-slate-900">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{{ $t('tools.governance.payloadHexLabel') }}</p>
                  <CopyButton :text="preparedSigningPayload.payload" size="md" />
                </div>
                <code :data-testid="testId('signing-payload')" class="block break-all font-mono text-[11px] leading-5 text-slate-100">{{ preparedSigningPayload.payload }}</code>
                <div class="grid grid-cols-1 gap-2 text-[11px] text-slate-300 sm:grid-cols-2">
                  <p>{{ $t('tools.governance.networkMagicLine', { value: preparedSigningPayload.networkMagic }) }}</p>
                  <p>{{ $t('tools.governance.transactionHashLine', { value: preparedSigningPayload.transactionHash }) }}</p>
                </div>
              </div>

              <!-- neo-cli signing command -->
              <div class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2 dark:bg-emerald-950/20 dark:border-emerald-900/40">
                <p class="text-xs font-bold text-high">{{ $t('tools.governance.howToSignNeonJs') }}</p>
                <div class="rounded-xl bg-slate-950 p-3 dark:bg-slate-900">
                  <div class="flex items-center justify-between mb-1">
                    <p class="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{{ $t('tools.governance.copyAndRun') }}</p>
                    <CopyButton :text="neonJsSignCommand" size="sm" />
                  </div>
                  <code class="block break-all font-mono text-[10px] leading-5 text-emerald-300 whitespace-pre-wrap">{{ neonJsSignCommand }}</code>
                </div>
                <p class="text-[11px] text-mid">{{ $t('tools.governance.replaceYourWif') }}</p>
              </div>
            </div>
          </div>

          <!-- Submit Witness -->
          <div ref="witnessFormSectionRef" class="space-y-3">
            <p class="text-sm font-semibold text-high">{{ $t('tools.governance.submitWitnessHeading') }}</p>
            <p class="text-xs text-mid">{{ $t('tools.governance.submitWitnessHint') }}</p>
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
              :placeholder="$t('tools.governance.signaturePastePlaceholder')"
            />
            <p
              v-if="signatureFormatHint"
              :data-testid="testId('signature-format-hint')"
              class="text-[11px]"
              :class="signatureFormatHintToneClass"
            >
              {{ signatureFormatHint }}
            </p>

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
              {{ $t('tools.governance.allowOverwriteExistingSig') }}
            </label>

            <button
              :data-testid="testId('submit-witness')"
              @click="submitExternalWitness"
              :disabled="(!externalSignature.trim() && !externalInvocationScript.trim()) || isSubmittingExternalWitness"
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
import { useFocusTrap } from "@/composables/useFocusTrap";
import CopyButton from "@/components/common/CopyButton.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount } from "@/utils/wallet";
import { walletService } from "@/services/walletService";
import { PROVIDERS } from "@/constants/walletProviders";
import { buildExternalWitnessPayload, detectSignatureFormat, normalizeSignatureHex } from "@/utils/multisigWitness";
import { normalizeHash160 } from "@/utils/walletNormalization";
import { isPublicKeyHex, publicKeyToAddress } from "@/utils/neoHelpers";
import { useToast } from "vue-toastification";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const dialogRef = ref(null);
useFocusTrap(dialogRef);

const props = defineProps({
  request: { type: Object, default: null },
  testIdPrefix: { type: String, default: "governance-sign-modal" },
});

const emit = defineEmits(["close", "signed"]);
const toast = useToast();

let neonJs = null;
let signingPayloadRequestId = 0;

const manualSignature = ref("");
const isSigning = ref(false);
const externalSignerAddress = ref("");
const externalSignerPublicKey = ref("");
const externalSignature = ref("");
const externalInvocationScript = ref("");
const witnessFormSectionRef = ref(null);
const signingPayloadSectionRef = ref(null);

const preparedSigningPayload = ref(null);
const isPreparingSigningPayload = ref(false);
const isSubmittingExternalWitness = ref(false);
const isSwitchingWalletAccount = ref(false);
const neonReadyTick = ref(0);
const allowOverwrite = ref(false);


const RAW_TRANSACTION_SIGNING_PROVIDERS = new Set([
  PROVIDERS.NEOLINE,
  PROVIDERS.WEB3AUTH,
  PROVIDERS.TESTNET_WIF,
]);

function getRequestNetworkOptions() {
  return props.request?.network ? { network: props.request.network } : null;
}

function testId(suffix) {
  return `${props.testIdPrefix}-${suffix}`;
}

watch(
  () => props.request,
  async (newVal) => {
    const requestId = ++signingPayloadRequestId;
    if (newVal) {
      manualSignature.value = "";
      externalSignerAddress.value = "";
      externalSignerPublicKey.value = "";
      externalSignature.value = "";
      externalInvocationScript.value = "";

      preparedSigningPayload.value = null;
      allowOverwrite.value = false;
      await ensureNeonJs();
      await prefillExternalWitnessSigner();
      // Auto-prepare signing payload so it's immediately visible.
      if (newVal.params?.unsigned_tx) {
        try { await prepareSigningPayload({ requestId }); } catch { /* best-effort */ }
      }
    }
  },
  { immediate: true },
);

watch(connectedAccount, async () => {
  if (!props.request || externalSignerAddress.value || externalSignerPublicKey.value) return;
  try {
    await ensureNeonJs();
    await prefillExternalWitnessSigner();
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[governanceSignModal] connectedAccount watch failed:", err);
  }
});

async function ensureNeonJs() {
  if (!neonJs) {
    neonJs = await (await import("@/utils/neonLoader.js")).loadNeonJs();
  }
  neonReadyTick.value += 1;
}

function getActiveWalletProvider() {
  return String(walletService.provider || walletService.account?.label || "").trim();
}

function getConnectedWalletAddress() {
  return String(walletService.account?.address || connectedAccount.value || "").trim();
}

function focusFirstPasteBackInput() {
  const section = witnessFormSectionRef.value;
  if (!section) return;
  const target =
    section.querySelector?.('[data-testid$="external-signature"]') ||
    section.querySelector?.("input");
  target?.focus?.();
}

function jumpToWitnessForm() {
  witnessFormSectionRef.value?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    focusFirstPasteBackInput();
  }, 80);
}

function jumpToSigningPayload() {
  signingPayloadSectionRef.value?.scrollIntoView?.({ behavior: "smooth", block: "start" });
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

const committeePubkeys = computed(() => {
  return Array.isArray(props.request?.params?.committee_pubkeys) ? props.request.params.committee_pubkeys : [];
});

const committeeThreshold = computed(() => {
  const explicit = Number(props.request?.signers_required || 0);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const size = committeePubkeys.value.length;
  return size > 0 ? Math.floor(size / 2) + 1 : 0;
});

const committeeMultiSigAddress = computed(() => {
  neonReadyTick.value;
  if (!committeePubkeys.value.length || !committeeThreshold.value || typeof neonJs?.wallet?.Account?.createMultiSig !== "function") {
    return "";
  }

  try {
    return neonJs.wallet.Account.createMultiSig(committeeThreshold.value, committeePubkeys.value).address;
  } catch {
    return "";
  }
});

const signatureFormat = computed(() => detectSignatureFormat(externalSignature.value));
const signatureFormatHint = computed(() => {
  if (signatureFormat.value === "hex") return "Detected format: Hex signature";
  if (signatureFormat.value === "base64") return "Detected format: Base64 signature";
  if (signatureFormat.value === "invalid" && String(externalSignature.value || "").trim()) {
    return "Detected format: Invalid signature input";
  }
  return "";
});
const signatureFormatHintToneClass = computed(() => (
  signatureFormat.value === "invalid"
    ? "text-rose-600 dark:text-rose-400"
    : "text-emerald-700 dark:text-emerald-400"
));

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
  if (isNeoLineMultisigSignerMismatch.value) {
    return "NeoLine account does not match the committee multisig signer. Follow the guide below.";
  }
  return "";
});

const neonJsSignCommand = computed(() => {
  const payload = preparedSigningPayload.value?.payload || "PAYLOAD_HEX";
  return `node -e "const n=require('@cityofzion/neon-js');console.log(n.wallet.sign('${payload}','YOUR_WIF'))"`;
});

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

async function prepareSigningPayload({ requestId = ++signingPayloadRequestId } = {}) {
  const unsignedTxHex = String(props.request?.params?.unsigned_tx || "").trim();
  if (!unsignedTxHex) return;
  isPreparingSigningPayload.value = true;
  try {
    await prefillExternalWitnessSigner();
    const networkOptions = getRequestNetworkOptions();
    const payload = networkOptions
      ? await walletService.getRawTransactionSigningPayload(unsignedTxHex, networkOptions)
      : await walletService.getRawTransactionSigningPayload(unsignedTxHex);
    if (requestId === signingPayloadRequestId) {
      preparedSigningPayload.value = payload;
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
    toast.error(t("tools.governance.signModalToasts.preparePayloadFailed", { reason: e?.message || String(e) }));
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
    const walletSignatureResult =
      typeof walletService.signRawTransactionDetailed === "function"
        ? await walletService.signRawTransactionDetailed(unsignedTxHex)
        : { signature: await walletService.signRawTransaction(unsignedTxHex) };
    await submitSig(walletSignatureResult?.signature || walletSignatureResult, "wallet_signature", walletSignatureResult);
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
    toast.error(t("tools.governance.signModalToasts.signingFailed", { reason: e?.message || String(e) }));
  } finally {
    isSigning.value = false;
  }
}

async function switchNeoLineAccount() {
  if (!props.request || getActiveWalletProvider() !== PROVIDERS.NEOLINE) return;

  isSwitchingWalletAccount.value = true;
  try {
    const nextAccount = await walletService.switchWalletAccount?.();
    await ensureNeonJs();
    externalSignerAddress.value = String(nextAccount?.address || "").trim();
    externalSignerPublicKey.value = "";
    await prefillExternalWitnessSigner();

    if (isNeoLineMultisigSignerMismatch.value) {
      toast.warning(t("tools.governance.signModalToasts.neoLineSwitchedStillMismatch"));
      return;
    }

    toast.success(t("tools.governance.signModalToasts.neoLineSwitchedSuccess"));
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
    toast.error(t("tools.governance.signModalToasts.switchNeoLineFailed", { reason: e?.message || String(e) }));
  } finally {
    isSwitchingWalletAccount.value = false;
  }
}

// ═══ Signature Submission ═══

function assertSignerIdentityMatches({ signerAddress, signerPublicKey }) {
  const normalizedAddress = String(signerAddress || "").trim();
  const normalizedPublicKey = String(signerPublicKey || "").trim().replace(/^0x/i, "");
  if (!normalizedAddress || !normalizedPublicKey || !isPublicKeyHex(normalizedPublicKey)) return normalizedPublicKey;
  const derivedAddress = publicKeyToAddress(normalizedPublicKey);
  if (derivedAddress && derivedAddress !== normalizedAddress) {
    throw new Error(t("tools.governance.errors.signerAddressMismatch"));
  }
  return normalizedPublicKey;
}

async function getGovernanceSigningPayloadHex() {
  if (preparedSigningPayload.value?.payload) return String(preparedSigningPayload.value.payload).trim();
  const unsignedTxHex = String(props.request?.params?.unsigned_tx || "").trim();
  if (!unsignedTxHex) throw new Error(t("tools.governance.errors.missingUnsignedTxPayload"));
  const networkOptions = getRequestNetworkOptions();
  const payload = networkOptions
    ? await walletService.getRawTransactionSigningPayload(unsignedTxHex, networkOptions)
    : await walletService.getRawTransactionSigningPayload(unsignedTxHex);
  preparedSigningPayload.value = payload;
  return String(payload?.payload || "").trim();
}

async function verifyGovernanceSignature(signatureHex, signerPublicKey) {
  await ensureNeonJs();
  const normalizedSignature = normalizeSignatureHex(signatureHex);
  const normalizedPublicKey = String(signerPublicKey || "").trim().replace(/^0x/i, "");
  if (!normalizedSignature) throw new Error(t("tools.governance.errors.missingSignature"));
  if (!normalizedPublicKey || !isPublicKeyHex(normalizedPublicKey)) return;
  if (typeof neonJs?.wallet?.verify !== "function") return;
  const signingPayload = await getGovernanceSigningPayloadHex();
  const isValid = neonJs.wallet.verify(signingPayload, normalizedSignature, normalizedPublicKey);
  if (!isValid) throw new Error(t("tools.governance.errors.signatureDoesNotMatchPayload"));
}

function validateCommitteeMember(signerPublicKey) {
  const committeePubkeys = props.request?.params?.committee_pubkeys || [];
  if (!committeePubkeys.length) return; // No committee data to validate against
  const normalizedPubkey = String(signerPublicKey || "").trim().replace(/^0x/i, "");
  if (!normalizedPubkey) return;
  if (!committeePubkeys.includes(normalizedPubkey)) {
    throw new Error(t("tools.governance.errors.signerNotCommitteeMember"));
  }
}

async function submitSig(signatureHex, source = "manual_signature", signerOverride = null) {
  const normalizedSignature = normalizeSignatureHex(signatureHex);
  if (!normalizedSignature || normalizedSignature.length < 128) {
    throw new Error(t("tools.governance.errors.invalidSignatureLength"));
  }
  try {
    const requestId = props.request.id;
    const overridePublicKey = String(
      signerOverride?.publicKey || signerOverride?.signerPublicKey || "",
    ).trim().replace(/^0x/i, "");
    const overrideAddress = String(
      signerOverride?.signerAddress || signerOverride?.address || "",
    ).trim();
    const signerAddress = overrideAddress || getConnectedWalletAddress();
    const signerPublicKey = assertSignerIdentityMatches({
      signerAddress,
      signerPublicKey:
        overridePublicKey ||
        findRequestSignerPublicKey(props.request, signerAddress) ||
        (await getConnectedWalletPublicKey()),
    });
    await verifyGovernanceSignature(normalizedSignature, signerPublicKey);
    const payload = buildExternalWitnessPayload({
      signerAddress,
      signerPublicKey,
      signatureHex: normalizedSignature,
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
    toast.success(t("tools.governance.signModalToasts.signatureAdded"));
    emit("close");
    emit("signed", { requestId });
  } catch (e) {
    throw new Error(t("tools.governance.errors.submitSignatureFailed", { reason: e.message }));
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

    const suppliedSignature = normalizeSignatureHex(externalSignature.value);
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
      toast.warning(t("tools.governance.signModalToasts.signerAlreadyHasSignature"));
      return;
    }

    if (!res.success) throw new Error(res.error);
    toast.success(t("tools.governance.signModalToasts.witnessAdded"));
    emit("close");
    emit("signed", { requestId });
  } catch (e) {
    if (import.meta.env.DEV) console.error(e);
    toast.error(t("tools.governance.signModalToasts.submitWitnessFailed", { reason: e.message }));
  } finally {
    isSubmittingExternalWitness.value = false;
  }
}
</script>
