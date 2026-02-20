<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[900px]">
      <thead class="text-[11px] font-bold uppercase tracking-widest text-[#94b8a3] dark:text-[#547864] bg-white/50 dark:bg-[#071520]/80 backdrop-blur-md">
        <tr>
          <th class="px-5 py-4 text-left">Txn Hash</th>
          <th class="px-5 py-4 text-left">Method</th>
          <th class="px-5 py-4 text-left">Block</th>
          <th
            class="px-5 py-4 text-left cursor-pointer select-none transition-colors hover:text-[#00E599]"
            @click="$emit('toggle-time')"
          >
            {{ showAbsoluteTime ? "Date Time (UTC)" : "Age" }}
            <svg class="ml-1 inline h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </th>
          <th class="px-5 py-4 text-left hidden md:table-cell">From</th>
          <th class="px-5 py-4 text-left hidden lg:table-cell">To</th>
          <th class="px-5 py-4 text-right hidden lg:table-cell">Value / Gas</th>
          <th class="px-5 py-4 text-right hidden xl:table-cell">Net / Sys Fee</th>
        </tr>
      </thead>
      <tbody class="divide-y border-t border-white/10 dark:border-neo-green/10 divide-white/10 dark:divide-neo-green/10">
        <tr v-for="tx in transactions" :key="tx.hash" class="group transition-all duration-300 hover:bg-[#00E599]/5 dark:hover:bg-[#00E599]/10 cursor-pointer">
          <!-- Txn Hash -->
          <td class="px-5 py-4 text-sm whitespace-nowrap">
            <div class="flex items-center gap-2">
              <span class="relative flex h-3 w-3">
                <span v-if="tx.vmstate !== 'FAULT'" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E599] opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3" :class="tx.vmstate === 'FAULT' ? 'bg-[#ff4d4d]' : 'bg-[#00E599]'"></span>
              </span>
              <router-link :to="`/transaction-info/${tx.hash}`" :title="tx.hash" class="font-mono text-[#00E599] hover:text-[#33ffbb] hover:underline transition-colors font-semibold">
                {{ truncateHash(tx.hash) }}
              </router-link>
            </div>
          </td>

          <!-- Method -->
          <td class="px-5 py-4 text-sm">
            <span
              class="inline-flex items-center justify-center max-w-[120px] truncate rounded-lg border border-[#00E599]/30 bg-[#00E599]/10 px-2.5 py-1 text-xs font-bold text-[#00E599] shadow-[0_0_10px_rgba(0,229,153,0.1)] group-hover:shadow-[0_0_15px_rgba(0,229,153,0.2)] transition-shadow"
              :title="getMethodName(tx)"
            >
              {{ getMethodName(tx) }}
            </span>
          </td>

          <!-- Block -->
          <td class="px-5 py-4 text-sm">
            <router-link :to="`/block-info/${tx.blockhash}`" class="text-gray-800 dark:text-gray-100 font-bold hover:text-[#00E599] transition-colors">
              {{ tx.blockIndex }}
            </router-link>
          </td>

          <!-- Age -->
          <td class="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
            <span :title="formatUnixTime(tx.blocktime)">
              {{ showAbsoluteTime ? formatUnixTime(tx.blocktime) : formatAge(tx.blocktime) }}
            </span>
          </td>

          <!-- From -->
          <td class="px-5 py-4 text-sm hidden md:table-cell">
            <HashLink v-if="tx.sender" :hash="tx.sender" type="address" class="text-gray-700 dark:text-gray-300 hover:text-[#00E599] transition-colors" />
            <span v-else class="text-xs text-gray-400">-</span>
          </td>

          <!-- To -->
          <td class="px-5 py-4 text-sm hidden lg:table-cell">
            <span v-if="getRecipient(tx)" class="flex items-center gap-2">
              <svg class="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <HashLink :hash="getRecipient(tx)" type="contract" class="text-gray-700 dark:text-gray-300 hover:text-[#00E599] transition-colors" />
            </span>
            <span v-else class="text-xs text-gray-400">-</span>
          </td>

          <!-- Value -->
          <td class="px-5 py-4 text-sm hidden text-right font-mono lg:table-cell">
            <div class="flex flex-col items-end leading-tight">
              <span class="max-w-[180px] truncate font-bold text-gray-900 dark:text-gray-50" :title="getValueSummary(tx)">{{ getValueSummary(tx) }}</span>
              <span class="text-[11px] font-semibold text-gray-500 dark:text-[#94b8a3] mt-0.5">{{ formatTxGas(tx) }} GAS</span>
            </div>
          </td>

          <!-- Fee -->
          <td class="px-5 py-4 text-sm hidden text-right text-xs xl:table-cell text-gray-500 dark:text-gray-400 font-mono">
            {{ formatTxFeeBreakdown(tx) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { truncateHash, formatAge, formatUnixTime, formatGas } from "@/utils/explorerFormat";
import HashLink from "@/components/common/HashLink.vue";

const props = defineProps({
  transactions: { type: Array, required: true },
  showAbsoluteTime: { type: Boolean, default: false },
  transferSummaryByHash: { type: Object, default: () => ({}) },
});

defineEmits(["toggle-time"]);

function getMethodName(tx) {
  if (tx.method) return tx.method;
  if (tx.notifications?.length > 0) {
    return tx.notifications[0].eventname || "Transfer";
  }
  return "Transfer";
}

function getRecipient(tx) {
  if (tx.notifications?.length > 0) {
    return tx.notifications[0].contract;
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
