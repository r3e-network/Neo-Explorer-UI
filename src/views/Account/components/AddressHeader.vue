<template>
  <div class="detail-hero detail-hero-enhanced detail-hero-circuit">
    <!-- Circuit particles -->
    <span class="circuit-particle"></span>
    <span class="circuit-particle"></span>
    <span class="circuit-particle"></span>
    <span class="circuit-particle"></span>

    <div class="flex items-start gap-3">
      <!-- Icon logic: Show resolved identity logo first, else standard or special icon -->
      <div v-if="headerLogo" class="h-10 w-10 flex-shrink-0">
        <img
          :src="headerLogo"
          class="h-10 w-10 rounded-full object-cover ring-1 ring-line-soft bg-white"
          :alt="primaryIdentityName || 'Address Logo'"
          @error="$event.target.src = '/img/brand/neo.png'"
        />
      </div>
      <div
        v-else-if="isNeoFoundation"
        class="page-header-icon bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400 relative"
      >
        <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span class="glow-dot absolute -right-0.5 -bottom-0.5"></span>
      </div>
      <div v-else class="page-header-icon bg-orange-100 text-orange-500 dark:bg-orange-900/40 dark:text-orange-400 relative">
        <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span
            v-if="publicTag"
            class="inline-flex min-w-0 max-w-full items-center gap-1.5 break-all rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
          >
            <img
              v-if="publicTagLogo"
              :src="publicTagLogo"
              class="h-3.5 w-3.5 flex-shrink-0 rounded-full object-cover bg-white"
              :alt="$t('addressDetail.publicTagAlt')"
            />
            {{ publicTag }}
          </span>
          <h1 class="page-title neon-glow-text">
            {{
              isNeoFoundation
                ? $t("addressDetail.titleNeoFoundation")
                : candidateData
                ? $t("addressDetail.titleCandidate")
                : isContract
                ? $t("addressDetail.titleContract")
                : $t("addressDetail.titleAddress")
            }}
          </h1>
          <span
            v-if="isContract"
            class="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
          >
            {{ $t("addressDetail.badgeContract") }}
          </span>
          <span
            v-if="candidateData"
            class="rounded-lg px-2.5 py-1 text-xs font-semibold"
            :class="
              candidateData.isCommittee
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            "
          >
            {{
              candidateData.isCommittee ? $t("addressDetail.badgeConsensus") : $t("addressDetail.badgeStandby")
            }}
          </span>
        </div>
        <div class="detail-metadata mt-1">
          <span v-if="candidateData?.metaName" class="detail-chip font-bold text-cyan-600 dark:text-cyan-400">
            {{ candidateData.metaName }}
          </span>
          <span
            v-else-if="knownName"
            class="detail-chip font-bold"
            :class="isNeoFoundation ? 'text-primary-600 dark:text-primary-400' : 'text-primary-600 dark:text-primary-400'"
          >
            {{ knownName }}
          </span>
          <span v-else-if="contractIdentityName" class="detail-chip font-bold text-violet-600 dark:text-violet-300">
            {{ contractIdentityName }}
          </span>
          <span v-if="nnsName" class="detail-chip font-bold text-primary-600 dark:text-primary-400">
            {{ nnsName }}
          </span>
          <span class="detail-chip font-hash break-all">{{ address }}</span>
          <CopyButton :text="address" />
          <button
            class="detail-chip hover:text-primary-600 dark:hover:text-primary-300"
            :title="$t('addressDetail.qrShow')"
            :aria-label="$t('addressDetail.qrToggleAria')"
            @click="$emit('update:showQr', !showQr)"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 14h1v1h-1zM14 17h1v1h-1zM20 17h1v1h-1zM17 20h1v1h-1z"
              />
            </svg>
            QR
          </button>
        </div>

        <!-- Candidate specific stats row -->
        <div v-if="candidateData" class="flex items-center gap-4 mt-3 text-sm flex-wrap">
          <div class="flex items-center gap-1.5">
            <span class="text-mid">{{ $t("addressDetail.candidateVotes") }}</span>
            <span class="font-bold text-high">{{ formatNumber(candidateVotesDisplay) }}</span>
          </div>
          <div v-if="candidateData.metaLocation" class="flex items-center gap-1.5">
            <span class="text-mid">{{ $t("addressDetail.candidateLocation") }}</span>
            <span class="font-medium text-high">{{ candidateData.metaLocation }}</span>
          </div>
          <div v-if="candidateData.publickey" class="flex items-center gap-1.5 min-w-0">
            <span class="text-mid">{{ $t("addressDetail.candidatePubkey") }}</span>
            <span class="font-hash text-high truncate max-w-[200px] sm:max-w-xs">{{ candidateData.publickey }}</span>
            <CopyButton :text="candidateData.publickey" size="xs" />
          </div>
        </div>

        <!-- QR code -->
        <div
          v-if="showQr"
          class="surface-panel mt-3 inline-block rounded-xl p-4 shadow-sm border border-line-soft bg-white"
        >
          <div class="flex flex-col items-center gap-3">
            <div class="bg-white p-2 rounded-lg">
              <qrcode-vue :value="address" :size="150" level="H" />
            </div>
            <p class="text-mid max-w-[200px] break-all text-center font-hash text-xs">
              {{ address }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Balance overview cards -->
  <div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
    <DashboardStatCard
      :label="$t('addressDetail.statNeoBalance')"
      :value="summaryLoading ? null : toTokenAmountNumber(neoBalance, 0)"
      :decimals="0"
      suffix=" NEO"
      :subtitle="formatApproxUsd(neoUsdValue)"
      icon="<svg class='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>"
      glow-color="var(--link)"
    />
    <DashboardStatCard
      :label="$t('addressDetail.statGasBalance')"
      :value="summaryLoading ? null : toTokenAmountNumber(gasBalance, GAS_DECIMALS)"
      :decimals="8"
      suffix=" GAS"
      :subtitle="formatApproxUsd(gasUsdValue)"
      icon="<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 10V3L4 14h7v7l9-11h-7z'/></svg>"
      glow-color="#f59e0b"
    />
    <DashboardStatCard
      :label="$t('addressDetail.statTransactions')"
      :value="txCount"
      animated
      icon="<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'/></svg>"
      glow-color="#3b82f6"
    />
    <DashboardStatCard
      :label="$t('addressDetail.statTokenHoldings')"
      :value="tokenCount"
      animated
      icon="<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'/></svg>"
      glow-color="#8b5cf6"
    />
    <DashboardStatCard
      v-if="totalUsdValue"
      :label="$t('addressDetail.statTotalValue')"
      :value="totalUsdValue"
      :decimals="2"
      prefix="$"
      icon="<svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'/></svg>"
      glow-color="#10b981"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import QrcodeVue from "qrcode.vue";
import DashboardStatCard from "@/components/charts/DashboardStatCard.vue";
import { formatNumber, toTokenAmountNumber } from "@/utils/explorerFormat";
import { pickBestCandidateVotes } from "@/utils/addressDetail";
import { supabaseService } from "@/services/supabaseService";
import CopyButton from "@/components/common/CopyButton.vue";
import nnsService from "@/services/nnsService";
import { GAS_DECIMALS, NATIVE_CONTRACTS } from "@/constants";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import { addressToScriptHash } from "@/utils/neoHelpers";
import { getKnownAddressLogo, getKnownAddressName } from "@/constants/knownAddresses";
import { optimizeLogoUrl } from "@/utils/logoOptimization";
import { usePriceCache } from "@/composables/usePriceCache";
import { resolveNetworkName } from "@/utils/env";

const props = defineProps({
  address: { type: String, default: "" },
  isContract: { type: Boolean, default: false },
  showQr: { type: Boolean, default: false },
  neoBalance: { type: String, default: "0" },
  gasBalance: { type: String, default: "0" },
  txCount: { type: Number, default: 0 },
  tokenCount: { type: Number, default: 0 },
  candidateData: { type: Object, default: null },
  summaryLoading: { type: Boolean, default: false },
});

defineEmits(["update:showQr"]);

const { prices, fetchPrices } = usePriceCache();
onMounted(() => {
  fetchPrices();
});

const neoUsdValue = computed(() => {
  const bal = toTokenAmountNumber(props.neoBalance, 0);
  if (!bal || !prices.value.neo) return 0;
  return bal * prices.value.neo;
});
const gasUsdValue = computed(() => {
  const bal = toTokenAmountNumber(props.gasBalance, GAS_DECIMALS);
  if (!bal || !prices.value.gas) return 0;
  return bal * prices.value.gas;
});
const totalUsdValue = computed(() => neoUsdValue.value + gasUsdValue.value);

function formatUsd(value) {
  const n = Number(value || 0);
  if (!n) return "";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 4 : 2 });
}

function formatApproxUsd(value) {
  const formatted = formatUsd(value);
  return formatted ? `≈ ${formatted}` : "";
}

const nnsName = ref("");
const publicTag = ref(null);
const publicTagLogo = ref("");
const contractMeta = ref(null);

const normalizeContractHash = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "";
  return raw.startsWith("0x") ? raw : `0x${raw}`;
};

const fetchPublicTag = async (addr, isContract) => {
  const requestNetwork = resolveNetworkName();
  publicTag.value = null;
  publicTagLogo.value = "";

  const lookupTarget = isContract ? normalizeContractHash(addressToScriptHash(addr)) || addr : addr;

  try {
    const tagData = await supabaseService.getAddressTag(lookupTarget, requestNetwork);
    if (resolveNetworkName() !== requestNetwork) return;
    if (tagData) {
      publicTag.value = tagData.label;
      publicTagLogo.value = tagData.logo_url || "";
    }
  } catch (_err) {
    publicTag.value = null;
    publicTagLogo.value = "";
  }
};

const fetchContractMeta = async (addr, isContract) => {
  const requestNetwork = resolveNetworkName();
  contractMeta.value = null;

  if (!isContract) return;

  const contractHash = normalizeContractHash(addressToScriptHash(addr));
  if (!contractHash) return;

  try {
    const metadata = await supabaseService.getContractMetadata(contractHash, requestNetwork);
    if (resolveNetworkName() !== requestNetwork) return;
    if (metadata) {
      contractMeta.value = metadata;
    }
  } catch (_err) {
    contractMeta.value = null;
  }
};

const fetchNnsName = async (addr, isContract) => {
  nnsName.value = "";

  const lookupTarget = isContract ? normalizeContractHash(addressToScriptHash(addr)) : addr;

  if (!lookupTarget || knownName.value) return;

  try {
    const res = await nnsService.resolveAddressToNNS(lookupTarget);
    if (res && res.nns) {
      nnsName.value = res.nns;
    }
  } catch (_err) {
    nnsName.value = "";
  }
};

const knownName = computed(() => {
  return getKnownAddressName(props.address) || null;
});

const isNeoFoundation = computed(() => {
  if (!knownName.value) return false;
  const name = knownName.value.toLowerCase();
  return name.includes("neo foundation") || name.includes("neo bond") || name.includes("nf binance");
});

const knownLogo = computed(() => {
  const logo = String(getKnownAddressLogo(props.address) || "").trim();
  return logo ? optimizeLogoUrl(logo, { kind: "user" }) : "";
});

const contractIdentityName = computed(() => {
  if (!props.isContract) return "";

  const contractHash = normalizeContractHash(addressToScriptHash(props.address));
  const native = contractHash ? NATIVE_CONTRACTS[contractHash] : null;
  if (native?.name) return native.name;

  const known = contractHash ? KNOWN_CONTRACTS[contractHash] : null;
  if (known?.name) return known.name;

  return String(contractMeta.value?.display_name || contractMeta.value?.name || "").trim();
});

const contractIdentityLogo = computed(() => {
  if (!props.isContract) return "";

  const contractHash = normalizeContractHash(addressToScriptHash(props.address));
  const native = contractHash ? NATIVE_CONTRACTS[contractHash] : null;
  if (native?.logo) return optimizeLogoUrl(native.logo, { kind: "contract" });

  const known = contractHash ? KNOWN_CONTRACTS[contractHash] : null;
  if (known?.logo) return optimizeLogoUrl(known.logo, { kind: "contract" });

  return String(contractMeta.value?.logo_url || contractMeta.value?.logo || "").trim();
});

const primaryIdentityName = computed(() => {
  return publicTag.value || props.candidateData?.metaName || knownName.value || contractIdentityName.value || "";
});

const headerLogo = computed(() => {
  return publicTagLogo.value || props.candidateData?.metaLogo || knownLogo.value || contractIdentityLogo.value || "";
});

const candidateVotesDisplay = computed(() => pickBestCandidateVotes(props.candidateData));

watch(
  [() => props.address, () => props.isContract],
  async ([newAddr, isContract]) => {
    if (!newAddr) return;

    await Promise.allSettled([
      fetchPublicTag(newAddr, isContract),
      fetchContractMeta(newAddr, isContract),
      fetchNnsName(newAddr, isContract),
    ]);
  },
  { immediate: true },
);
</script>
