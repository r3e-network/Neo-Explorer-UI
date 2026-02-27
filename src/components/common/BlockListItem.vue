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
          <router-link
            :to="`/block-info/${block.hash}`"
            :title="block.hash"
            class="etherscan-link font-medium transition-colors"
          >
            #{{ formatNumber(block.index || 0) }}
          </router-link>
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
              alt="Validator logo"
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
        <div class="text-sm font-medium text-high truncate">
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
        <p class="text-xs text-mid">Total Fees</p>
        <p class="text-sm font-medium text-high truncate">{{ blockFee }} GAS</p>
      </div>

      <!-- Tx count -->
      <div class="flex-shrink-0 text-right w-20">
        <p class="text-sm text-high">
          <span class="font-medium">{{ formatNumber(block.transactioncount || block.txcount || 0) }}</span>
          txns
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
import { useCommittee } from "@/composables/useCommittee";

const { resolvePrimaryIndex, getPrimaryNodeName, getPrimaryNodeAddress, getPrimaryNodeLogo } = useCommittee();

const props = defineProps({
  block: { type: Object, default: () => ({}) },
});

const now = useNow({ interval: 1000 });
const formatAge = (ts) => _formatAge(ts, now.value.getTime());

const resolvedPrimary = computed(() => resolvePrimaryIndex(props.block));

const validatorName = computed(() => {
  if (resolvedPrimary.value === undefined) return "Validator";
  return getPrimaryNodeName(resolvedPrimary.value) || "Consensus Node";
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

  // Fallback to legacy consensus pointers from indexed block
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

const blockFee = computed(() => {
  const sys = Number(props.block.sysfee || 0);
  const net = Number(props.block.netfee || 0);
  return formatGas(sys + net);
});
</script>
