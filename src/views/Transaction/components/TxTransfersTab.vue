<template>
  <div>
    <!-- Loading -->
    <div v-if="transfersLoading" class="py-8 text-center">
      <div class="space-y-3">
        <Skeleton class="mx-auto" width="75%" height="16px" />
        <Skeleton class="mx-auto" width="50%" height="16px" />
      </div>
    </div>
    <!-- Empty -->
    <EmptyState v-else-if="allTransfers.length === 0" message="No token transfers found for this transaction." icon="tx" />
    <!-- Content -->
    <div v-else class="surface-panel overflow-x-auto">
      <table class="w-full min-w-[780px] text-sm" aria-label="Transaction token transfers">
        <caption class="sr-only">
          NEP transfer list for this transaction
        </caption>
        <thead class="table-head">
          <tr class="soft-divider border-b">
            <th class="table-header-cell">#</th>
            <th class="table-header-cell">Type</th>
            <th class="table-header-cell">From</th>
            <th class="table-header-cell">To</th>
            <th class="table-header-cell-right">Amount</th>
            <th class="table-header-cell">Token ID</th>
            <th class="table-header-cell">Token</th>
            <th class="table-header-cell">Contract</th>
          </tr>
        </thead>
        <tbody class="soft-divider divide-y">
          <tr v-for="(t, tIdx) in allTransfers" :key="'xfer-' + tIdx" class="list-row group">
            <td class="table-cell-secondary text-xs">{{ tIdx + 1 }}</td>
            <td class="table-cell">
              <span
                class="badge-soft rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                :class="
                  t._standard === 'NEP-11'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                "
              >
                {{ t._standard }}
              </span>
            </td>
            <td class="table-cell">
              <div v-if="t.from" class="max-w-[120px] md:max-w-[200px] lg:max-w-none truncate">
                <HashLink :hash="scriptHashToAddress(t.from)" type="address" :truncated="false" />
              </div>
              <span v-else class="text-mid text-xs italic">Mint</span>
            </td>
            <td class="table-cell">
              <div v-if="t.to" class="max-w-[120px] md:max-w-[200px] lg:max-w-none truncate">
                <HashLink :hash="scriptHashToAddress(t.to)" type="address" :truncated="false" />
              </div>
              <span v-else class="text-mid text-xs italic">Burn</span>
            </td>
            <td class="table-cell-right font-mono text-xs">
              {{ formatTransferAmount(t) }}
            </td>
            <td class="table-cell">
              <div v-if="t._standard === 'NEP-11' && t.tokenId" class="max-w-[120px] truncate">
                <router-link
                  :to="`/nft-info/${t.contract || t.contractHash}/${t.to || t.from}/${t.tokenId}`"
                  class="font-hash etherscan-link"
                  :title="t.tokenId"
                >
                  #{{ t.tokenId }}
                </router-link>
              </div>
              <span v-else class="text-low">-</span>
            </td>
            <td class="table-cell">
              <span
                class="badge-soft inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium text-high"
              >
                <img :src="getTokenLogo(t)" alt="logo" class="w-4 h-4 rounded-full object-cover bg-white/5" />
                {{ t.tokenname || t.symbol || "Unknown" }}
              </span>
            </td>
            <td class="table-cell">
              <HashLink v-if="t.contract || t.contractHash" :hash="t.contract || t.contractHash" type="contract" />
              <span v-else class="text-low">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import HashLink from "@/components/common/HashLink.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import { GAS_DECIMALS } from "@/constants";
import { scriptHashToAddress } from "@/utils/neoHelpers";
import { tokenService } from "@/services/tokenService";
import { NATIVE_CONTRACTS } from "@/constants";
import { formatTokenAmount } from "@/utils/explorerFormat";
import { ref, watch } from "vue";

defineProps({
  allTransfers: { type: Array, default: () => [] },
  transfersLoading: { type: Boolean, default: false },
});

const tokenDecimalsMap = ref({});

watch(
  () => props.allTransfers,
  async (xfers) => {
    if (!xfers) return;
    const fetchPromises = [];
    
    for (const t of xfers) {
      if (t.decimals !== undefined && t.decimals !== null) continue;
      
      const hash = (t.contract || t.contractHash)?.toLowerCase();
      if (!hash || NATIVE_CONTRACTS[hash]) continue;
      
      if (tokenDecimalsMap.value[hash] === undefined) {
         tokenDecimalsMap.value[hash] = 0;
         fetchPromises.push(
           tokenService.getByHash(hash).then(token => {
             if (token && typeof token.decimals !== 'undefined') {
               tokenDecimalsMap.value[hash] = Number(token.decimals);
             }
           }).catch(e => {})
         );
      }
    }
    
    await Promise.all(fetchPromises);
  },
  { immediate: true, deep: true }
);

const localImages = import.meta.glob('@/assets/gui/*.png', { eager: true, import: 'default' });

function getTokenLogo(t) {
  const hash = (t.contract || t.contractHash || "").toLowerCase();
  const path = `/src/assets/gui/${hash}.png`;
  
  if (localImages[path]) {
    return localImages[path];
  }
  
  const isNep11 = t._standard && t._standard.toUpperCase().includes("NEP-11");
  const fallbackPath = isNep11 ? "/src/assets/gui/defaultNep11.png" : "/src/assets/gui/defaultNep17.png";
  return localImages[fallbackPath] || "";
}

function formatTransferAmount(t) {
  const raw = t.value || t.amount || 0;
  let dec = t.decimals;
  
  if (dec === undefined || dec === null) {
     const hash = (t.contract || t.contractHash)?.toLowerCase();
     if (hash && NATIVE_CONTRACTS[hash]) {
       dec = NATIVE_CONTRACTS[hash].decimals;
     } else if (hash && tokenDecimalsMap.value[hash] !== undefined) {
       dec = tokenDecimalsMap.value[hash];
     } else {
       dec = 0;
     }
  }
  
  return formatTokenAmount(raw, dec, 8);
}
</script>
