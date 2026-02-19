<template>
  <div class="notification-decoder panel-muted p-3">
    <!-- Event header -->
    <div class="flex items-center gap-2 mb-2">
      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold" :class="eventBadgeClass">
        {{ notification.eventName ?? "Unknown" }}
      </span>
      <HashLink
        v-if="notification.contract && notification.contract !== 'unknown'"
        :hash="notification.contract"
        type="contract"
      />
      <!-- Raw toggle -->
      <button
        v-if="notification.state"
        class="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors"
        :class="
          showRawState
            ? 'soft-divider text-high'
            : 'badge-soft hover:text-high'
        "
        @click="showRawState = !showRawState"
      >
        {{ showRawState ? "Decoded" : "Raw" }}
      </button>
    </div>

    <!-- Raw JSON view -->
    <pre
      v-if="showRawState && notification.state"
      class="soft-divider text-mid max-h-32 overflow-auto rounded border p-2 font-mono text-xs"
      >{{ formatRawState(notification.state) }}</pre
    >

    <!-- Decoded Transfer -->
    <div v-else-if="isTransfer" class="transfer-summary flex items-center gap-2 text-sm flex-wrap">
      <span class="text-mid">From</span>
      <HashLink v-if="isAddress(fromAddress)" :hash="fromAddress" type="address" />
      <span
        v-else-if="fromAddress === 'null'"
        class="px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      >
        Mint
      </span>
      <span
        v-else
        class="badge-soft font-mono"
      >
        {{ fromAddress }}
      </span>
      <svg class="text-low h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
      <HashLink v-if="isAddress(toAddress)" :hash="toAddress" type="address" />
      <span
        v-else-if="toAddress === 'null'"
        class="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      >
        Burn
      </span>
      <span
        v-else
        class="badge-soft font-mono"
      >
        {{ toAddress }}
      </span>
      <span class="text-high font-semibold">
        {{ transferAmount }}
      </span>
    </div>

    <!-- Decoded Approval -->
    <div v-else-if="isApproval" class="approval-summary flex items-center gap-2 text-sm flex-wrap">
      <span class="text-mid">Owner</span>
      <HashLink v-if="isAddress(approvalOwner)" :hash="approvalOwner" type="address" />
      <span
        v-else
        class="badge-soft font-mono"
      >
        {{ approvalOwner }}
      </span>
      <span class="text-mid">approved</span>
      <HashLink v-if="isAddress(approvalSpender)" :hash="approvalSpender" type="address" />
      <span
        v-else
        class="badge-soft font-mono"
      >
        {{ approvalSpender }}
      </span>
      <span class="text-high font-semibold">
        {{ approvalAmount }}
      </span>
    </div>

    <!-- Raw state fallback -->
    <div v-else-if="notification.state" class="mt-1">
      <div class="text-mid mb-1 text-xs">Event State:</div>
      <div class="space-y-1">
        <div v-for="(param, i) in stateParams" :key="i" class="flex items-center gap-2 text-xs font-mono">
          <span class="text-low w-4 flex-shrink-0 text-right">{{ i }}</span>
          <span class="type-badge px-1 py-0.5 rounded text-xs" :class="paramTypeBadge(param.type)">
            {{ param.type }}
          </span>
          <HashLink v-if="isAddress(formatParam(param))" :hash="formatParam(param)" type="address" />
          <span v-else class="text-high truncate">
            {{ formatParam(param) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import HashLink from "@/components/common/HashLink.vue";
import { decodeStackItem } from "@/utils/neoCodec";
import { NATIVE_CONTRACTS } from "@/constants";
import { formatTokenAmount } from "@/utils/explorerFormat";

const props = defineProps({
  notification: {
    type: Object,
    required: true,
  },
  showInlineParams: {
    type: Boolean,
    default: false,
  },
});

const showRawState = ref(false);

const tokenDecimals = computed(() => {
  const hash = props.notification.contract;
  if (!hash) return 0;
  const native = NATIVE_CONTRACTS[hash.toLowerCase()];
  return native?.decimals ?? 0;
});

const isTransfer = computed(() => {
  return props.notification.eventName?.toLowerCase() === "transfer";
});

const isApproval = computed(() => {
  return props.notification.eventName?.toLowerCase() === "approval";
});

const approvalOwner = computed(() => {
  const params = stateParams.value;
  if (params.length < 1) return "null";
  return decodeStackValue(params[0]);
});

const approvalSpender = computed(() => {
  const params = stateParams.value;
  if (params.length < 2) return "null";
  return decodeStackValue(params[1]);
});

const approvalAmount = computed(() => {
  const params = stateParams.value;
  if (params.length < 3) return "0";
  const raw = decodeStackValue(params[2]);
  return formatTokenAmount(raw, tokenDecimals.value, 8);
});

const stateParams = computed(() => {
  const state = props.notification.state;
  if (!state) return [];
  return state.value ?? (Array.isArray(state) ? state : []);
});

const fromAddress = computed(() => {
  const params = stateParams.value;
  if (params.length < 1) return "null";
  return decodeStackValue(params[0]);
});

const toAddress = computed(() => {
  const params = stateParams.value;
  if (params.length < 2) return "null";
  return decodeStackValue(params[1]);
});

const transferAmount = computed(() => {
  const params = stateParams.value;
  if (params.length < 3) return "0";
  const raw = decodeStackValue(params[2]);
  return formatTokenAmount(raw, tokenDecimals.value, 8);
});

const eventBadgeClass = computed(() => {
  const name = props.notification.eventName?.toLowerCase();
  if (name === "transfer") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (name === "approval") return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  return "badge-soft";
});

function decodeStackValue(param) {
  if (!param) return "null";
  const decoded = decodeStackItem(param);
  return decoded.decodedValue || "null";
}

function paramTypeBadge(type) {
  const map = {
    Integer: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    ByteString: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    Boolean: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    Array: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
  };
  return map[type] ?? "badge-soft";
}

function isAddress(val) {
  return typeof val === "string" && /^N[A-HJ-NP-Za-km-z1-9]{33}$/.test(val);
}

function formatParam(param) {
  return decodeStackValue(param);
}

function formatRawState(state) {
  try {
    return JSON.stringify(state, null, 2);
  } catch {
    return String(state);
  }
}
</script>
