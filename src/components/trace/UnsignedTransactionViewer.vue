<template>
  <div class="unsigned-transaction-viewer text-high">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h4 data-testid="unsigned-tx-header-label" class="text-sm font-semibold text-high">{{ label }}</h4>
        <p v-if="description" data-testid="unsigned-tx-header-description" class="mt-1 text-xs text-mid">{{ description }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          data-testid="unsigned-tx-toggle"
          class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-line-soft"
          :class="
            showRaw
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
              : 'bg-surface text-mid hover:bg-surface-muted hover:text-high dark:bg-surface-elevated dark:text-slate-400 dark:hover:text-slate-200'
          "
          @click="showRaw = !showRaw"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          {{ showRaw ? "Decoded" : "Raw Hex" }}
        </button>
        <div v-if="contextJson" class="relative group">
          <CopyButton :text="contextJson" />
          <span class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">neo-cli JSON</span>
        </div>
        <CopyButton v-if="rawHex" :text="rawHex" />
      </div>
    </div>

    <pre
      v-if="showRaw"
      data-testid="unsigned-tx-raw"
      class="max-h-80 overflow-auto rounded-xl border border-line-soft bg-surface p-4 font-mono text-[11px] break-all whitespace-pre-wrap text-high shadow-inner dark:border-white/10 dark:bg-[#020617] dark:text-slate-400"
    >{{ rawHex }}</pre>

    <div
      v-else-if="decodedTx"
      data-testid="unsigned-tx-shell"
      class="space-y-4 rounded-xl border p-4 shadow-inner border-line-soft bg-surface-muted/60 dark:border-white/10 dark:bg-[#020617]"
    >
      <div class="grid gap-4 xl:grid-cols-[1.25fr,1fr]">
        <section class="rounded-xl border border-line-soft bg-surface p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div class="mb-3 flex items-center justify-between">
            <h5 class="text-xs font-black uppercase tracking-[0.18em] text-low dark:text-slate-400">Transaction Envelope</h5>
            <span class="rounded-full border border-line-soft bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-low dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
              {{ decodedTx.totalLength }} Bytes
            </span>
          </div>
          <dl class="grid gap-3 sm:grid-cols-2">
            <div v-for="item in summaryRows" :key="item.label" class="rounded-lg border border-line-soft bg-surface-muted/60 p-3 dark:border-white/5 dark:bg-black/20">
              <dt class="text-[10px] font-bold uppercase tracking-[0.16em] text-low dark:text-slate-500">{{ item.label }}</dt>
              <dd class="mt-1 break-all font-mono text-sm text-high dark:text-slate-200">{{ item.value }}</dd>
              <p
                v-if="item.label === 'Valid Until Block' && expiryCountdown"
                data-testid="unsigned-tx-expiry-countdown"
                class="mt-2 text-xs font-medium text-mid dark:text-slate-400"
              >
                {{ expiryCountdown }}
              </p>
            </div>
          </dl>
        </section>

        <section class="rounded-xl border border-line-soft bg-surface p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div class="mb-3 flex items-center justify-between">
            <h5 class="text-xs font-black uppercase tracking-[0.18em] text-low dark:text-slate-400">Fee Summary</h5>
            <span class="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              Fixed8
            </span>
          </div>
          <dl class="space-y-3">
            <div v-for="item in feeRows" :key="item.label" class="rounded-lg border border-line-soft bg-surface-muted/60 p-3 dark:border-white/5 dark:bg-black/20">
              <dt class="text-[10px] font-bold uppercase tracking-[0.16em] text-low dark:text-slate-500">{{ item.label }}</dt>
              <dd class="mt-1 text-sm text-high dark:text-slate-200">
                <span class="font-mono">{{ item.display }}</span>
                <span class="ml-2 text-xs text-low dark:text-slate-500">({{ item.raw }})</span>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section class="rounded-xl border border-line-soft bg-surface p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div class="mb-3 flex items-center justify-between">
          <h5 class="text-xs font-black uppercase tracking-[0.18em] text-low dark:text-slate-400">Signers</h5>
          <span class="rounded-full border border-line-soft bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-low dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
            {{ decodedTx.signersCount }}
          </span>
        </div>
        <div class="space-y-3">
          <div
            v-for="signer in decodedTx.signers"
            :key="`${signer.index}-${signer.accountScriptHash}`"
            class="rounded-xl border border-line-soft bg-surface-muted/60 p-4 dark:border-white/5 dark:bg-black/20"
          >
            <div class="mb-3 flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-high dark:text-slate-100">Signer {{ signer.index }}</div>
              <span class="rounded-full border border-primary-500/20 bg-primary-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-300">
                {{ signer.scopeLabels.join(" | ") }}
              </span>
            </div>
            <dl class="grid gap-3 lg:grid-cols-2">
              <div class="rounded-lg border border-line-soft bg-surface p-3 dark:border-white/5 dark:bg-[#020617]">
                <dt class="text-[10px] font-bold uppercase tracking-[0.16em] text-low dark:text-slate-500">Signer Address</dt>
                <dd class="mt-1 break-all font-mono text-xs text-high dark:text-slate-200">{{ signer.address || "Unavailable" }}</dd>
              </div>
              <div class="rounded-lg border border-line-soft bg-surface p-3 dark:border-white/5 dark:bg-[#020617]">
                <dt class="text-[10px] font-bold uppercase tracking-[0.16em] text-low dark:text-slate-500">Script Hash</dt>
                <dd class="mt-1 break-all font-mono text-xs text-high dark:text-slate-200">{{ signer.accountScriptHash || "Unavailable" }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section v-if="decodedTx.attributesCount > 0" class="rounded-xl border border-line-soft bg-surface p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div class="mb-3 flex items-center justify-between">
          <h5 class="text-xs font-black uppercase tracking-[0.18em] text-low dark:text-slate-400">Attributes</h5>
          <span class="rounded-full border border-line-soft bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-low dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
            {{ decodedTx.attributesCount }}
          </span>
        </div>
        <div class="space-y-3">
          <div v-for="attribute in decodedTx.attributes" :key="attribute.index" class="rounded-xl border border-line-soft bg-surface-muted/60 p-3 dark:border-white/5 dark:bg-black/20">
            <div class="text-xs font-semibold text-high dark:text-slate-100">{{ attribute.type }}</div>
            <div class="mt-2 break-all font-mono text-[11px] text-mid dark:text-slate-400">{{ attribute.raw }}</div>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-line-soft bg-surface p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h5 class="text-xs font-black uppercase tracking-[0.18em] text-low dark:text-slate-400">Embedded Execution Script</h5>
            <p class="mt-1 text-xs text-mid dark:text-slate-500">The executable contract call payload carried inside the unsigned transaction.</p>
          </div>
          <span class="rounded-full border border-line-soft bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-low dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
            {{ decodedTx.scriptLength }} Bytes
          </span>
        </div>
        <ScriptViewer :script="decodedTx.scriptBase64" label="Execution Script" />
      </section>
    </div>

    <div
      v-else
      class="rounded-xl border border-dashed border-line-soft bg-surface p-4 text-sm text-mid dark:border-white/10 dark:bg-[#020617] dark:text-slate-400"
    >
      Unable to decode this unsigned transaction payload.
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { formatGas } from "@/utils/explorerFormat";
import CopyButton from "@/components/common/CopyButton.vue";
import ScriptViewer from "@/components/trace/ScriptViewer.vue";
import { decodeUnsignedTransaction } from "@/utils/unsignedTransaction";
import { describeGovernanceTxExpiry } from "@/utils/governanceTiming";

const props = defineProps({
  transactionHex: { type: String, default: "" },
  contextJson: { type: String, default: "" },
  label: { type: String, default: "Unsigned Transaction" },
  description: { type: String, default: "" },
  currentBlockHeight: { type: Number, default: null },
  millisecondsPerBlock: { type: Number, default: null },
});

const showRaw = ref(false);

const decodedTx = computed(() => decodeUnsignedTransaction(props.transactionHex));
const rawHex = computed(() => decodedTx.value?.rawHex || String(props.transactionHex || "").trim().replace(/^0x/i, ""));

// Compute authoritative tx hash using neon-js (the @r3e/neo-js-sdk decoder produces a different hash)
const neonJsTxHash = computed(() => {
  if (!props.transactionHex) return "";
  try {
    const neonJs = window.Neon;
    if (!neonJs?.tx?.Transaction?.deserialize) return "";
    const tx = neonJs.tx.Transaction.deserialize(props.transactionHex);
    const hash = typeof tx.hash === "function" ? tx.hash() : tx.hash;
    const normalized = String(hash).replace(/^0x/i, "").trim();
    return normalized.length === 64 ? normalized : "";
  } catch {
    return "";
  }
});
const expiryCountdown = computed(() =>
  describeGovernanceTxExpiry({
    validUntilBlock: decodedTx.value?.validUntilBlock,
    currentBlockHeight: props.currentBlockHeight,
    msPerBlock: props.millisecondsPerBlock,
  }),
);

const summaryRows = computed(() => {
  if (!decodedTx.value) return [];

  return [
    { label: "Version", value: String(decodedTx.value.version) },
    { label: "Nonce", value: formatInteger(decodedTx.value.nonce) },
    { label: "Valid Until Block", value: formatInteger(decodedTx.value.validUntilBlock) },
    { label: "Signers", value: String(decodedTx.value.signersCount) },
    { label: "Attributes", value: String(decodedTx.value.attributesCount) },
    { label: "Transaction Hash", value: neonJsTxHash.value || decodedTx.value.hash || "Unavailable" },
  ];
});

const feeRows = computed(() => {
  if (!decodedTx.value) return [];

  return [
    { label: "System Fee", raw: decodedTx.value.systemFee, display: `${formatGas(decodedTx.value.systemFee)} GAS` },
    { label: "Network Fee", raw: decodedTx.value.networkFee, display: `${formatGas(decodedTx.value.networkFee)} GAS` },
    { label: "Total Fee", raw: decodedTx.value.totalFee, display: `${formatGas(decodedTx.value.totalFee)} GAS` },
  ];
});

function formatInteger(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value ?? "0");
}
</script>
