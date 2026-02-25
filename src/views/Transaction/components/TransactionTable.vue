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
                :class="getVmStateDotClass(tx)"
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
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                :class="getVmStateBadgeClass(tx)"
              >
                {{ getVmStateLabel(tx) }}
              </span>
            </div>
          </td>

          <!-- Method -->
          <td class="table-cell">
            <span
              class="badge-soft inline-flex items-center gap-1.5 max-w-[150px] truncate"
              :title="getMethodName(tx)"
            >
              <img v-if="/neo/i.test(getMethodName(tx)) || getRecipient(tx)?.hash === '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5'" :src="'/img/brand/neo.png'" alt="NEO" class="w-3.5 h-3.5 rounded-full flex-shrink-0" />
              <img v-if="/gas/i.test(getMethodName(tx)) || getRecipient(tx)?.hash === '0xd2a4cff31913016155e38e474a2c06d08be276cf'" :src="'/img/brand/gas.png'" alt="GAS" class="w-3.5 h-3.5 rounded-full flex-shrink-0" />
              <span class="truncate">{{ getMethodName(tx) }}</span>
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
            <div v-if="tx.sender" class="max-w-[150px] xl:max-w-[200px] 2xl:max-w-[240px] truncate">
              <HashLink :hash="tx.sender" type="address" :truncated="true" />
            </div>
            <span v-else class="text-xs text-low">-</span>
          </td>

          <!-- To -->
          <td class="table-cell hidden lg:table-cell">
            <div v-if="getRecipient(tx)" class="flex items-center gap-2 max-w-[150px] xl:max-w-[200px] 2xl:max-w-[240px] truncate">
              <svg
                class="h-4 w-4 flex-shrink-0 text-low"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <img v-if="getRecipient(tx) && getRecipient(tx).hash === '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5'" :src="'/img/brand/neo.png'" class="w-4 h-4 rounded-full flex-shrink-0" />
              <img v-else-if="getRecipient(tx) && getRecipient(tx).hash === '0xd2a4cff31913016155e38e474a2c06d08be276cf'" :src="'/img/brand/gas.png'" class="w-4 h-4 rounded-full flex-shrink-0" />
              <HashLink :hash="getRecipient(tx).hash" :type="getRecipient(tx).type" :truncated="true" />
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
import { NATIVE_CONTRACTS } from "@/constants";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";

const props = defineProps({
  transactions: { type: Array, required: true },
  showAbsoluteTime: { type: Boolean, default: false },
  transferSummaryByHash: { type: Object, default: () => ({}) },
});

defineEmits(["toggle-time"]);

function toPrefixedHash(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("0x")) return raw.toLowerCase();
  if (/^[0-9a-fA-F]{40}$/.test(raw)) return `0x${raw.toLowerCase()}`;
  return raw;
}

function reverseScriptHash(value) {
  const hash = toPrefixedHash(value).replace(/^0x/i, "");
  if (!/^[0-9a-f]{40}$/.test(hash)) return "";
  const bytes = hash.match(/.{2}/g) || [];
  return `0x${bytes.reverse().join("")}`;
}

function getKnownContractName(value) {
  const hash = toPrefixedHash(value);
  return NATIVE_CONTRACTS[hash]?.name || KNOWN_CONTRACTS[hash]?.name || null;
}

function canonicalizeContractHash(value) {
  const direct = toPrefixedHash(value);
  if (!direct || direct.startsWith("N")) return direct;
  if (getKnownContractName(direct)) return direct;

  const reversed = reverseScriptHash(direct);
  if (reversed && getKnownContractName(reversed)) return reversed;
  return direct;
}

function getMethodName(tx) {
  if (tx.attributes && tx.attributes.some((a) => a.type === "OracleResponse" || a.usage === "OracleResponse" || a.type === 0x11)) {
    return "Oracle Callback";
  }
  if (tx.script) {
     const inv = extractContractInvocation(tx.script);
     if (inv && inv.method) {
        const contractHash = canonicalizeContractHash(inv.contractHash);
        const govMethods = ["designateAsRole", "setFeePerByte", "setExecFeeFactor", "setStoragePrice", "setGasPerBlock", "setRegisterPrice", "update", "destroy"];
        if (govMethods.includes(inv.method) && (contractHash === "0xcc5e4edd9f5f8dba8bb65734541df7a1c081c67b" || contractHash === "0xfe924b7cfe89ddd271abaf7210a80a7e11178758" || contractHash === "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5")) {
            return `Governance: ${inv.method}`;
        }
        const known = getKnownContractName(contractHash);
        if (known) return `${known}: ${inv.method}`;
        const cName = getContractDisplayName(contractHash);
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
     if (inv && inv.contractHash) return { hash: canonicalizeContractHash(inv.contractHash), type: 'contract' };
  }
  if (tx.notifications?.length > 0) {
    return { hash: canonicalizeContractHash(tx.notifications[0].contract), type: 'contract' };
  }
  const to = tx.contractHash || tx.to;
  if (to) {
    if (String(to).startsWith("N")) return { hash: to, type: "address" };
    return { hash: canonicalizeContractHash(to), type: "contract" };
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
  const net = Number(tx.netfee ?? tx.net_fee ?? 0);
  const sys = Number(tx.sysfee ?? tx.sys_fee ?? 0);
  const totalFee = net + sys;
  if (totalFee === 0) return "0";
  return formatGas(totalFee, 5);
}

function formatTxFeeBreakdown(tx) {
  const net = Number(tx.netfee ?? tx.net_fee ?? 0);
  const sys = Number(tx.sysfee ?? tx.sys_fee ?? 0);
  if (net === 0 && sys === 0) return "N: 0 / S: 0";
  return `N: ${formatGas(net, 5)} / S: ${formatGas(sys, 5)}`;
}

function getVmState(tx) {
  const value = tx?.vmstate || tx?.VMState;
  if (!value) return "HALT";
  return String(value).toUpperCase();
}

function getVmStateLabel(tx) {
  const vmState = getVmState(tx);
  if (vmState === "HALT" || vmState === "FAULT") return vmState;
  return "UNKNOWN";
}

function getVmStateDotClass(tx) {
  const vmState = getVmState(tx);
  if (vmState === "HALT") return "bg-status-success-bg text-status-success";
  if (vmState === "FAULT") return "bg-status-error-bg text-status-error";
  return "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
}

function getVmStateBadgeClass(tx) {
  const vmState = getVmState(tx);
  if (vmState === "HALT") return "bg-status-success-bg text-status-success";
  if (vmState === "FAULT") return "bg-status-error-bg text-status-error";
  return "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
}
</script>
