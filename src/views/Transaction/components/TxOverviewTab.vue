<template>
  <div>
    <div class="soft-divider divide-y">
      <InfoRow
        :label="$t('txDetail.rowTxHash')"
        :tooltip="$t('txDetail.rowTxHashTip')"
        :value="tx.hash"
        :copyable="!!tx.hash"
        :copy-value="tx.hash"
      />

      <InfoRow v-if="txMethod" :label="$t('txDetail.rowMethod')" :tooltip="$t('txDetail.rowMethodTip')">
        <span class="badge-soft">{{ txMethod }}</span>
      </InfoRow>

      <InfoRow :label="$t('txDetail.rowStatus')" :tooltip="$t('txDetail.rowStatusTip')">
        <StatusBadge :status="txStatus" />
      </InfoRow>

      <InfoRow :label="$t('txDetail.rowVmState')" :tooltip="$t('txDetail.rowVmStateTip')">
        <span
          v-if="vmState"
          class="badge-soft rounded px-2 py-0.5 text-xs font-semibold"
          :class="vmState === 'HALT' ? 'text-status-success' : vmState === 'FAULT' ? 'text-status-error' : 'text-mid'"
        >
          {{ vmState }}
        </span>
        <span v-else class="text-mid">{{ $t("txDetail.rowVmStateUnknown") }}</span>
      </InfoRow>

      <InfoRow
        v-if="vmState === 'FAULT'"
        :label="$t('txDetail.rowFailureReason')"
        :tooltip="$t('txDetail.rowFailureReasonTip')"
      >
        <code
          v-if="failureReason"
          class="block max-w-full whitespace-pre-wrap break-all rounded bg-status-error-bg/60 px-2 py-1 text-xs text-status-error"
        >
          {{ failureReason }}
        </code>
        <span v-else class="text-mid">{{ $t("txDetail.rowFailureReasonEmpty") }}</span>
      </InfoRow>

      <InfoRow :label="$t('txDetail.rowBlock')">
        <router-link v-if="tx.blockhash" :to="`/block-info/${tx.blockhash}`" class="etherscan-link">
          #{{ tx.blockIndex ?? tx.blockindex }}
        </router-link>
        <span v-else class="text-mid">{{ $t("txDetail.rowPendingConfirm") }}</span>
      </InfoRow>

      <InfoRow :label="$t('txDetail.rowTimestamp')">
        <template v-if="tx.blocktime">
          <span class="text-high">{{ formatTime(tx.blocktime) }}</span>
          <span class="text-mid ml-2 text-xs"> ({{ formatAge(tx.blocktime) }}) </span>
        </template>
        <template v-else-if="tx.status === 'pending' && tx.timestamp">
          <span class="text-amber-500 font-medium flex items-center gap-1.5">
            <svg class="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ $t("txDetail.rowMempoolPending", { age: formatAge(tx.timestamp) }) }}
          </span>
        </template>
        <span v-else class="text-mid">{{ $t("txDetail.rowPendingConfirm") }}</span>
      </InfoRow>

      <InfoRow :label="$t('txDetail.rowConfirmations')" :tooltip="$t('txDetail.rowConfirmationsTip')">
        <span class="badge-soft rounded px-2 py-0.5 text-xs font-medium text-high">
          {{ $t("txDetail.rowConfirmationsValue", { count: confirmations.toLocaleString() }) }}
        </span>
      </InfoRow>

      <!-- Separator -->
      <div class="py-1" />

      <InfoRow :label="$t('txDetail.rowFrom')" :tooltip="$t('txDetail.rowFromTip')">
        <HashLink v-if="tx.sender" :hash="tx.sender" type="address" :truncated="false" :show-neo-chat="true" />
        <span v-else class="text-mid">-</span>
      </InfoRow>

      <InfoRow :label="$t('txDetail.rowTo')" :tooltip="$t('txDetail.rowToTip')">
        <HashLink
          v-if="recipientTarget"
          :hash="recipientTarget.hash"
          :type="recipientTarget.type"
          :truncated="false"
          :show-neo-chat="recipientTarget.type === 'address'"
        />
        <span v-else class="text-mid">{{ $t("txDetail.rowToFallback") }}</span>
      </InfoRow>

      <InfoRow
        v-if="allTransfers && allTransfers.length"
        :label="$t('txDetail.rowTokensTransferred')"
        :tooltip="$t('txDetail.rowTokensTransferredTip')"
      >
        <div class="space-y-3 mt-1">
          <div
            v-for="(t, tIdx) in allTransfers"
            :key="'overview-xfer-' + tIdx"
            class="flex items-center flex-wrap gap-2 text-sm bg-surface-elevated px-3 py-2 rounded-lg border border-line-soft"
          >
            <span class="text-low font-medium">{{ $t("txDetail.transferFromLabel") }}</span>
            <HashLink v-if="t.from" :hash="scriptHashToAddress(t.from)" type="address" class="max-w-[100px] truncate" />
            <span v-else class="text-mid italic text-xs">{{ $t("txDetail.transferMint") }}</span>
            <span class="text-low font-medium px-1">{{ $t("txDetail.transferToLabel") }}</span>
            <HashLink v-if="t.to" :hash="scriptHashToAddress(t.to)" type="address" class="max-w-[100px] truncate" />
            <span v-else class="text-mid italic text-xs">{{ $t("txDetail.transferBurn") }}</span>
            <span class="text-high font-semibold font-mono pl-2">{{ $t("txDetail.transferForLabel") }}</span>
            <span class="text-high font-mono">{{ formatTransferAmount(t) }}</span>
            <span class="badge-soft inline-flex items-center gap-1.5 px-2 py-1">
              <img
                v-if="supabaseMeta[(t.contract || t.contractHash)?.toLowerCase()]?.logo_url"
                :src="supabaseMeta[(t.contract || t.contractHash)?.toLowerCase()].logo_url"
                class="h-6 w-6 rounded-full ring-1 ring-line-soft bg-white object-cover"
                alt=""
                loading="lazy"
                @error="$event.target.src='/img/brand/neo.png'"
              />
              <img
                v-else
                :src="getTokenLogo(t)"
                alt="logo"
                class="w-4 h-4 rounded-full object-cover bg-white/5"
                loading="lazy"
                @error="$event.target.src='/img/brand/neo.png'"
              />
              {{ t.tokenname || t.symbol || $t("txDetail.transferToken") }}
            </span>
            <span v-if="t._standard === 'NEP-11' && t.tokenId" class="text-xs text-low"
              >#{{ t.tokenId.length > 8 ? t.tokenId.slice(0, 8) + "…" : t.tokenId }}</span
            >
          </div>
        </div>
      </InfoRow>

      <InfoRow :label="$t('txDetail.rowNetFee')" :value="`${formatGas(tx.netfee)} GAS`" />
      <InfoRow :label="$t('txDetail.rowSysFee')">
        <span class="inline-flex items-center gap-1.5">
          <span>{{ formatGas(tx.sysfee) }} GAS</span>
          <span class="text-red-600 dark:text-red-400 text-xs font-semibold uppercase tracking-wide">{{
            $t("txDetail.rowSysFeeBurned")
          }}</span>
        </span>
      </InfoRow>

      <InfoRow :label="$t('txDetail.rowTotalFee')">
        <span class="text-high font-medium">{{ totalFee }} GAS</span>
      </InfoRow>

      <InfoRow :label="$t('txDetail.rowSigners')" :tooltip="$t('txDetail.rowSignersTip')">
        <div v-if="tx.signers && tx.signers.length" class="space-y-2">
          <div v-for="(signer, idx) in tx.signers" :key="idx" class="flex items-center gap-2 flex-wrap">
            <HashLink
              :hash="scriptHashToAddress(signer.account)"
              type="address"
              :truncated="false"
              :show-neo-chat="true"
            />
            <span class="badge-soft text-[10px] uppercase font-semibold tracking-wide text-mid">{{
              signer.scopes
            }}</span>
          </div>
        </div>
        <span v-else class="text-mid">-</span>
      </InfoRow>
    </div>

    <!-- Gas Breakdown (complex transactions) -->
    <div v-if="isComplexTx && enrichedTrace" class="panel-muted mt-4 p-4">
      <GasBreakdown :executions="enrichedTrace?.executions ?? []" :total-gas="totalGas" :loading="enrichedLoading" />
    </div>

    <!-- Collapsible More Details -->
    <div class="panel-muted mt-4">
      <button
        type="button"
        :aria-expanded="showMore"
        aria-controls="tx-overview-extra"
        :aria-label="$t('txDetail.moreToggleAria', { action: showMore ? $t('txDetail.moreToggleHide') : $t('txDetail.moreToggleShow') })"
        class="list-row flex w-full items-center justify-between p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        @click="$emit('update:showMore', !showMore)"
      >
        <span class="text-sm font-medium text-primary-500">
          {{ showMore ? $t("txDetail.moreToggleClickHide") : $t("txDetail.moreToggleClickShow") }}
        </span>
        <svg
          class="h-4 w-4 text-primary-500 transition-transform duration-200"
          :class="{ 'rotate-180': showMore }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <transition name="expand">
        <div id="tx-overview-extra" v-show="showMore" class="soft-divider border-t">
          <div class="soft-divider divide-y">
            <InfoRow
              :label="$t('txDetail.rowSize')"
              :value="$t('txDetail.rowSizeBytes', { count: tx.size || 0 })"
            />
            <InfoRow :label="$t('txDetail.rowValidUntilBlock')">
              <router-link
                v-if="tx.validUntilBlock || tx.validuntilblock"
                :to="`/block-info/${tx.validUntilBlock || tx.validuntilblock}`"
                class="etherscan-link"
              >
                #{{ tx.validUntilBlock || tx.validuntilblock }}
              </router-link>
              <span v-else class="text-mid">-</span>
            </InfoRow>
            <InfoRow :label="$t('txDetail.rowNonce')" :value="tx.nonce != null ? String(tx.nonce) : '-'" />
            <InfoRow :label="$t('txDetail.rowVersion')" :value="tx.version != null ? String(tx.version) : '-'" />
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { getTokenIcon } from "@/utils/getTokenIcon";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import InfoRow from "@/components/common/InfoRow.vue";

const { t } = useI18n();
import HashLink from "@/components/common/HashLink.vue";
import StatusBadge from "@/components/common/StatusBadge.vue";
import GasBreakdown from "@/components/trace/GasBreakdown.vue";
import { formatGas, formatAge, formatTime, formatTokenAmount } from "@/utils/explorerFormat";
import { scriptHashToAddress } from "@/utils/neoHelpers";
import { extractContractInvocation } from "@/utils/scriptDisassembler";
import { GAS_DECIMALS, NATIVE_CONTRACTS } from "@/constants";
import { supabaseService } from "@/services/supabaseService";
import { resolveNetworkName } from "@/utils/env";

const props = defineProps({
  tx: { type: Object, required: true },
  txStatus: { type: String, default: "pending" },
  isSuccess: { type: [Boolean, null], default: null },
  vmState: { type: String, default: "" },
  failureReason: { type: String, default: "" },
  confirmations: { type: Number, default: 0 },
  totalFee: { type: String, default: "0" },
  isComplexTx: { type: Boolean, default: false },
  enrichedTrace: { type: Object, default: null },
  enrichedLoading: { type: Boolean, default: false },
  totalGas: { type: String, default: "0" },
  allTransfers: { type: Array, default: () => [] },
  showMore: { type: Boolean, default: false },
});

const supabaseMeta = ref({});
watch(
  () => (Array.isArray(props.allTransfers) ? props.allTransfers : []),
  async (newTransfers) => {
    if (newTransfers && newTransfers.length) {
      const hashes = newTransfers.map((t) => t.contract || t.contractHash).filter(Boolean);
      const requestNetwork = resolveNetworkName();
      const meta = await supabaseService.getContractMetadataBatch(hashes, requestNetwork);
      if (resolveNetworkName() !== requestNetwork) return;
      supabaseMeta.value = meta;
    } else {
      supabaseMeta.value = {};
    }
  },
  { immediate: true },
);

defineEmits(["update:showMore"]);

function getTokenLogo(t) {
  const hash = (t.contract || t.contractHash || "").toLowerCase();
  const isNep11 = t._standard && t._standard.toUpperCase().includes("NEP-11");
  return getTokenIcon(hash, isNep11 ? "NEP11" : "NEP17");
}

function formatTransferAmount(t) {
  const raw = t.value ?? t.amount ?? 0;
  // Same fix as TxDetail/AddressTokenTransfersTab: the indexer's
  // nep17_transfers view doesn't carry decimals, so without the
  // NATIVE_CONTRACTS lookup NEO transfers get rendered with 8 decimals.
  const hash = String(t.contract || t.contractHash || "").toLowerCase();
  let decimals = t.decimals;
  if (decimals === undefined || decimals === null) {
    if (NATIVE_CONTRACTS[hash]) {
      decimals = NATIVE_CONTRACTS[hash].decimals;
    } else {
      decimals = GAS_DECIMALS;
    }
  }
  decimals = Number(decimals);
  return formatTokenAmount(raw, decimals, Math.min(decimals, 8));
}

const invocation = computed(() => {
  if (!props.tx?.script) return null;
  return extractContractInvocation(props.tx.script);
});

const recipientTarget = computed(() => {
  const tx = props.tx || {};
  const explicitTarget =
    tx.to ||
    tx.toAddress ||
    tx.toaddress ||
    tx.recipient ||
    tx.receiver ||
    tx.contractHash ||
    tx.contracthash ||
    tx.contract_hash ||
    "";

  const normalizedTarget = String(explicitTarget || "").trim();
  if (normalizedTarget) {
    return {
      hash: normalizedTarget,
      type: normalizedTarget.startsWith("N") ? "address" : "contract",
    };
  }

  if (invocation.value?.contractHash) {
    return {
      hash: invocation.value.contractHash,
      type: "contract",
    };
  }

  if (tx.notifications?.length > 0) {
    const notificationContract =
      tx.notifications[0]?.contract || tx.notifications[0]?.contractHash || tx.notifications[0]?.contracthash || "";
    if (notificationContract) {
      return { hash: notificationContract, type: "contract" };
    }
  }

  if (props.allTransfers?.length > 0) {
    const transferTarget =
      props.allTransfers[0]?.to || props.allTransfers[0]?.toAddress || props.allTransfers[0]?.receiver || "";
    const normalizedTransferTarget = String(transferTarget || "").trim();
    if (normalizedTransferTarget) {
      return {
        hash: normalizedTransferTarget,
        type: normalizedTransferTarget.startsWith("N") ? "address" : "contract",
      };
    }
  }

  return null;
});

function hasOracleResponseAttribute(tx) {
  return Boolean(
    tx?.attributes &&
    tx.attributes.some((a) => a?.type === "OracleResponse" || a?.usage === "OracleResponse" || a?.type === 0x11),
  );
}

const txMethod = computed(() => {
  if (hasOracleResponseAttribute(props.tx)) return t("txDetail.actionOracle");
  if (props.tx?.method) return props.tx.method;
  if (props.tx?.notifications?.length > 0) {
    return props.tx.notifications[0].eventname || t("txDetail.methodTransferFallback");
  }
  return t("txDetail.methodTransferFallback");
});
</script>
