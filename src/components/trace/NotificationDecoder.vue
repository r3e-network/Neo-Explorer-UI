<template>
  <div
    class="notification-decoder rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
  >
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
    </div>

    <!-- Decoded Transfer -->
    <div v-if="isTransfer" class="transfer-summary flex items-center gap-2 text-sm flex-wrap">
      <span class="text-gray-500 dark:text-gray-400">From</span>
      <span
        class="font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded"
      >
        {{ fromAddress }}
      </span>
      <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
      <span
        class="font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded"
      >
        {{ toAddress }}
      </span>
      <span class="font-semibold text-gray-800 dark:text-gray-200">
        {{ transferAmount }}
      </span>
    </div>

    <!-- Decoded Approval -->
    <div v-else-if="isApproval" class="approval-summary flex items-center gap-2 text-sm flex-wrap">
      <span class="text-gray-500 dark:text-gray-400">Owner</span>
      <span
        class="font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded"
      >
        {{ approvalOwner }}
      </span>
      <span class="text-gray-500 dark:text-gray-400">approved</span>
      <span
        class="font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded"
      >
        {{ approvalSpender }}
      </span>
      <span class="font-semibold text-gray-800 dark:text-gray-200">
        {{ approvalAmount }}
      </span>
    </div>

    <!-- Raw state fallback -->
    <div v-else-if="notification.state" class="mt-1">
      <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Event State:</div>
      <div class="space-y-1">
        <div v-for="(param, i) in stateParams" :key="i" class="flex items-center gap-2 text-xs font-mono">
          <span class="text-gray-400 dark:text-gray-500 w-4 text-right flex-shrink-0">{{ i }}</span>
          <span class="type-badge px-1 py-0.5 rounded text-xs" :class="paramTypeBadge(param.type)">
            {{ param.type }}
          </span>
          <span class="text-gray-700 dark:text-gray-300 truncate">
            {{ formatParam(param) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import HashLink from "@/components/common/HashLink.vue";

const props = defineProps({
  notification: {
    type: Object,
    required: true,
  },
});

const isTransfer = computed(() => {
  return props.notification.eventName === "Transfer";
});

const isApproval = computed(() => {
  return props.notification.eventName === "Approval";
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
  return decodeStackValue(params[2]);
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
  return decodeStackValue(params[2]);
});

const eventBadgeClass = computed(() => {
  const name = props.notification.eventName;
  if (name === "Transfer") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (name === "Approval") return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
});

function decodeStackValue(param) {
  if (!param) return "null";
  if (param.type === "Integer") return param.value ?? "0";
  if (param.type === "Boolean") return param.value ? "true" : "false";
  if (param.type === "ByteString") {
    return decodeByteString(param.value);
  }
  return String(param.value ?? "");
}

function decodeByteString(base64Str) {
  if (!base64Str) return "null";
  try {
    const raw = atob(base64Str);
    if (raw.length === 20) {
      // Neo address (script hash) - show as 0x hex
      return "0x" + Array.from(raw, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    }
    // Try readable UTF-8
    const printable = /^[\x20-\x7E]+$/.test(raw);
    if (printable) return raw;
    // Fallback to hex
    return "0x" + Array.from(raw, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  } catch {
    return base64Str;
  }
}

function paramTypeBadge(type) {
  const map = {
    Integer: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    ByteString: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    Boolean: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    Array: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
  };
  return map[type] ?? "bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
}

function formatParam(param) {
  return decodeStackValue(param);
}
</script>
