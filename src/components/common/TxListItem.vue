<template>
  <div class="list-row border-b px-4 py-3">
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <!-- Tx circle icon -->
        <div
          class="bg-icon-primary text-primary-500 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
        >
          Tx
        </div>
        <div class="min-w-0">
          <HashLink :hash="tx.hash" type="tx" :copyable="false" />
          <p class="mt-0.5 text-xs text-mid">
            {{ formatAge(tx.blocktime) }}
          </p>
        </div>
      </div>

      <!-- From -> To (hidden on mobile) -->
      <div class="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
        <div class="min-w-0 text-right">
          <p class="text-xs text-mid">From</p>
          <HashLink v-if="tx.sender" :hash="tx.sender" type="address" :copyable="false" :resolve-nns="false" />
        </div>
        <svg class="h-4 w-4 flex-shrink-0 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
        <div class="min-w-0 text-left">
          <p class="text-xs text-mid">To</p>
          <div v-if="recipient" class="flex items-center gap-1.5">
            <img v-if="recipient.hash === '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5'" :src="'/img/brand/neo.png'" class="w-3.5 h-3.5 rounded-full flex-shrink-0" />
            <img v-else-if="recipient.hash === '0xd2a4cff31913016155e38e474a2c06d08be276cf'" :src="'/img/brand/gas.png'" class="w-3.5 h-3.5 rounded-full flex-shrink-0" />
            <HashLink :hash="recipient.hash" :type="recipient.type" :copyable="false" />
          </div>
          <div v-else-if="transferSummary && transferSummary !== '—'" class="min-w-0">
            <span class="text-sm text-high font-medium truncate" :title="transferSummary">
              {{ transferSummary }}
            </span>
          </div>
          <div v-else-if="methodName" class="flex items-center gap-1.5 min-w-0">
            <img v-if="/neo/i.test(methodName)" :src="'/img/brand/neo.png'" alt="NEO" class="w-4 h-4 rounded-full flex-shrink-0" />
            <img v-if="/gas/i.test(methodName)" :src="'/img/brand/gas.png'" alt="GAS" class="w-4 h-4 rounded-full flex-shrink-0" />
            <span class="text-sm text-high font-medium truncate">{{ methodName }}</span>
          </div>
          <span v-else class="text-sm text-low">Contract Call</span>
        </div>
      </div>

      <!-- Status + Fee -->
      <div class="flex-shrink-0 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <span
            v-if="isComplex"
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style="background: var(--status-warning-bg); color: var(--status-warning)"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Complex
          </span>
          <span :style="statusStyle" class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
            {{ statusText }}
          </span>
        </div>
        <p class="mt-1 text-xs text-mid">{{ txFee }} GAS</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useNow } from "@vueuse/core";
import { formatAge as _formatAge, formatGas, getContractDisplayName } from "@/utils/explorerFormat";
import HashLink from "./HashLink.vue";
import { extractContractInvocation } from "@/utils/scriptDisassembler";
import { NATIVE_CONTRACTS } from "@/constants";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";

const props = defineProps({
  tx: { type: Object, default: () => ({}) },
  isComplex: { type: Boolean, default: false },
  transferSummary: { type: String, default: "" },
});

const now = useNow({ interval: 1000 });
const formatAge = (ts) => _formatAge(ts, now.value.getTime());

const vmState = computed(() => {
  const state = props.tx?.vmstate || props.tx?.VMState;
  if (!state) return "HALT"; // Assume HALT for NeoTube lists unless FAULT is specified
  return String(state).toUpperCase();
});

const isSuccess = computed(() => {
  if (!vmState.value) return null;
  return vmState.value === "HALT";
});

const statusStyle = computed(() => {
  const c =
    isSuccess.value === true
      ? "var(--status-success)"
      : isSuccess.value === false
      ? "var(--status-error)"
      : "var(--text-mid)";
  const bg =
    isSuccess.value === true
      ? "var(--status-success-bg)"
      : isSuccess.value === false
      ? "var(--status-error-bg)"
      : "var(--surface-muted)";
  return { background: bg, color: c };
});

const statusText = computed(() => {
  if (isSuccess.value === true) return "HALT";
  if (isSuccess.value === false) return "FAULT";
  return "Unknown";
});

const toPrefixedHash = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("0x")) return raw.toLowerCase();
  if (/^[0-9a-fA-F]{40}$/.test(raw)) return `0x${raw.toLowerCase()}`;
  return raw;
};

const reverseScriptHash = (value) => {
  const hash = toPrefixedHash(value).replace(/^0x/i, "");
  if (!/^[0-9a-f]{40}$/.test(hash)) return "";
  const bytes = hash.match(/.{2}/g) || [];
  return `0x${bytes.reverse().join("")}`;
};

const getKnownContractName = (value) => {
  const hash = toPrefixedHash(value);
  return NATIVE_CONTRACTS[hash]?.name || KNOWN_CONTRACTS[hash]?.name || null;
};

const canonicalizeContractHash = (value) => {
  const direct = toPrefixedHash(value);
  if (!direct || direct.startsWith("N")) return direct;
  if (getKnownContractName(direct)) return direct;

  const reversed = reverseScriptHash(direct);
  if (reversed && getKnownContractName(reversed)) return reversed;
  return direct;
};

const invocation = computed(() => {
  if (!props.tx?.script) return null;
  return extractContractInvocation(props.tx.script);
});

const recipient = computed(() => {
  const tx = props.tx;
  if (invocation.value?.contractHash) {
    const hash = canonicalizeContractHash(invocation.value.contractHash);
    return { hash, type: "contract" };
  }
  const to = tx.contractHash || tx.to;
  if (to) {
    // If it's a script hash, it's a contract. Otherwise, it's an address.
    const isAddress = String(to).startsWith("N");
    if (isAddress) {
      return { hash: to, type: "address" };
    }
    const hash = canonicalizeContractHash(to);
    return { hash, type: "contract" };
  }
  return null;
});

const methodName = computed(() => {
  const tx = props.tx;
  if (tx.attributes && tx.attributes.some((a) => a.type === "OracleResponse" || a.usage === "OracleResponse" || a.type === 0x11)) {
    return "Oracle Callback";
  }
  if (invocation.value?.method) {
    const contractHash = canonicalizeContractHash(invocation.value.contractHash);
    const method = invocation.value.method;
    const govMethods = [
      "designateAsRole",
      "setFeePerByte",
      "setExecFeeFactor",
      "setStoragePrice",
      "setGasPerBlock",
      "setRegisterPrice",
      "update",
      "destroy",
    ];
    if (
      govMethods.includes(method) &&
      (contractHash === "0xcc5e4edd9f5f8dba8bb65734541df7a1c081c67b" ||
        contractHash === "0xfe924b7cfe89ddd271abaf7210a80a7e11178758" ||
        contractHash === "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5")
    ) {
      return `Governance: ${method}`;
    }

    const knownContract = getKnownContractName(contractHash);
    if (knownContract) {
      return `${knownContract}: ${method}`;
    }

    const cName = getContractDisplayName(contractHash);
    if (cName && !cName.startsWith("0x")) {
      return `${cName}: ${method}`;
    }
    return method;
  }
  if (tx.method) return tx.method;
  return null;
});

const txFee = computed(() => {
  const net = props.tx?.netfee ?? props.tx?.net_fee ?? 0;
  const sys = props.tx?.sysfee ?? props.tx?.sys_fee ?? 0;
  const total = Number(net) + Number(sys);
  if (!Number.isFinite(total) || total === 0) return "0";
  return formatGas(total, 5);
});
</script>
