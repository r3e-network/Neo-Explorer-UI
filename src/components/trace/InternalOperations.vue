<template>
  <div class="internal-operations">
    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 4" :key="i" class="flex gap-3">
        <Skeleton width="24px" height="24px" variant="circle" />
        <div class="flex-1 space-y-2">
          <Skeleton width="60%" height="16px" />
          <Skeleton width="40%" height="14px" />
        </div>
      </div>
    </div>

    <!-- FAULT banner -->
    <div
      v-if="!loading && hasFault"
      class="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
    >
      <svg class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clip-rule="evenodd"
        />
      </svg>
      <span class="text-sm font-medium text-red-700 dark:text-red-400"
        >Transaction execution failed (FAULT). State changes were reverted.</span
      >
    </div>

    <!-- Summary bar -->
    <div
      v-if="!loading && operations.length > 0"
      class="panel-muted mb-4 flex flex-wrap items-center gap-3 px-4 py-2.5"
    >
      <span class="text-mid text-sm">
        <span class="font-semibold">{{ operations.length }}</span>
        {{ operations.length === 1 ? "operation" : "operations" }}
        across
        <span class="font-semibold">{{ uniqueContracts }}</span>
        {{ uniqueContracts === 1 ? "contract" : "contracts" }}
      </span>
      <span class="text-low">|</span>
      <span class="text-mid text-sm font-mono"> Total Gas: {{ totalGas }} </span>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-if="!loading && operations.length === 0"
      icon="tx"
      message="No internal operations — this is a simple transfer."
    />

    <!-- Timeline -->
    <div v-else-if="!loading" class="relative">
      <!-- Vertical connecting line -->
      <div
        v-if="visibleOps.length > 1"
        class="absolute bottom-3 left-3 top-3 w-0.5"
        style="background: var(--line-soft)"
      ></div>

      <div class="space-y-0">
        <div
          v-for="(op, oi) in visibleOps"
          :key="op.index"
          class="relative flex gap-3 px-3 py-3 rounded-lg"
          :class="oi % 2 === 1 ? 'list-row' : ''"
        >
          <!-- Step indicator -->
          <div class="relative z-10 flex-shrink-0">
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              :class="stepClass(op.operationType)"
            >
              {{ op.index + 1 }}
            </div>
          </div>

          <!-- Operation content -->
          <div class="flex-1 min-w-0 pb-1">
            <!-- Header row -->
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                :class="opTypeBadge(op.operationType)"
              >
                {{ opTypeLabel(op.operationType) }}
              </span>
              <HashLink :hash="op.contract" type="contract" />
              <span v-if="op.contractName" class="text-mid text-xs">
                ({{ op.contractName }})
              </span>
              <span
                class="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              >
                {{ op.eventName }}
              </span>
            </div>

            <!-- Transfer rendering -->
            <div v-if="op.operationType === 'transfer'" class="flex flex-wrap items-center gap-2 text-sm mt-1">
              <span class="text-mid text-xs">From</span>
              <HashLink v-if="op.from && op.from !== 'null'" :hash="op.from" type="address" />
              <span
                v-else
                class="px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              >
                Mint
              </span>
              <svg class="text-low h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span class="text-high font-semibold">
                {{ formatAmount(op) }} {{ op.tokenSymbol || "" }}
              </span>
              <svg class="text-low h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span class="text-mid text-xs">To</span>
              <HashLink v-if="op.to && op.to !== 'null'" :hash="op.to" type="address" />
              <span
                v-else
                class="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              >
                Burn
              </span>
              <span
                v-if="op.tokenId"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                :title="op.tokenId"
              >
                ID: {{ op.tokenId.length > 16 ? op.tokenId.slice(0, 16) + "…" : op.tokenId }}
              </span>
            </div>

            <!-- Non-transfer: compact param table -->
            <div v-else-if="op.decodedParams && op.decodedParams.length > 0" class="mt-1">
              <div
                v-for="param in op.decodedParams"
                :key="param.index"
                class="flex items-center gap-2 text-xs font-mono py-0.5"
              >
                <span class="text-low w-20 truncate flex-shrink-0">
                  {{ param.name || `arg${param.index}` }}:
                </span>
                <HashLink
                  v-if="param.type === 'Hash160' && param.decoded.decodedValue"
                  :hash="param.decoded.decodedValue"
                  type="address"
                />
                <span v-else class="text-high truncate">
                  {{ param.decoded.displayValue }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Show all toggle -->
      <button
        v-if="operations.length > maxInline"
        class="soft-divider list-row mt-4 w-full rounded-lg border py-2 text-sm font-medium text-primary-500 transition-colors"
        @click="showAll = !showAll"
      >
        {{ showAll ? "Show less" : `Show all ${operations.length} operations` }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import HashLink from "@/components/common/HashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import { MAX_INLINE_OPERATIONS, OPERATION_TYPES } from "@/constants";
import { formatTokenAmount } from "@/utils/explorerFormat";

const props = defineProps({
  enrichedTrace: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const showAll = ref(false);
const maxInline = MAX_INLINE_OPERATIONS;

const operations = computed(() => {
  if (!props.enrichedTrace?.executions) return [];
  return props.enrichedTrace.executions.flatMap((e) => e.operations ?? []);
});

const hasFault = computed(() => {
  if (!props.enrichedTrace?.executions) return false;
  return props.enrichedTrace.executions.some((e) => e.vmState === "FAULT");
});

const visibleOps = computed(() => {
  if (showAll.value || operations.value.length <= maxInline) {
    return operations.value;
  }
  return operations.value.slice(0, maxInline);
});

const uniqueContracts = computed(() => {
  const contracts = new Set(operations.value.map((op) => op.contract));
  return contracts.size;
});

const totalGas = computed(() => {
  if (!props.enrichedTrace?.executions) return "0";
  const sum = props.enrichedTrace.executions.reduce((acc, e) => acc + Number(e.gasConsumed || 0), 0);
  return sum.toLocaleString(undefined, { maximumFractionDigits: 8 });
});

function stepClass(opType) {
  const map = {
    transfer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    deploy: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    vote: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    destroy: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  return map[opType] ?? "badge-soft";
}

function opTypeBadge(opType) {
  const color = OPERATION_TYPES[opType]?.color ?? "gray";
  const map = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    gray: "badge-soft",
  };
  return map[color] ?? map.gray;
}

function opTypeLabel(opType) {
  return OPERATION_TYPES[opType]?.label ?? "Contract Call";
}

function formatAmount(op) {
  return formatTokenAmount(op.amount, op.tokenDecimals ?? 0, 8);
}
</script>
