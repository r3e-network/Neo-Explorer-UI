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
            {{ formatAge(tx.blocktime || tx.timestamp || tx.time) }}
          </p>
        </div>
      </div>

      <!-- From -> To (hidden on mobile) -->
      <!-- flex-1 + min-w-0 on every slot is what lets the inner HashLink
           truncate cleanly. Without per-slot width constraints, two
           full-length addresses (~34 chars each) push the row past the
           container at narrow viewports and overlap each other. -->
      <div class="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
        <template v-if="isSingleTransferFlow">
          <div class="min-w-0 flex-1 basis-0 text-right">
            <p class="text-xs text-mid">{{ $t("listItems.from") }}</p>
            <HashLink
              v-if="tx.sender"
              :hash="tx.sender"
              type="address"
              :copyable="false"
              :address-alias-as-primary="true"
            />
          </div>
          <div data-testid="single-transfer-flow" class="min-w-0 flex-shrink basis-auto px-2 text-center">
            <div class="mb-1 flex items-center justify-center gap-1.5 min-w-0">
              <img
                v-if="transferLogo"
                :src="transferLogo"
                alt=""
                class="w-4 h-4 rounded-full flex-shrink-0 object-cover bg-white ring-1 ring-line-soft"
                @error="$event.target.src = '/img/brand/neo.png'"
              />
              <span class="text-sm text-high font-medium truncate" :title="transferText">
                {{ transferText }}
              </span>
            </div>
            <svg class="mx-auto h-4 w-4 flex-shrink-0 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          <div class="min-w-0 flex-1 basis-0 text-left">
            <p class="text-xs text-mid">{{ $t("listItems.to") }}</p>
            <HashLink
              v-if="recipient"
              :hash="recipient.hash"
              :type="recipient.type"
              :copyable="false"
              :address-alias-as-primary="recipient.type === 'address'"
            />
          </div>
        </template>
        <template v-else>
          <div class="min-w-0 flex-1 basis-0 text-right">
            <p class="text-xs text-mid">{{ $t("listItems.from") }}</p>
            <HashLink
              v-if="tx.sender"
              :hash="tx.sender"
              type="address"
              :copyable="false"
              :address-alias-as-primary="true"
            />
          </div>
          <svg class="h-4 w-4 flex-shrink-0 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <div class="min-w-0 flex-1 basis-0 text-left">
            <p class="text-xs text-mid">{{ $t("listItems.to") }}</p>
            <div v-if="recipient" class="flex items-center gap-1.5">
              <HashLink
                :hash="recipient.hash"
                :type="recipient.type"
                :copyable="false"
                :address-alias-as-primary="recipient.type === 'address'"
              />
            </div>
            <div v-else-if="transferText && transferText !== '—'" class="flex items-center gap-1.5 min-w-0">
              <img
                v-if="transferLogo"
                :src="transferLogo"
                alt=""
                class="w-4 h-4 rounded-full flex-shrink-0 object-cover bg-white ring-1 ring-line-soft"
                @error="$event.target.src = '/img/brand/neo.png'"
              />
              <span class="text-sm text-high font-medium truncate flex items-center gap-1" :title="transferText">
                {{ transferText }}
                <svg
                  v-if="supabaseMeta?.is_verified"
                  class="h-3 w-3 text-success flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
            </div>
            <div v-else-if="methodName" class="flex items-center gap-1.5 min-w-0">
              <img
                v-if="methodBadge"
                :src="methodBadge.src"
                :alt="methodBadge.alt"
                class="w-4 h-4 rounded-full flex-shrink-0 object-cover bg-white ring-1 ring-line-soft"
                @error="$event.target.src = '/img/brand/neo.png'"
              />
              <span class="text-sm text-high font-medium truncate">{{ methodName }}</span>
            </div>
            <span v-else class="text-sm text-low">{{ $t("listItems.contractCall") }}</span>
          </div>
        </template>
      </div>

      <!-- Status + Fee -->
      <div class="flex-shrink-0 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <span
            v-if="isComplex"
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-status-warning-bg text-status-warning"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            {{ $t("listItems.complex") }}
          </span>
          <span :style="statusStyle" class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
            {{ statusText }}
          </span>
        </div>
        <p class="mt-1 text-xs text-mid">{{ txFee }} GAS</p>
      </div>
    </div>

    <div class="mt-3 grid gap-2 md:hidden">
      <div class="grid grid-cols-2 gap-2">
        <div class="min-w-0 rounded bg-surface-muted px-3 py-2">
          <p class="text-[10px] uppercase text-low">{{ $t("listItems.from") }}</p>
          <div class="mt-1 min-w-0 text-sm font-medium text-high">
            <HashLink
              v-if="tx.sender"
              :hash="tx.sender"
              type="address"
              :copyable="false"
              :address-alias-as-primary="true"
            />
            <span v-else class="text-low">-</span>
          </div>
        </div>
        <div class="min-w-0 rounded bg-surface-muted px-3 py-2">
          <p class="text-[10px] uppercase text-low">{{ $t("listItems.to") }}</p>
          <div class="mt-1 min-w-0 text-sm font-medium text-high">
            <HashLink
              v-if="recipient"
              :hash="recipient.hash"
              :type="recipient.type"
              :copyable="false"
              :address-alias-as-primary="recipient.type === 'address'"
            />
            <span v-else class="text-low">-</span>
          </div>
        </div>
      </div>

      <div class="rounded bg-surface-muted px-3 py-2">
        <p class="text-[10px] uppercase text-low">{{ $t("transactionsPage.colValueGas") }}</p>
        <div class="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-high">
          <img
            v-if="transferText && transferText !== '—' && transferLogo"
            :src="transferLogo"
            alt=""
            class="h-4 w-4 flex-shrink-0 rounded-full bg-white object-cover ring-1 ring-line-soft"
            @error="$event.target.src = '/img/brand/neo.png'"
          />
          <img
            v-else-if="methodBadge"
            :src="methodBadge.src"
            :alt="methodBadge.alt"
            class="h-4 w-4 flex-shrink-0 rounded-full bg-white object-cover ring-1 ring-line-soft"
            @error="$event.target.src = '/img/brand/neo.png'"
          />
          <span class="min-w-0 truncate" :title="transferText || methodName || $t('listItems.contractCall')">
            {{ transferText && transferText !== "—" ? transferText : methodName || $t("listItems.contractCall") }}
          </span>
          <svg
            v-if="transferText && transferText !== '—' && supabaseMeta?.is_verified"
            class="h-3.5 w-3.5 flex-shrink-0 text-success"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useNow } from "@vueuse/core";
import { formatAge as _formatAge, formatGas, getContractDisplayName } from "@/utils/explorerFormat";
import HashLink from "./HashLink.vue";

const { t } = useI18n();
import { extractContractInvocation } from "@/utils/scriptDisassembler";
import { NATIVE_CONTRACTS, NEO_HASH, POLICY_HASH, ORACLE_HASH } from "@/constants";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import { getKnownAddressName } from "@/constants/knownAddresses";
import { scriptHashToAddress } from "@/utils/neoHelpers";
import { getTokenIcon } from "@/utils/getTokenIcon";
import { getNativeTokenBadge } from "@/utils/nativeTokenBadge";
import { supabaseService } from "@/services/supabaseService";
import { ref, watch } from "vue";
import { resolveNetworkName } from "@/utils/env";

const props = defineProps({
  tx: { type: Object, default: () => ({}) },
  isComplex: { type: Boolean, default: false },
  transferSummary: { type: [String, Object], default: null },
});

const getSummaryContractHash = (summary) => {
  if (!summary || typeof summary !== "object") return null;
  return (
    summary.contract ||
    summary.contractHash ||
    summary.contracthash ||
    summary.contract_hash ||
    summary.asset ||
    summary.assetHash ||
    summary.assethash ||
    null
  );
};

function normalizeComparableSummaryAddress(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return scriptHashToAddress(raw) || raw;
}

const getSummaryRecipient = (summary, sender = "") => {
  if (!summary || typeof summary !== "object") return null;

  const candidate =
    summary.recipient || summary.to || summary.toAddress || summary.toaddress || summary.receiver || null;
  const recipient = String(candidate || "").trim();
  if (!recipient) return null;

  const recipientAddress = normalizeComparableSummaryAddress(recipient);
  const normalizedRecipient = recipientAddress.toLowerCase();
  const normalizedSender = normalizeComparableSummaryAddress(sender).toLowerCase();
  if (normalizedRecipient && normalizedSender && normalizedRecipient === normalizedSender) {
    return null;
  }

  const targetCount = Number(summary.targetCount ?? summary.totalCount ?? 0);
  const isSingleTarget = summary.singleTarget === true || (Number.isFinite(targetCount) && targetCount === 1);
  const isKnownAddressRecipient = Boolean(getKnownAddressName(recipient));

  if (!isSingleTarget && !isKnownAddressRecipient) return null;

  const normalizedType = String(summary.recipientType || "address").toLowerCase();
  const recipientType = isKnownAddressRecipient || normalizedType !== "contract" ? "address" : "contract";
  return {
    hash: recipientType === "address" ? recipientAddress || recipient : recipient,
    type: recipientType,
  };
};

const supabaseMeta = ref({});
watch(
  () => props.transferSummary,
  async (newSummary) => {
    const contract = getSummaryContractHash(newSummary);
    if (!contract) {
      supabaseMeta.value = {};
      return;
    }

    const requestNetwork = resolveNetworkName();
    try {
      const meta = await supabaseService.getContractMetadata(contract, requestNetwork);
      if (resolveNetworkName() !== requestNetwork) return;
      if (meta) {
        supabaseMeta.value = meta;
      } else {
        supabaseMeta.value = {};
      }
    } catch {
      if (resolveNetworkName() !== requestNetwork) return;
      supabaseMeta.value = {};
    }
  },
  { immediate: true },
);

const transferText = computed(() => {
  if (!props.transferSummary) return "";
  if (typeof props.transferSummary === "string") return props.transferSummary;
  return props.transferSummary.text || "—";
});

const transferLogo = computed(() => {
  const summaryContract = getSummaryContractHash(props.transferSummary);
  if (!summaryContract) return null;
  if (supabaseMeta.value?.logo_url) return supabaseMeta.value.logo_url;
  return getTokenIcon(summaryContract, props.transferSummary?.type);
});

const summaryRecipient = computed(() => getSummaryRecipient(props.transferSummary, props.tx?.sender));

const isSingleTransferFlow = computed(() => {
  if (!props.tx?.sender) return false;
  if (!summaryRecipient.value || summaryRecipient.value.type !== "address") return false;
  const summary = props.transferSummary;
  if (!summary || typeof summary !== "object") return false;

  const targetCount = Number(summary.targetCount ?? summary.totalCount ?? 0);
  const isSingleTarget = summary.singleTarget === true || (Number.isFinite(targetCount) && targetCount === 1);

  if (!isSingleTarget) return false;
  return Boolean(transferText.value && transferText.value !== "—");
});

const now = useNow({ interval: 1000 });
const formatAge = (ts) => _formatAge(ts, now.value.getTime());

const normalizeVmState = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (!normalized) return "";
  if (normalized.includes("FAULT") || normalized === "FAILED" || normalized === "FAIL" || normalized === "ERROR") {
    return "FAULT";
  }
  if (normalized.includes("HALT") || normalized === "SUCCESS" || normalized === "SUCCEEDED") {
    return "HALT";
  }
  return "";
};

const vmState = computed(() => {
  const rawState =
    props.tx?.vmstate ??
    props.tx?.Vmstate ??
    props.tx?.VMState ??
    props.tx?.execution_state ??
    props.tx?.executionState ??
    props.tx?.tx_state ??
    props.tx?.txState ??
    props.tx?.state ??
    props.tx?.status;

  const normalized = normalizeVmState(rawState);

  if (!normalized) {
    if (props.tx?.status === "pending" || props.tx?.status?.toLowerCase() === "pending") {
      return "PENDING";
    }
    return "";
  }

  return normalized;
});

const isSuccess = computed(() => {
  if (!vmState.value) return null;
  return vmState.value === "HALT";
});

const statusStyle = computed(() => {
  if (props.tx?.status === "pending" || props.tx?.status?.toLowerCase() === "pending") {
    return { background: "var(--status-warning-bg)", color: "var(--status-warning)" };
  }
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
  if (props.tx?.status === "pending" || props.tx?.status?.toLowerCase() === "pending") return "PENDING";
  if (isSuccess.value === true) return "HALT";
  if (isSuccess.value === false) return "FAULT";
  return t("listItems.statusUnknown");
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
  if (summaryRecipient.value) {
    return summaryRecipient.value;
  }

  if (invocation.value?.contractHash) {
    const hash = canonicalizeContractHash(invocation.value.contractHash);
    return { hash, type: "contract" };
  }
  const to =
    tx.contractHash ||
    tx.contracthash ||
    tx.contract_hash ||
    tx.to ||
    tx.toAddress ||
    tx.toaddress ||
    tx.recipient ||
    tx.receiver;
  if (to) {
    // If it's a script hash, it's a contract. Otherwise, it's an address.
    const isAddress = String(to).startsWith("N");
    if (isAddress) {
      return { hash: to, type: "address" };
    }
    const hash = canonicalizeContractHash(to);
    return { hash, type: "contract" };
  }

  if (tx.notifications?.length > 0) {
    const notifyContract =
      tx.notifications[0]?.contract || tx.notifications[0]?.contractHash || tx.notifications[0]?.contracthash;
    if (notifyContract) {
      return { hash: canonicalizeContractHash(notifyContract), type: "contract" };
    }
  }

  if (tx.transfers?.length > 0) {
    const transferTo = tx.transfers[0]?.to || tx.transfers[0]?.toAddress || tx.transfers[0]?.receiver;
    if (transferTo) {
      if (String(transferTo).startsWith("N")) {
        return { hash: transferTo, type: "address" };
      }
      return { hash: canonicalizeContractHash(transferTo), type: "contract" };
    }
  }

  const transferContract = getSummaryContractHash(props.transferSummary);
  if (transferContract) {
    const isAddress = String(transferContract).startsWith("N");
    if (isAddress) {
      return { hash: transferContract, type: "address" };
    }
    const hash = canonicalizeContractHash(transferContract);
    return { hash, type: "contract" };
  }

  return null;
});

const methodName = computed(() => {
  const tx = props.tx;
  if (
    tx.attributes &&
    tx.attributes.some((a) => a.type === "OracleResponse" || a.usage === "OracleResponse" || a.type === 0x11)
  ) {
    return t("txDetail.actionOracle");
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
      (contractHash === POLICY_HASH || contractHash === ORACLE_HASH || contractHash === NEO_HASH)
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

  const transferContract = getSummaryContractHash(props.transferSummary);
  if (transferContract) {
    const hash = canonicalizeContractHash(transferContract);
    const knownContract = getKnownContractName(hash);
    if (knownContract) return knownContract;
    const contractName = getContractDisplayName(hash);
    if (contractName && !contractName.startsWith("0x")) return contractName;
  }

  if (tx.method) return tx.method;
  return null;
});

const methodBadge = computed(() => getNativeTokenBadge(recipient.value?.hash, methodName.value));

const txFee = computed(() => {
  const net = props.tx?.netfee ?? props.tx?.net_fee ?? 0;
  const sys = props.tx?.sysfee ?? props.tx?.sys_fee ?? 0;
  const total = Number(net) + Number(sys);
  if (!Number.isFinite(total) || total === 0) return "0";
  return formatGas(total, 5);
});
</script>
