<template>
  <div class="list-row border-b px-4 py-3">
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3 w-1/4">
        <!-- Block circle icon -->
        <div
          class="bg-icon-primary text-primary-500 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
        >
          Bk
        </div>
        <div class="min-w-0">
          <div class="flex min-w-0 items-center gap-1.5">
            <router-link
              :to="`/block-info/${block.hash}`"
              :title="blockHeightTitle"
              class="etherscan-link font-medium transition-colors"
            >
              #{{ formatNumber(block.index || 0) }}
            </router-link>
            <span
              v-if="stateRootValidated"
              class="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-status-success-bg text-[10px] leading-none text-status-success"
              :title="stateRootValidationTitle"
              :aria-label="stateRootValidationTitle"
              role="img"
            >
              ✅
            </span>
          </div>
          <p class="mt-0.5 text-xs text-mid">
            {{ formatAge(block.timestamp) }}
          </p>
        </div>
      </div>

      <!-- Validator (hidden on mobile) -->
      <div class="hidden min-w-0 flex-1 text-center md:block">
        <p class="text-xs text-mid truncate">
          <span class="inline-flex items-center gap-1.5">
            <img
              v-if="validatorLogo"
              :src="validatorLogo"
              :alt="$t('inline.validatorLogoAlt')"
              class="h-4 w-4 rounded-full object-cover bg-surface-elevated ring-1 ring-line-soft"
              onerror="this.src='/img/brand/neo.png'"
            />
            <router-link
              v-if="validatorAddress && resolvedPrimary !== undefined"
              :to="`/account-profile/${validatorAddress}`"
              class="etherscan-link"
            >
              {{ validatorName }}
            </router-link>
            <span v-else>{{ validatorName }}</span>
          </span>
        </p>
        <div v-if="!hasNamedValidatorIdentity" class="text-sm font-medium text-high truncate">
          <router-link
            v-if="validatorAddress"
            :to="`/account-profile/${validatorAddress}`"
            :title="validatorAddress"
            class="etherscan-link font-hash text-xs"
          >
            {{ truncateHash(validatorAddress, 8, 6) }}
          </router-link>
          <span v-else class="text-low">--</span>
        </div>
      </div>

      <!-- Fees (hidden on mobile) -->
      <div class="hidden min-w-0 flex-1 text-right lg:block">
        <p class="text-xs text-mid">{{ $t("listItems.totalFees") }}</p>
        <p class="text-sm font-medium text-high truncate">{{ blockFee }} GAS</p>
      </div>

      <!-- Tx count -->
      <div class="flex-shrink-0 text-right w-20">
        <p class="text-sm text-high">
          <span class="font-medium">{{ formatNumber(block.transactioncount || block.txcount || 0) }}</span>
          {{ $t("listItems.txns") }}
        </p>
        <p class="text-[10px] text-mid hidden md:block">{{ formatNumber(block.size || 0) }} B</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useNow } from "@vueuse/core";
import { formatAge as _formatAge, formatNumber, formatGas, truncateHash } from "@/utils/explorerFormat";
import { scriptHashToAddress } from "@/utils/neoHelpers";
import { useCommittee, isFallbackValidatorName } from "@/composables/useCommittee";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const { resolvePrimaryIndex, getPrimaryNodeName, getPrimaryNodeAddress, getPrimaryNodeLogo } = useCommittee();

const props = defineProps({
  block: { type: Object, default: () => ({}) },
  stateRootValidated: { type: Boolean, default: false },
  stateRootValidatedHeight: { type: [Number, String], default: null },
});

const now = useNow({ interval: 1000 });
const formatAge = (ts) => _formatAge(ts, now.value.getTime());

const resolvedPrimary = computed(() => resolvePrimaryIndex(props.block));

const validatorHintAddress = computed(() => {
  const raw =
    props.block.nextconsensus ??
    props.block.nextConsensus ??
    props.block.speaker ??
    props.block.validator ??
    "";

  if (!raw) return "";
  if (String(raw).startsWith("N")) return String(raw);
  return scriptHashToAddress(String(raw));
});

const validatorName = computed(() => {
  if (resolvedPrimary.value === undefined) return t("validator.validator");
  return getPrimaryNodeName(resolvedPrimary.value, validatorHintAddress.value) || t("validator.consensusNode");
});

const validatorLogo = computed(() => {
  if (resolvedPrimary.value === undefined) return "";
  return getPrimaryNodeLogo(resolvedPrimary.value) || "";
});

const validatorAddress = computed(() => {
  // Always try to pull the mapped address directly for the primary consensus node first
  if (resolvedPrimary.value !== undefined) {
    const directAddr = getPrimaryNodeAddress(resolvedPrimary.value);
    if (directAddr) return scriptHashToAddress(directAddr);
  }
  return validatorHintAddress.value;
});

const stateRootValidatedHeightNumber = computed(() => {
  const value = Number(props.stateRootValidatedHeight);
  return Number.isFinite(value) && value >= 0 ? value : null;
});

const stateRootValidationTitle = computed(() => {
  if (!props.stateRootValidated || stateRootValidatedHeightNumber.value === null) {
    return t("homePage.miniValidatedStateRoot");
  }
  return t("homePage.stateRootValidatedThrough", { n: formatNumber(stateRootValidatedHeightNumber.value) });
});

const blockHeightTitle = computed(() => {
  const hash = String(props.block?.hash || "").trim();
  if (!props.stateRootValidated) return hash;
  return hash ? `${hash} · ${stateRootValidationTitle.value}` : stateRootValidationTitle.value;
});

const hasNamedValidatorIdentity = computed(() => {
  const name = String(validatorName.value || "").trim();
  if (!name) return false;
  if (name === t("validator.validator")) return false;
  return !isFallbackValidatorName(name);
});

const blockFee = computed(() => {
  const directSys = Number(props.block.sysfee ?? props.block.systemFee ?? props.block.sys_fee ?? props.block.totalSysFee);
  const directNet = Number(props.block.netfee ?? props.block.networkFee ?? props.block.net_fee ?? props.block.totalNetFee);
  const hasDirectSys = Number.isFinite(directSys);
  const hasDirectNet = Number.isFinite(directNet);

  let sys = hasDirectSys ? directSys : 0;
  let net = hasDirectNet ? directNet : 0;

  const shouldUseTxFallback =
    Array.isArray(props.block.tx) &&
    props.block.tx.length > 0 &&
    (!hasDirectSys || !hasDirectNet || (sys === 0 && net === 0));

  if (shouldUseTxFallback) {
    sys = props.block.tx.reduce((sum, tx) => sum + Number(tx?.sysfee ?? tx?.systemFee ?? tx?.sys_fee ?? 0), 0);
    net = props.block.tx.reduce((sum, tx) => sum + Number(tx?.netfee ?? tx?.networkFee ?? tx?.net_fee ?? 0), 0);
  }

  return formatGas(sys + net);
});
</script>
