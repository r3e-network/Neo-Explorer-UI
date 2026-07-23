<template>
  <div class="agent-proposal rounded-lg border border-line-soft bg-surface-glass p-3">
    <!-- Header: chain badge + label -->
    <div class="mb-2 flex items-center justify-between gap-2">
      <span
        class="detail-chip agent-chain-chip font-semibold"
        :class="isNeox ? 'agent-chip-neox' : 'agent-chip-n3'"
      >
        <span
          class="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
          :style="{ background: chainDotColor }"
          aria-hidden="true"
        ></span>
        {{ isNeox ? tf("agent.chain.neox", "Neo X") : tf("agent.chain.n3", "Neo N3") }}
      </span>
      <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">
        {{ tf("agent.proposal.title", "Proposed transaction") }}
      </span>
    </div>

    <!--
      A destructive proposal leads with its danger flag: the model-written summary
      is the least trustworthy line on the card, so it must never be what the user
      reads first when the deterministic analyzer found something irreversible.
    -->
    <ul v-if="dangerFlags.length" class="agent-flag-list mb-2" :aria-label="warningsLabel">
      <li
        v-for="flag in dangerFlags"
        :key="flag.code"
        class="agent-flag"
        :class="flagClass(flag.level)"
      >
        <svg class="agent-flag-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="flagIconPath(flag.level)" />
        </svg>
        <span>{{ flagLabel(flag) }}</span>
      </li>
    </ul>

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
            <template v-if="neox.from">
              <XHashLink type="address" :hash="neox.from" class="min-w-0" />
              <CopyButton :text="neox.from" size="sm" class="agent-copy flex-shrink-0" />
            </template>
            <span v-else class="text-mid">--</span>
          </dd>
        </div>
        <div class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.to", "To") }}</dt>
          <dd class="agent-kv-value">
            <template v-if="neox.to">
              <XHashLink type="address" :hash="neox.to" class="min-w-0" />
              <CopyButton :text="neox.to" size="sm" class="agent-copy flex-shrink-0" />
            </template>
            <span v-else class="text-mid">--</span>
          </dd>
        </div>
        <!-- A contract call with no native value attached has no Value row to show. -->
        <div v-if="showNeoxValue" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.value", "Value") }}</dt>
          <dd class="agent-kv-value font-hash">
            {{ neox.value }}<span class="ml-1 text-mid">{{ valueUnit }}</span>
          </dd>
        </div>
        <div v-if="neox.gas" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.gas", "Gas limit") }}</dt>
          <dd class="agent-kv-value font-hash">{{ neox.gas }}</dd>
        </div>
        <div v-if="neox.selector" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.selector", "Function selector") }}</dt>
          <dd class="agent-kv-value">
            <span class="min-w-0 truncate font-hash" :title="neox.selector">{{ neox.selector }}</span>
            <CopyButton :text="neox.selector" size="sm" class="agent-copy flex-shrink-0" />
          </dd>
        </div>
      </template>

      <template v-else>
        <div class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.contract", "Contract") }}</dt>
          <dd class="agent-kv-value">
            <span class="flex-shrink-0 text-high">{{ n3.contractName }}</span>
            <router-link
              v-if="n3.contractLink"
              :to="n3.contractLink"
              class="etherscan-link min-w-0 truncate font-hash"
              :title="n3.scriptHash"
            >{{ shortHash(n3.scriptHash) }}</router-link>
            <span v-else class="min-w-0 truncate font-hash text-mid" :title="n3.scriptHash">{{ shortHash(n3.scriptHash) }}</span>
            <CopyButton :text="n3.scriptHash" size="sm" class="agent-copy flex-shrink-0" />
          </dd>
        </div>
        <div v-if="proposal.operation" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.operation", "Operation") }}</dt>
          <dd class="agent-kv-value"><span class="badge-soft font-semibold">{{ proposal.operation }}</span></dd>
        </div>
        <div v-if="n3.from" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.from", "From") }}</dt>
          <dd class="agent-kv-value">
            <router-link
              v-if="n3.fromLink"
              :to="n3.fromLink"
              class="etherscan-link min-w-0 truncate font-hash"
              :title="n3.from"
            >{{ shortHash(n3.from) }}</router-link>
            <span v-else class="min-w-0 truncate font-hash text-high" :title="n3.from">{{ shortHash(n3.from) }}</span>
            <CopyButton :text="n3.from" size="sm" class="agent-copy flex-shrink-0" />
          </dd>
        </div>
        <div v-if="n3.to" class="agent-kv">
          <dt class="agent-kv-label">{{ tf("agent.proposal.to", "To") }}</dt>
          <dd class="agent-kv-value">
            <span v-if="n3.toName" class="flex-shrink-0 text-high">{{ n3.toName }}</span>
            <router-link
              v-if="n3.toLink"
              :to="n3.toLink"
              class="etherscan-link min-w-0 truncate font-hash"
              :title="n3.to"
            >{{ shortHash(n3.to) }}</router-link>
            <span v-else class="min-w-0 truncate font-hash" :class="n3.toName ? 'text-mid' : 'text-high'" :title="n3.to">{{ shortHash(n3.to) }}</span>
            <CopyButton :text="n3.to" size="sm" class="agent-copy flex-shrink-0" />
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

    <!-- Remaining guardrail flags (warn boxed, info demoted to muted inline text) -->
    <ul v-if="restFlags.length" class="agent-flag-list mb-3" :aria-label="warningsLabel">
      <li
        v-for="flag in restFlags"
        :key="flag.code"
        class="agent-flag"
        :class="flagClass(flag.level)"
      >
        <svg class="agent-flag-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="flagIconPath(flag.level)" />
        </svg>
        <span>{{ flagLabel(flag) }}</span>
      </li>
    </ul>

    <!-- Receipt: the wallet accepted and broadcast the transaction -->
    <div
      v-if="isSubmitted"
      class="agent-receipt"
      :class="signState === 'success' ? 'agent-receipt-done' : 'agent-receipt-pending'"
    >
      <svg
        v-if="signState === 'success'"
        class="h-4 w-4 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <svg v-else class="h-4 w-4 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      <span class="flex-shrink-0 font-semibold">{{ receiptLabel }}</span>
      <template v-if="txLink">
        <router-link
          :to="txLink.to"
          class="etherscan-link min-w-0 truncate font-hash"
          :title="txLink.hash"
          :aria-label="tf('agent.proposal.viewTx', 'View transaction')"
        >{{ shortHash(txLink.hash) }}</router-link>
        <CopyButton
          :text="txLink.hash"
          size="sm"
          class="agent-copy flex-shrink-0"
          :aria-label="tf('agent.proposal.copyTx', 'Copy transaction hash')"
          :title="tf('agent.proposal.copyTx', 'Copy transaction hash')"
        />
      </template>
    </div>

    <template v-else>
      <!--
        Danger gate: an irreversible proposal needs a deliberate, separate act of
        consent before the wallet prompt can be reached at all.
      -->
      <label v-if="hasDanger" class="agent-danger-ack" :for="dangerAckId">
        <input :id="dangerAckId" v-model="dangerAck" type="checkbox" class="agent-danger-box" />
        <span>{{ tf("agent.proposal.dangerAck", "I understand this grants unlimited spending.") }}</span>
      </label>

      <button
        type="button"
        class="btn-primary w-full justify-center gap-2 disabled:cursor-not-allowed"
        :class="hasDanger ? 'agent-sign-danger' : ''"
        :disabled="signDisabled"
        @click="onSign"
      >
        <svg v-if="signState === 'signing'" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span>{{ signLabel }}</span>
      </button>

      <div v-if="signState === 'error'" class="agent-sign-error mt-2 text-xs" :class="signErrorTone">
        <div class="flex items-start justify-between gap-2">
          <span class="min-w-0 font-semibold">{{ signErrorHeadline }}</span>
          <button
            v-if="signErrorRetryable"
            type="button"
            class="btn-outline flex-shrink-0 px-2.5 py-1 text-xs"
            @click="onSign"
          >
            {{ tf("agent.proposal.retry", "Try again") }}
          </button>
        </div>
        <p v-if="signErrorHelp" class="mt-1 text-mid">{{ signErrorHelp }}</p>
        <details v-if="signErrorDetail" class="mt-1">
          <summary class="agent-error-summary text-mid">{{ tf("agent.proposal.errorDetails", "Error details") }}</summary>
          <p class="mt-1 break-all font-hash text-mid">{{ signErrorDetail }}</p>
        </details>
      </div>
    </template>

    <!--
      Non-custodial guarantee. Rendered in every state on purpose: it is the one
      line that must never blink out from under the user, and keeping it outside
      the state branches also stops the card from jumping height when it signs.
    -->
    <p class="agent-footnote">
      {{ tf("agent.proposal.neverSigns", "The AI never signs — this is signed by your wallet.") }}
    </p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
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

// A Neo N3 address is base58, always 34 chars, always leading "N".
const N3_ADDRESS_RE = /^N[A-Za-z0-9]{33}$/;
// A Neo N3 script hash is 20 bytes of hex.
const N3_SCRIPT_HASH_RE = /^0x[0-9a-fA-F]{40}$/;

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

const chainDotColor = computed(() => (isNeox.value ? "var(--chain-neox)" : "var(--chain-n3)"));

const valueUnit = computed(() => tf("agent.proposal.valueUnit", "GAS"));

const warningsLabel = computed(() => tf("agent.proposal.warningsLabel", "Transaction warnings"));

// Net used both for guardrails and Neo X identity resolution.
const net = computed(() => props.proposal.network || getNeoxNet());

const flags = computed(() => analyzeProposal(props.proposal, { net: net.value }));

const dangerFlags = computed(() => flags.value.filter((flag) => flag.level === "danger"));
const restFlags = computed(() => flags.value.filter((flag) => flag.level !== "danger"));
const hasDanger = computed(() => dangerFlags.value.length > 0);

function flagClass(level) {
  if (level === "danger") return "bg-status-error-bg text-status-error";
  if (level === "warn") return "bg-status-warning-bg text-status-warning";
  // `info` fires for nearly every unlabeled address; boxing it devalues the
  // levels that actually matter, so it reads as muted inline text.
  return "agent-flag-info text-mid";
}

function flagIconPath(level) {
  return level === "info"
    ? "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    : "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z";
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

const showNeoxValue = computed(() => Boolean(neox.value.value) && neox.value.value !== "0");

const n3 = computed(() => {
  const p = props.proposal;
  const args = Array.isArray(p.args) ? p.args : [];
  const isTransfer = p.operation === "transfer";
  const from = args[0]?.type === "Hash160" ? args[0].value : p.from || "";
  const to = isTransfer && args[1]?.type === "Hash160" ? args[1].value : "";
  const amountRaw = isTransfer && args[2]?.type === "Integer" ? args[2].value : "";
  const scriptHash = String(p.scriptHash || "");
  const meta = KNOWN_CONTRACTS[scriptHash.toLowerCase()] || null;
  const decimals = Number.isInteger(meta?.decimals) ? meta.decimals : null;
  let amount = "";
  if (amountRaw !== "" && amountRaw !== null && amountRaw !== undefined) {
    amount = decimals !== null ? formatUnits(amountRaw, decimals) : String(amountRaw);
  }
  return {
    contractName: getContractDisplayName(p.scriptHash),
    scriptHash,
    // In an explorer a wrong link is worse than no link: only shapes we can
    // positively identify get a route, everything else stays plain text.
    contractLink: N3_SCRIPT_HASH_RE.test(scriptHash) ? `/contract-info/${scriptHash}` : null,
    from,
    fromLink: N3_ADDRESS_RE.test(from) ? `/account-profile/${from}` : null,
    to,
    toLink: N3_ADDRESS_RE.test(to) ? `/account-profile/${to}` : null,
    toName: to ? getKnownAddressName(to) || "" : "",
    amount,
    symbol: meta?.symbol || "",
    scope: Array.isArray(p.signers) && p.signers[0]?.scopes ? p.signers[0].scopes : "",
  };
});

// idle | signing | pending | success | error
const signState = ref("idle");
const signResult = ref(null);
const signRejected = ref(false);
const signError = ref(null);
const dangerAck = ref(false);
const dangerAckId = `agent-danger-ack-${Math.random().toString(36).slice(2, 10)}`;

// A retried turn can reuse this component instance with a different proposal.
// Without this reset the card would show proposal A's signed receipt while
// describing proposal B — the worst possible lie for a signing surface.
watch(
  () => props.proposal,
  () => {
    signState.value = "idle";
    signResult.value = null;
    signRejected.value = false;
    signError.value = null;
    dangerAck.value = false;
  },
  { deep: false },
);

const isSubmitted = computed(() => signState.value === "pending" || signState.value === "success");

const receiptLabel = computed(() =>
  signState.value === "success"
    ? tf("agent.proposal.success", "Submitted")
    : tf("agent.proposal.pending", "Submitted — waiting for confirmation"),
);

const signDisabled = computed(() => {
  if (signState.value === "signing") return true;
  return hasDanger.value && !dangerAck.value;
});

const signLabel = computed(() => {
  if (signState.value === "signing") return tf("agent.proposal.signing", "Waiting for your wallet…");
  if (hasDanger.value) return tf("agent.proposal.signAnyway", "Sign anyway");
  return tf("agent.proposal.sign", "Review & sign in your wallet");
});

// ProposalSignerError carries a machine-readable `code`; user rejections are
// tagged `userRejected` by proposalSigner. Anything else is a real failure.
const signErrorKind = computed(() => {
  const error = signError.value;
  if (!error) return null;
  if (error.code === "no_provider") return "noWallet";
  if (error.code === "invalid_proposal") return "invalid";
  if (error.userRejected || signRejected.value) return "cancelled";
  return "failed";
});

const signErrorHeadline = computed(() => {
  switch (signErrorKind.value) {
    case "noWallet":
      return tf("agent.proposal.noWallet", "No wallet detected");
    case "invalid":
      return tf("agent.proposal.invalid", "This proposal is malformed and can't be signed.");
    case "cancelled":
      return tf("agent.proposal.cancelled", "Signing cancelled");
    default:
      return tf("agent.proposal.failed", "Signing failed");
  }
});

const signErrorHelp = computed(() =>
  signErrorKind.value === "noWallet"
    ? tf("agent.proposal.noWalletHelp", "Install or unlock a compatible wallet, then try again.")
    : "",
);

// Retrying without a wallet, or with a proposal the signer refuses to parse,
// can only fail again — offering the button would be a lie.
const signErrorRetryable = computed(
  () => signErrorKind.value !== "noWallet" && signErrorKind.value !== "invalid",
);

const signErrorDetail = computed(() => {
  if (signErrorKind.value !== "failed") return "";
  return String(signError.value?.message || "");
});

const signErrorTone = computed(() =>
  signErrorKind.value === "cancelled" ? "text-mid" : "text-status-error",
);

const txLink = computed(() => {
  const result = signResult.value;
  if (!result) return null;
  if (result.chain === "neox") {
    return result.txHash ? { hash: result.txHash, to: `/x/tx/${result.txHash}` } : null;
  }
  // `/transaction/:id` is a redirect to the paginated list, not a detail page.
  // The canonical N3 transaction detail route is `/transaction-info/:txhash`.
  return result.txid ? { hash: result.txid, to: `/transaction-info/${result.txid}` } : null;
});

async function onSign() {
  if (signState.value === "signing") return;
  // Belt and braces alongside the disabled attribute: the wallet must never be
  // reachable from a danger proposal that has not been acknowledged.
  if (hasDanger.value && !dangerAck.value) return;
  signState.value = "signing";
  signRejected.value = false;
  signError.value = null;
  try {
    signResult.value = await signProposal(props.proposal);
    // Deliberately `pending`, not `success`: the wallet broadcast it, but no
    // confirmation source is wired here, so claiming confirmation would be false.
    signState.value = "pending";
  } catch (error) {
    signError.value = error || null;
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
  flex: 0 0 6.5rem;
  color: var(--text-mid);
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

/* Below ~420px the label column steals more width than it explains. */
@media (max-width: 420px) {
  .agent-kv {
    flex-direction: column;
    gap: 0.125rem;
  }
  .agent-kv-label {
    flex: 0 0 auto;
  }
}

/* The chain chip is a label, not a control: `.detail-chip:hover` must not
   imply it is clickable, and the tint comes from the shared chain tokens. */
.agent-chip-n3,
.agent-chip-n3:hover {
  border-color: color-mix(in srgb, var(--chain-n3) 40%, transparent);
}
.agent-chip-neox,
.agent-chip-neox:hover {
  border-color: color-mix(in srgb, var(--chain-neox) 45%, transparent);
}

.agent-flag-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.agent-flag {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  border-radius: 0.375rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1.35;
  /* Every level carries the same border box so `info` no longer sits 2px taller. */
  border: 1px solid transparent;
}

.agent-flag-info {
  padding-left: 0;
  padding-right: 0;
}

.agent-flag-icon {
  margin-top: 0.125rem;
  height: 0.875rem;
  width: 0.875rem;
  flex-shrink: 0;
}

.agent-danger-ack {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
  min-height: 1.75rem;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--text-high);
  cursor: pointer;
}

.agent-danger-box {
  margin-top: 0.0625rem;
  height: 1rem;
  width: 1rem;
  flex-shrink: 0;
  accent-color: var(--status-error);
  cursor: pointer;
}

.agent-sign-danger,
.agent-sign-danger:disabled {
  background: var(--status-error);
  background-image: none;
}

.agent-sign-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--status-error) 88%, #000000 12%);
  background-image: none;
}

.agent-receipt {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  border-radius: 0.375rem;
  padding: 0.5rem 0.625rem;
  font-size: 0.75rem;
}

.agent-receipt-done {
  background: color-mix(in srgb, var(--status-success) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-success) 28%, transparent);
  color: var(--status-success);
}

.dark .agent-receipt-done {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--status-success) 16%, transparent) 0%,
    color-mix(in srgb, var(--status-success) 9%, transparent) 100%
  );
  border-color: color-mix(in srgb, var(--status-success) 34%, transparent);
}

.agent-receipt-pending {
  background: color-mix(in srgb, var(--surface-elevated) 92%, transparent);
  border: 1px solid var(--line-soft);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58);
  color: var(--text-mid);
}

.dark .agent-receipt-pending {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-elevated) 96%, rgba(255, 255, 255, 0.02)) 0%,
    color-mix(in srgb, var(--surface-elevated) 88%, rgba(9, 14, 24, 0.98)) 100%
  );
  border-color: color-mix(in srgb, var(--line-soft) 78%, rgba(255, 255, 255, 0.02));
  box-shadow: inset 0 1px 0 rgba(173, 193, 221, 0.05);
}

.agent-error-summary {
  cursor: pointer;
  list-style: revert;
}

/* CopyButton size="sm" is a 22px box; the scope id lands on the child's root
   element, so the card can lift its own copy targets to the 24px WCAG 2.2
   SC 2.5.8 floor without reaching into the shared component. */
.agent-copy {
  min-width: 1.5rem;
  min-height: 1.5rem;
}

.agent-footnote {
  margin-top: 0.5rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--text-mid);
}

@media (prefers-reduced-motion: reduce) {
  .agent-receipt,
  .agent-flag,
  .agent-chain-chip,
  .agent-sign-danger {
    transition: none;
  }
  .animate-spin {
    animation: none;
  }
}
</style>
