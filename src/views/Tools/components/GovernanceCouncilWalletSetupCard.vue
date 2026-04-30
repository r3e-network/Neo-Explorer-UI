<template>
  <div
    class="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/70"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-[10px] font-black uppercase tracking-[0.2em] text-low mb-2">
          {{ $t('tools.governance.councilWalletSetupEyebrow') }}
        </div>
        <h3 class="text-base font-black tracking-tight text-high">{{ $t('tools.governance.councilWalletSetupTitle') }}</h3>
        <p class="mt-2 text-sm text-mid leading-relaxed">
          {{ $t('tools.governance.councilWalletSetupBody') }}
        </p>
      </div>
      <button
        type="button"
        class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line-soft bg-surface text-mid transition-colors hover:bg-surface-muted hover:text-high"
        @click="showDetails = !showDetails"
        :aria-expanded="showDetails ? 'true' : 'false'"
        :aria-label="$t('tools.governance.councilWalletSetupToggleAria')"
      >
        <svg class="h-4 w-4 transition-transform" :class="showDetails ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
        <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">{{ $t('tools.governance.committeeMultisigLabel') }}</div>
        <div class="mt-2 font-mono text-[11px] break-all text-high">
          {{ committeeMultiSig?.address || $t('tools.governance.walletSetupLoading') }}
        </div>
      </div>
      <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
        <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">{{ $t('tools.governance.walletSetupThresholdLabel') }}</div>
        <div class="mt-2 text-xl font-black text-high">{{ threshold || "?" }}</div>
      </div>
      <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
        <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">{{ $t('tools.governance.connectedWalletLabel') }}</div>
        <div class="mt-2 font-mono text-[11px] break-all text-high">
          {{ connectedAccount || $t('tools.governance.walletSetupConnectInHeader') }}
        </div>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <CopyButton :text="setupJson" size="md" :label="$t('tools.governance.copySetupJson')" />
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-line-soft bg-surface px-4 py-2.5 text-sm font-semibold text-high transition-colors hover:bg-surface-muted"
        @click="downloadSetupJson"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v12m0 0l4-4m-4 4l-4-4m-5 8h18" />
        </svg>
        {{ $t('tools.governance.downloadSetupJson') }}
      </button>
      <CopyButton :text="neolineChecklist" size="md" :label="$t('tools.governance.copyNeoLineChecklist')" />
    </div>

    <div v-if="showDetails" class="mt-5 space-y-4 border-t border-line-soft pt-5">
      <div class="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div class="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          {{ $t('tools.governance.neoLineChecklistTitle') }}
        </div>
        <ol class="mt-3 list-decimal space-y-2 pl-4 text-sm text-mid">
          <li>{{ $t('tools.governance.checklistStep1') }}</li>
          <li>{{ $t('tools.governance.checklistStep2') }}</li>
          <li>{{ $t('tools.governance.checklistStep3', { threshold }) }}</li>
          <li>{{ $t('tools.governance.checklistStep4', { count: committeePubkeys.length }) }}</li>
          <li>{{ $t('tools.governance.checklistStep5') }}</li>
          <li>{{ $t('tools.governance.checklistStep6') }}</li>
        </ol>
      </div>

      <div class="rounded-2xl border border-line-soft bg-surface-muted/60 p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-low">{{ $t('tools.governance.committeePublicKeys') }}</div>
            <p class="mt-1 text-xs text-mid">{{ $t('tools.governance.committeePublicKeysHint') }}</p>
          </div>
          <CopyButton :text="committeePubkeys.join('\n')" size="sm" />
        </div>
        <div class="mt-3 max-h-40 space-y-2 overflow-y-auto custom-scrollbar">
          <code
            v-for="(pubkey, index) in committeePubkeys"
            :key="`${pubkey}-${index}`"
            class="block break-all rounded-xl bg-white/90 px-3 py-2 font-mono text-[11px] text-high dark:bg-slate-950/70"
          >{{ pubkey }}</code>
        </div>
      </div>

      <div class="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
        <div class="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
          {{ $t('tools.governance.fallbackHeading') }}
        </div>
        <p class="mt-2 text-sm text-mid leading-relaxed">
          {{ $t('tools.governance.fallbackBody') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import CopyButton from "@/components/common/CopyButton.vue";

const props = defineProps({
  committeeMultiSig: { type: Object, default: null },
  committeePubkeys: { type: Array, default: () => [] },
  threshold: { type: Number, default: 0 },
  committeeSize: { type: Number, default: 0 },
  connectedAccount: { type: String, default: "" },
  activeNetworkLabel: { type: String, default: "" },
});

const showDetails = ref(false);

const setupPayload = computed(() => ({
  type: "neo-council-wallet-kit",
  version: 1,
  network: props.activeNetworkLabel || "Mainnet",
  committeeMultisigAddress: props.committeeMultiSig?.address || "",
  threshold: props.threshold || 0,
  committeeSize: props.committeeSize || props.committeePubkeys.length || 0,
  committeePubkeys: Array.isArray(props.committeePubkeys) ? props.committeePubkeys : [],
  connectedAccount: props.connectedAccount || "",
  generatedAt: new Date().toISOString(),
}));

const setupJson = computed(() => JSON.stringify(setupPayload.value, null, 2));

const neolineChecklist = computed(() =>
  [
    "NEXO-style NeoLine council wallet setup",
    `Network: ${props.activeNetworkLabel || "Mainnet"}`,
    `Committee multisig: ${props.committeeMultiSig?.address || "Unavailable"}`,
    `Threshold: ${props.threshold || 0}`,
    "",
    "1. Open NeoLine.",
    "2. Add Wallet -> Multi-Signature.",
    `3. Set threshold to ${props.threshold || 0}.`,
    "4. Paste the committee public keys.",
    "5. Save the multisig wallet.",
    "6. Switch NeoLine to that wallet before signing proposals.",
  ].join("\n"),
);

function downloadSetupJson() {
  const filename = `council-wallet-kit-${String(props.activeNetworkLabel || "mainnet").toLowerCase()}.json`;
  const blob = new Blob([setupJson.value], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
</script>
