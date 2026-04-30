<template>
  <div class="unsigned-transaction-viewer text-high">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h4 data-testid="unsigned-tx-header-label" class="text-sm font-semibold text-high">{{ labelText }}</h4>
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
          {{ showRaw ? $t('unsignedTx.decodedToggle') : $t('unsignedTx.rawHexToggle') }}
        </button>
        <div v-if="contextJson" class="relative group">
          <CopyButton :text="contextJson" />
          <span class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">{{ $t('unsignedTx.neoCliJson') }}</span>
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
            <h5 class="text-xs font-black uppercase tracking-[0.18em] text-low dark:text-slate-400">{{ $t('unsignedTx.transactionEnvelope') }}</h5>
            <span class="rounded-full border border-line-soft bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-low dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
              {{ $t('unsignedTx.bytesSuffix', { count: decodedTx.totalLength }) }}
            </span>
          </div>
          <dl class="grid gap-3 sm:grid-cols-2">
            <div v-for="item in summaryRows" :key="item.label" class="rounded-lg border border-line-soft bg-surface-muted/60 p-3 dark:border-white/5 dark:bg-black/20">
              <dt class="text-[10px] font-bold uppercase tracking-[0.16em] text-low dark:text-slate-500">{{ item.label }}</dt>
              <dd class="mt-1 break-all font-mono text-sm text-high dark:text-slate-200">{{ item.value }}</dd>
              <p
                v-if="item.label === $t('unsignedTx.rowValidUntilBlock') && expiryCountdown"
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
            <h5 class="text-xs font-black uppercase tracking-[0.18em] text-low dark:text-slate-400">{{ $t('unsignedTx.feeSummary') }}</h5>
            <span class="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              {{ $t('unsignedTx.fixed8Badge') }}
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
          <h5 class="text-xs font-black uppercase tracking-[0.18em] text-low dark:text-slate-400">{{ $t('unsignedTx.signers') }}</h5>
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
              <div class="text-sm font-semibold text-high dark:text-slate-100">{{ $t('unsignedTx.signerLabel', { index: signer.index }) }}</div>
              <span class="rounded-full border border-primary-500/20 bg-primary-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-300">
                {{ signer.scopeLabels.join(" | ") }}
              </span>
            </div>
            <dl class="grid gap-3 lg:grid-cols-2">
              <div class="rounded-lg border border-line-soft bg-surface p-3 dark:border-white/5 dark:bg-[#020617]">
                <dt class="text-[10px] font-bold uppercase tracking-[0.16em] text-low dark:text-slate-500">{{ $t('unsignedTx.signerAddress') }}</dt>
                <dd class="mt-1 break-all font-mono text-xs text-high dark:text-slate-200">{{ signer.address || $t('unsignedTx.unavailable') }}</dd>
              </div>
              <div class="rounded-lg border border-line-soft bg-surface p-3 dark:border-white/5 dark:bg-[#020617]">
                <dt class="text-[10px] font-bold uppercase tracking-[0.16em] text-low dark:text-slate-500">{{ $t('unsignedTx.scriptHash') }}</dt>
                <dd class="mt-1 break-all font-mono text-xs text-high dark:text-slate-200">{{ signer.accountScriptHash || $t('unsignedTx.unavailable') }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section v-if="decodedTx.attributesCount > 0" class="rounded-xl border border-line-soft bg-surface p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div class="mb-3 flex items-center justify-between">
          <h5 class="text-xs font-black uppercase tracking-[0.18em] text-low dark:text-slate-400">{{ $t('unsignedTx.attributes') }}</h5>
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
            <h5 class="text-xs font-black uppercase tracking-[0.18em] text-low dark:text-slate-400">{{ $t('unsignedTx.embeddedExecutionScript') }}</h5>
            <p class="mt-1 text-xs text-mid dark:text-slate-500">{{ $t('unsignedTx.embeddedExecutionScriptDesc') }}</p>
          </div>
          <span class="rounded-full border border-line-soft bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-low dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
            {{ $t('unsignedTx.bytesSuffix', { count: decodedTx.scriptLength }) }}
          </span>
        </div>
        <ScriptViewer :script="decodedTx.scriptBase64" :label="$t('unsignedTx.executionScript')" />
      </section>
    </div>

    <div
      v-else
      class="rounded-xl border border-dashed border-line-soft bg-surface p-4 text-sm text-mid dark:border-white/10 dark:bg-[#020617] dark:text-slate-400"
    >
      {{ $t('unsignedTx.unableToDecode') }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { formatGas } from "@/utils/explorerFormat";
import CopyButton from "@/components/common/CopyButton.vue";
import ScriptViewer from "@/components/trace/ScriptViewer.vue";
import { decodeUnsignedTransaction } from "@/utils/unsignedTransaction";
import { describeGovernanceTxExpiry } from "@/utils/governanceTiming";

const { t } = useI18n();

const props = defineProps({
  transactionHex: { type: String, default: "" },
  contextJson: { type: String, default: "" },
  label: { type: String, default: "" },
  description: { type: String, default: "" },
  currentBlockHeight: { type: [Number, null], default: null },
  millisecondsPerBlock: { type: [Number, null], default: null },
});

const labelText = computed(() => props.label || t("unsignedTx.defaultLabel"));

const showRaw = ref(false);

const decodedTx = computed(() => decodeUnsignedTransaction(props.transactionHex));
const rawHex = computed(() => decodedTx.value?.rawHex || String(props.transactionHex || "").trim().replace(/^0x/i, ""));

// Compute authoritative tx hash using neon-js (the @cityofzion/neon-js decoder produces a different hash)
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
    { label: t("unsignedTx.rowVersion"), value: String(decodedTx.value.version) },
    { label: t("unsignedTx.rowNonce"), value: formatInteger(decodedTx.value.nonce) },
    { label: t("unsignedTx.rowValidUntilBlock"), value: formatInteger(decodedTx.value.validUntilBlock) },
    { label: t("unsignedTx.rowSigners"), value: String(decodedTx.value.signersCount) },
    { label: t("unsignedTx.rowAttributes"), value: String(decodedTx.value.attributesCount) },
    { label: t("unsignedTx.rowTransactionHash"), value: neonJsTxHash.value || decodedTx.value.hash || t("unsignedTx.unavailable") },
  ];
});

const feeRows = computed(() => {
  if (!decodedTx.value) return [];

  return [
    { label: t("unsignedTx.rowSystemFee"), raw: decodedTx.value.systemFee, display: `${formatGas(decodedTx.value.systemFee)} GAS` },
    { label: t("unsignedTx.rowNetworkFee"), raw: decodedTx.value.networkFee, display: `${formatGas(decodedTx.value.networkFee)} GAS` },
    { label: t("unsignedTx.rowTotalFee"), raw: decodedTx.value.totalFee, display: `${formatGas(decodedTx.value.totalFee)} GAS` },
  ];
});

function formatInteger(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value ?? "0");
}
</script>
