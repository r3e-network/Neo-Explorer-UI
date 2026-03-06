<template>
  <section>
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="index in 6" :key="index" height="46px" />
    </div>

    <ErrorState v-else-if="error" title="Unable to load transactions" :message="error" @retry="$emit('goToPage', 1)" />

    <EmptyState
      v-else-if="!transactions.length"
      message="No transactions found"
      description="This address has no indexed transaction history yet."
    />

    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-mid text-sm">
          Latest {{ transactions.length }} from a total of
          <span class="text-high font-semibold">{{ formatNumber(totalCount) }}</span>
          transactions
        </p>
        <button
          type="button"
          class="btn-outline flex items-center gap-1 px-2.5 py-1.5 text-xs"
          aria-label="Export transactions to CSV"
          @click="$emit('exportCsv')"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          CSV Export
        </button>
      </div>
      <div class="surface-panel overflow-x-auto">
        <table class="w-full min-w-[900px]" aria-label="Address transactions">
          <caption class="sr-only">
            Address transaction history
          </caption>
          <thead class="table-head">
            <tr>
              <th class="table-header-cell w-[180px]">Txn Hash</th>
              <th class="table-header-cell w-[120px]">Method</th>
              <th class="table-header-cell w-[100px]">Block</th>
              <th class="table-header-cell">Age</th>
              <th class="table-header-cell">From</th>
              <th class="table-header-cell w-16 text-center"></th>
              <th class="table-header-cell">To</th>
              <th class="table-header-cell-right">Value</th>
              <th class="table-header-cell-right">Txn Fee</th>
            </tr>
          </thead>
          <tbody class="divide-y soft-divider">
            <tr
              v-for="tx in transactions"
              :key="tx.hash"
              class="list-row group"
            >
              <td class="table-cell">
                <router-link
                  :to="`/transaction-info/${tx.hash}`"
                  :title="tx.hash"
                  class="font-hash etherscan-link"
                >
                  {{ truncateHash(tx.hash, 10, 6) }}
                </router-link>
              </td>
              <td class="table-cell">
                <span class="badge-soft max-w-[120px] truncate" :title="getTxMethod(tx)">
                  {{ getTxMethod(tx) }}
                </span>
              </td>
              <td class="table-cell">
                <router-link v-if="tx.blockhash" :to="`/block-info/${tx.blockhash}`" class="etherscan-link">
                  {{ (tx.blockIndex ?? tx.blockindex) != null ? formatNumber(tx.blockIndex ?? tx.blockindex) : truncateHash(tx.blockhash, 8, 6) }}
                </router-link>
                <span v-else class="text-low">-</span>
              </td>
              <td class="table-cell-secondary">
                {{ formatAge(tx.blocktime) }}
              </td>
              <td class="table-cell">
                <HashLink v-if="tx.sender" :hash="tx.sender" type="address" :copyable="false" />
                <span v-else class="text-low">-</span>
              </td>
              <td class="table-cell text-center p-0">
                <span
                  class="inline-block min-w-[40px] rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                  :class="getDirection(tx.sender, tx.to).cssClass"
                >
                  {{ getDirection(tx.sender, tx.to).label }}
                </span>
              </td>
              <td class="table-cell">
                <div v-if="getRecipient(tx)" class="flex items-center gap-2 max-w-[150px] xl:max-w-[200px] 2xl:max-w-none truncate">
                  <HashLink :hash="getRecipient(tx).hash" :type="getRecipient(tx).type" :truncated="false" />
                </div>
                <span v-else class="text-xs text-low">-</span>
              </td>
              <td class="table-cell-right text-high font-medium">
                {{ formatTxValue(tx) }}
              </td>
              <td class="table-cell-right text-mid">
                {{ formatTxFee(tx) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="soft-divider border-t pt-3">
        <EtherscanPagination
          :page="page"
          :total-pages="totalPages"
          :page-size="pageSize"
          :total="totalCount"
          @update:page="$emit('goToPage', $event)"
          @update:page-size="$emit('changePageSize', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { formatAge, truncateHash, formatNumber, getContractDisplayName, formatGas } from "@/utils/explorerFormat";
import { getTransferDirection } from "@/utils/addressDetail";
import { extractContractInvocation } from "@/utils/scriptDisassembler";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import HashLink from "@/components/common/HashLink.vue";
import { getKnownAddressName } from "@/constants/knownAddresses";

const props = defineProps({
  address: { type: String, default: "" },
  transactions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  totalCount: { type: Number, default: 0 },
  transferSummaryByHash: { type: Object, default: () => ({}) },
});

defineEmits(["goToPage", "changePageSize", "exportCsv"]);

function getDirection(from, to) {
  return getTransferDirection(from, to, props.address);
}

function getTxMethod(tx) {
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
  const summaryRecipient = getSummaryRecipient(props.transferSummaryByHash[tx.hash]);
  if (summaryRecipient) {
    return summaryRecipient;
  }

  if (tx.to) {
    const isAddress = String(tx.to).startsWith("N");
    return { hash: tx.to, type: isAddress ? "address" : "contract" };
  }
  if (tx.script) {
     const inv = extractContractInvocation(tx.script);
     if (inv && inv.contractHash) return { hash: inv.contractHash, type: 'contract' };
  }
  if (tx.notifications?.length > 0) {
    return { hash: tx.notifications[0].contract, type: 'contract' };
  }
  const summary = props.transferSummaryByHash[tx.hash];
  if (summary && typeof summary === "object" && summary.contract) {
    const isAddress = String(summary.contract).startsWith("N");
    return { hash: summary.contract, type: isAddress ? "address" : "contract" };
  }
  return null;
}

function getSummaryRecipient(summary) {
  if (!summary || typeof summary !== "object") return null;

  const candidate =
    summary.recipient ||
    summary.to ||
    summary.toAddress ||
    summary.toaddress ||
    summary.receiver ||
    null;
  const recipient = String(candidate || "").trim();
  if (!recipient) return null;

  const targetCount = Number(summary.targetCount ?? summary.totalCount ?? 0);
  const isSingleTarget =
    summary.singleTarget === true ||
    (Number.isFinite(targetCount) && targetCount === 1);
  const isKnownAddressRecipient = Boolean(getKnownAddressName(recipient));

  if (!isSingleTarget && !isKnownAddressRecipient) return null;

  const normalizedType = String(summary.recipientType || "address").toLowerCase();
  return {
    hash: recipient,
    type: isKnownAddressRecipient || normalizedType !== "contract" ? "address" : "contract",
  };
}

function formatTxValue(tx) {
  const summary = props.transferSummaryByHash[tx.hash];
  const summaryText = typeof summary === "string" ? summary : summary?.text;
  if (summaryText && summaryText !== "\u2014") return summaryText;

  const transferValue = Number(tx.value || tx.amount || 0);
  if (transferValue > 0) {
    return `${formatGas(transferValue)} GAS`;
  }
  return "-";
}

function formatTxFee(tx) {
  const net = Number(tx?.netfee || 0);
  const sys = Number(tx?.sysfee || 0);
  const total = net + sys;
  if (!total) return "0";
  return formatGas(total);
}
</script>
