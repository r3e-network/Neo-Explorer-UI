<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[900px]">
      <thead class="table-head">
        <tr>
          <th class="table-header-cell w-[180px]">Txn Hash</th>
          <th class="table-header-cell w-[120px]">Method</th>
          <th class="table-header-cell w-[100px]">Block</th>
          <th
            class="table-header-cell cursor-pointer select-none transition-colors hover:text-primary-500"
            @click="$emit('toggle-time')"
          >
            {{ showAbsoluteTime ? "Date Time (UTC)" : "Age" }}
          </th>
          <th class="table-header-cell hidden md:table-cell">From</th>
          <th class="table-header-cell hidden lg:table-cell">To</th>
          <th class="table-header-cell-right hidden lg:table-cell">Value / Gas</th>
          <th class="table-header-cell-right hidden xl:table-cell">Net / Sys Fee</th>
        </tr>
      </thead>
      <tbody class="divide-y border-t soft-divider">
        <tr v-for="tx in transactions" :key="tx.hash" class="list-row group">
          <!-- Txn Hash -->
          <td class="table-cell">
            <div class="flex items-center gap-2">
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                :class="tx.vmstate === 'FAULT' ? 'bg-status-error-bg text-status-error' : 'bg-status-success-bg text-status-success'"
              >
                Tx
              </span>
              <router-link
                :to="`/transaction-info/${tx.hash}`"
                :title="tx.hash"
                class="etherscan-link font-hash"
              >
                {{ truncateHash(tx.hash) }}
              </router-link>
            </div>
          </td>

          <!-- Method -->
          <td class="table-cell">
            <span
              class="badge-soft inline-flex max-w-[120px] truncate"
              :title="getMethodName(tx)"
            >
              {{ getMethodName(tx) }}
            </span>
          </td>

          <!-- Block -->
          <td class="table-cell">
            <router-link
              :to="`/block-info/${tx.blockhash || tx.blockhash}`"
              class="etherscan-link"
            >
              {{ tx.blockIndex ?? tx.blockindex }}
            </router-link>
          </td>

          <!-- Age / Time -->
          <td class="table-cell-secondary">
            <span :title="formatUnixTime(tx.blocktime)">
              {{ showAbsoluteTime ? formatUnixTime(tx.blocktime) : formatAge(tx.blocktime) }}
            </span>
          </td>

          <!-- From -->
          <td class="table-cell hidden md:table-cell">
            <div v-if="tx.sender" class="max-w-[150px] xl:max-w-[200px] 2xl:max-w-none truncate">
              <HashLink :hash="tx.sender" type="address" :truncated="false" />
            </div>
            <span v-else class="text-xs text-low">-</span>
          </td>

          <!-- To -->
          <td class="table-cell hidden lg:table-cell">
            <div v-if="getRecipient(tx)" class="flex items-center gap-2 max-w-[150px] xl:max-w-[200px] 2xl:max-w-none truncate">
              <svg
                class="h-4 w-4 flex-shrink-0 text-low"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <HashLink :hash="getRecipient(tx).hash" :type="getRecipient(tx).type" :truncated="false" />
            </div>
            <span v-else class="text-xs text-low">-</span>
          </td>

          <!-- Value / Gas -->
          <td class="table-cell hidden text-right lg:table-cell">
            <div class="flex flex-col items-end leading-tight">
              <span class="max-w-[180px] truncate font-medium text-high" :title="getValueSummary(tx)">
                {{ getValueSummary(tx) }}
              </span>
              <span class="mt-0.5 text-xs text-mid">{{ formatTxGas(tx) }} GAS</span>
            </div>
          </td>

          <!-- Fee Breakdown -->
          <td class="table-cell-secondary hidden text-right text-xs xl:table-cell">
            {{ formatTxFeeBreakdown(tx) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { truncateHash, formatAge, formatUnixTime, formatGas, getContractDisplayName } from "@/utils/explorerFormat";
import HashLink from "@/components/common/HashLink.vue";
import { extractContractInvocation } from "@/utils/scriptDisassembler";

const props = defineProps({
  transactions: { type: Array, required: true },
  showAbsoluteTime: { type: Boolean, default: false },
  transferSummaryByHash: { type: Object, default: () => ({}) },
});

defineEmits(["toggle-time"]);

function getMethodName(tx) {
  if (tx.attributes && tx.attributes.some((a) => a.type === "OracleResponse" || a.usage === "OracleResponse" || a.type === 0x11)) {
    return "Oracle Callback";
  }
  if (tx.script) {
     const inv = extractContractInvocation(tx.script);
     if (inv && inv.method) {
        const govMethods = ["designateAsRole", "setFeePerByte", "setExecFeeFactor", "setStoragePrice", "setGasPerBlock", "setRegisterPrice", "update", "destroy"];
        if (govMethods.includes(inv.method) && (inv.contractHash === "0xcc5e4edd9f5f8dba8bb65734541df7a1c081c67b" || inv.contractHash === "0xfe924b7cfe89ddd271abaf7210a80a7e11178758" || inv.contractHash === "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5")) {
            return `Governance: ${inv.method}`;
        }
        const cName = getContractDisplayName(inv.contractHash);
        // If it's a truncated hash, maybe we just show method.
        if (cName && !cName.startsWith("0x")) {
           return `${cName}: ${inv.method}`;
        }
        return inv.method;
     }
  }
  if (tx.method) return tx.method;
  if (tx.notifications?.length > 0) {
    return tx.notifications[0].eventname || "Transfer";
  }
  return "Transfer";
}

function getRecipient(tx) {
  if (tx.script) {
     const inv = extractContractInvocation(tx.script);
     if (inv && inv.contractHash) return { hash: inv.contractHash, type: 'contract' };
  }
  if (tx.notifications?.length > 0) {
    return { hash: tx.notifications[0].contract, type: 'contract' };
  }
  return null;
}

function getValueSummary(tx) {
  const summary = props.transferSummaryByHash[tx.hash];
  if (summary) return summary;

  const transferValue = Number(tx.value || 0);
  if (transferValue > 0) {
    return `${formatGas(transferValue)} GAS`;
  }
  return "\u2014";
}

function formatTxGas(tx) {
  const net = Number(tx.netfee || 0);
  const sys = Number(tx.sysfee || 0);
  const totalFee = net + sys;
  if (totalFee === 0) return "0";
  return formatGas(totalFee);
}

function formatTxFeeBreakdown(tx) {
  const net = Number(tx.netfee || 0);
  const sys = Number(tx.sysfee || 0);
  if (net === 0 && sys === 0) return "N: 0 / S: 0";
  return `N: ${formatGas(net)} / S: ${formatGas(sys)}`;
}
</script>
