<template>
  <div class="agent-proposal rounded-lg border border-line-soft bg-surface-glass p-3">
    <!-- Header: chain badge + label -->
    <div class="mb-2 flex items-center justify-between gap-2">
      <span
        class="detail-chip font-semibold"
        :class="isNeox ? 'agent-chip-neox' : 'agent-chip-n3'"
      >
        <span class="inline-block h-1.5 w-1.5 rounded-full" :style="{ background: chainDotColor }" aria-hidden="true"></span>
        {{ isNeox ? tf("agent.chain.neox", "Neo X") : tf("agent.chain.n3", "Neo N3") }}
      </span>
      <span class="text-[11px] font-semibold uppercase tracking-wide text-low">
        {{ tf("agent.proposal.title", "Proposed transaction") }}
      </span>
    </div>

    <!-- Summary -->
    <p v-if="proposal.summary" class="mb-3 text-sm leading-relaxed text-high">
      {{ proposal.summary }}
    </p>

    <!-- Decoded key/value list -->
    <dl class="mb-3 flex flex-col gap-1.5 text-xs">
      <template v-if="isNeox">
        <div class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.from", "From") }}</dt>
          <dd class="agent-kv-value">
            <XHashLink v-if="neox.from" type="address" :hash="neox.from" copyable />
            <span v-else class="text-mid">--</span>
          </dd>
        </div>
        <div class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.to", "To") }}</dt>
          <dd class="agent-kv-value">
            <XHashLink v-if="neox.to" type="address" :hash="neox.to" copyable />
            <span v-else class="text-mid">--</span>
          </dd>
        </div>
        <div class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.value", "Value") }}</dt>
          <dd class="agent-kv-value font-hash">{{ neox.value }} GAS</dd>
        </div>
        <div v-if="neox.gas" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.gas", "Gas limit") }}</dt>
          <dd class="agent-kv-value font-hash">{{ neox.gas }}</dd>
        </div>
        <div v-if="neox.selector" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.selector", "Function selector") }}</dt>
          <dd class="agent-kv-value font-hash break-all">{{ neox.selector }}</dd>
        </div>
      </template>

      <template v-else>
        <div class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.contract", "Contract") }}</dt>
          <dd class="agent-kv-value">
            <span class="text-high">{{ n3.contractName }}</span>
            <span class="ml-1 font-hash break-all text-low">{{ shortHash(proposal.scriptHash) }}</span>
            <CopyButton :text="proposal.scriptHash || ''" size="xs" />
          </dd>
        </div>
        <div v-if="proposal.operation" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.operation", "Operation") }}</dt>
          <dd class="agent-kv-value"><span class="badge-soft font-semibold">{{ proposal.operation }}</span></dd>
        </div>
        <div v-if="n3.from" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.from", "From") }}</dt>
          <dd class="agent-kv-value">
            <span class="font-hash break-all text-high">{{ n3.from }}</span>
            <CopyButton :text="n3.from" size="xs" />
          </dd>
        </div>
        <div v-if="n3.to" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.to", "To") }}</dt>
          <dd class="agent-kv-value">
            <span v-if="n3.toName" class="text-high">{{ n3.toName }}</span>
            <span class="font-hash break-all" :class="n3.toName ? 'text-low ml-1' : 'text-high'">{{ n3.to }}</span>
            <CopyButton :text="n3.to" size="xs" />
          </dd>
        </div>
        <div v-if="n3.amount" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.amount", "Amount") }}</dt>
          <dd class="agent-kv-value font-hash">{{ n3.amount }}<span v-if="n3.symbol" class="ml-1 text-mid">{{ n3.symbol }}</span></dd>
        </div>
        <div v-if="n3.scope" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.signerScope", "Signer scope") }}</dt>
          <dd class="agent-kv-value"><span class="badge-soft font-semibold">{{ n3.scope }}</span></dd>
        </div>
      </template>
    </dl>

    <!-- Guardrail flags -->
    <ul v-if="flags.length" class="mb-3 flex flex-col gap-1.5">
      <li
        v-for="flag in flags"
        :key="flag.code"
        class="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs"
        :class="flagClass(flag.level)"
      >
        <svg class="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path v-if="flag.level === 'info'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <span>{{ flagLabel(flag) }}</span>
      </li>
    </ul>

    <!-- Sign action -->
    <div v-if="signState === 'success'" class="flex items-center gap-2 rounded-md bg-status-success-bg px-2.5 py-2 text-xs text-status-success">
      <svg class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <span class="font-semibold">{{ tf("agent.proposal.success", "Submitted") }}</span>
      <router-link
        v-if="txLink"
        :to="txLink.to"
        class="etherscan-link font-hash truncate"
        :title="txLink.hash"
      >{{ shortHash(txLink.hash) }}</router-link>
    </div>

    <template v-else>
      <button
        type="button"
        class="btn-primary w-full justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
        :disabled="signState === 'signing'"
        @click="onSign"
      >
        <svg v-if="signState === 'signing'" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span>{{ signState === "signing" ? tf("agent.proposal.signing", "Waiting for your wallet…") : tf("agent.proposal.sign", "Review & sign in your wallet") }}</span>
      </button>

      <p
        v-if="signState === 'error'"
        class="mt-2 flex items-center justify-between gap-2 text-xs"
        :class="signRejected ? 'text-mid' : 'text-status-error'"
      >
        <span>{{ signRejected ? tf("agent.proposal.cancelled", "Signing cancelled") : tf("agent.proposal.failed", "Signing failed") }}</span>
        <button type="button" class="btn-outline px-2.5 py-1 text-xs" @click="onSign">
          {{ tf("agent.proposal.retry", "Try again") }}
        </button>
      </p>

      <p class="mt-2 text-[11px] leading-snug text-low">
        {{ tf("agent.proposal.neverSigns", "The AI never signs — this is signed by your wallet.") }}
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import CopyButton from "@/components/common/CopyButton.vue";
import XHashLink from "@/components/common/XHashLink.vue";
import { analyzeProposal } from "@/utils/txGuardrails";
import { signProposal } from "@/utils/proposalSigner";
import { parseCalldata } from "@/utils/evmDisasm";
import { formatGas, formatUnits, shortHash } from "@/utils/neoxFormat";
import { getContractDisplayName } from "@/utils/explorerFormat";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import { getKnownAddressName } from "@/constants/knownAddresses";
import { getNeoxNet } from "@/utils/neoxEnv";

const props = defineProps({
  proposal: { type: Object, required: true },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const isNeox = computed(
  () => props.proposal.chain === "neox" || props.proposal.kind === "eth_tx",
);

const chainDotColor = computed(() => (isNeox.value ? "#7c5cff" : "#00e599"));

// Net used both for guardrails and Neo X identity resolution.
const net = computed(() => props.proposal.network || getNeoxNet());

const flags = computed(() => analyzeProposal(props.proposal, { net: net.value }));

function flagClass(level) {
  if (level === "danger") return "bg-status-error-bg text-status-error";
  if (level === "warn") return "bg-status-warning-bg text-status-warning";
  return "border border-line-soft text-mid";
}

function flagLabel(flag) {
  return tf(`agent.flag.${flag.code}`, flag.message);
}

function hexToDecimal(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    if (/^0x[0-9a-f]+$/i.test(raw)) return BigInt(raw).toLocaleString("en-US");
    if (/^[0-9]+$/.test(raw)) return BigInt(raw).toLocaleString("en-US");
  } catch {
    return "";
  }
  return "";
}

const neox = computed(() => {
  const tx = props.proposal.tx || {};
  const data = String(tx.data ?? "");
  const hasData = data !== "" && data.toLowerCase() !== "0x";
  const selector = hasData ? parseCalldata(data).selector : null;
  return {
    from: tx.from || "",
    to: tx.to || "",
    value: formatGas(tx.value || "0"),
    gas: hexToDecimal(tx.gas),
    selector,
  };
});

const n3 = computed(() => {
  const p = props.proposal;
  const args = Array.isArray(p.args) ? p.args : [];
  const isTransfer = p.operation === "transfer";
  const from = args[0]?.type === "Hash160" ? args[0].value : p.from || "";
  const to = isTransfer && args[1]?.type === "Hash160" ? args[1].value : "";
  const amountRaw = isTransfer && args[2]?.type === "Integer" ? args[2].value : "";
  const meta = KNOWN_CONTRACTS[String(p.scriptHash || "").toLowerCase()] || null;
  const decimals = Number.isInteger(meta?.decimals) ? meta.decimals : null;
  let amount = "";
  if (amountRaw !== "" && amountRaw !== null && amountRaw !== undefined) {
    amount = decimals !== null ? formatUnits(amountRaw, decimals) : String(amountRaw);
  }
  return {
    contractName: getContractDisplayName(p.scriptHash),
    from,
    to,
    toName: to ? getKnownAddressName(to) || "" : "",
    amount,
    symbol: meta?.symbol || "",
    scope: Array.isArray(p.signers) && p.signers[0]?.scopes ? p.signers[0].scopes : "",
  };
});

const signState = ref("idle"); // idle | signing | success | error
const signResult = ref(null);
const signRejected = ref(false);

const txLink = computed(() => {
  const result = signResult.value;
  if (!result) return null;
  if (result.chain === "neox") {
    return result.txHash ? { hash: result.txHash, to: `/x/tx/${result.txHash}` } : null;
  }
  return result.txid ? { hash: result.txid, to: `/transaction/${result.txid}` } : null;
});

async function onSign() {
  if (signState.value === "signing") return;
  signState.value = "signing";
  signRejected.value = false;
  try {
    signResult.value = await signProposal(props.proposal);
    signState.value = "success";
  } catch (error) {
    signRejected.value = Boolean(error?.userRejected);
    signState.value = "error";
  }
}
</script>

<style scoped>
.agent-kv {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}
.agent-kv-label {
  flex: 0 0 5.5rem;
  color: var(--text-low);
}
.agent-kv-value {
  min-width: 0;
  flex: 1 1 auto;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  color: var(--text-high);
  word-break: break-word;
}
.agent-chip-n3 {
  border-color: color-mix(in srgb, #00e599 40%, transparent);
}
.agent-chip-neox {
  border-color: color-mix(in srgb, #7c5cff 45%, transparent);
}
</style>
