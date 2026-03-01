<template>
  <div class="candidates-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Candidates' }]" />

      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">{{ $t("nav.consensusNodes") || "Consensus Candidates" }}</h1>
          <p class="page-subtitle">Neo N3 consensus node candidates and voting</p>
        </div>
      </div>

      <div class="etherscan-card overflow-hidden">
        <div class="card-header">
          <p class="text-mid text-sm">Candidate list</p>
          <p class="text-low text-sm">Page {{ currentPage }} / {{ totalPages }}</p>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in pageSize" :key="index" height="44px" />
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="p-4">
          <ErrorState title="Failed to load candidates" :message="error" @retry="() => loadPage(currentPage)" />
        </div>

        <!-- Empty state -->
        <div v-else-if="candidates.length === 0" class="p-4">
          <EmptyState message="No candidates found" />
        </div>

        <!-- Data table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[760px]">
            <thead class="table-head">
              <tr>
                <th class="table-header-cell">#</th>
                <th class="table-header-cell">Candidate / Address</th>
                <th class="table-header-cell-right">Votes</th>
                <th class="table-header-cell text-center">Status</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr
                v-for="(candidate, index) in candidatesWithMeta"
                :key="candidate.candidate"
                class="list-row group"
              >
                <td class="table-cell-secondary w-16">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="table-cell">
                  <div class="flex items-center gap-3">
                    <img 
                      v-if="getLogo(candidate)"
                      :src="getLogo(candidate)" 
                      class="h-6 w-6 rounded-full bg-surface-elevated ring-1 ring-line-soft object-cover flex-shrink-0" 
                      alt="Logo"
                      @error="$event.target.src = '/img/brand/neo.png'"
                    />
                    <div v-else class="h-6 w-6 rounded-full bg-surface-elevated ring-1 ring-line-soft flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-mid">
                      N3
                    </div>
                    <div class="min-w-0 flex flex-col gap-0.5">
                      <span v-if="candidate.metaName || getKnownName(candidate.candidate)" class="inline-block font-semibold text-high text-sm">
                        {{ candidate.metaName || getKnownName(candidate.candidate) }}
                      </span>
                      <HashLink :hash="candidate.candidate" type="address" :truncated="true" />
                      <span v-if="candidate.publickey || candidate.metaPubkey" class="text-low text-[10px] font-mono break-all">{{ candidate.publickey || candidate.metaPubkey }}</span>
                    </div>
                  </div>
                </td>
                <td class="table-cell-right font-medium text-high">
                  {{ formatVotes(candidate.votes) }}
                </td>
                <td class="table-cell text-center">
                  <StatusBadge :status="candidate.isCommittee ? 'success' : 'pending'" :text="candidate.isCommittee ? 'Consensus' : 'Standby'" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="!loading && candidates.length > 0"
          class="soft-divider border-t px-4 py-3"
        >
          <EtherscanPagination
            :page="currentPage"
            :total-pages="totalPages"
            :page-size="pageSize"
            :total="totalCount"
            @update:page="goToPage"
            @update:page-size="changePageSize"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useI18n } from "vue-i18n";
import { candidateService } from "@/services";
import { getCacheKey, cachedRequest } from "@/services/cache";
import { usePagination } from "@/composables/usePagination";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import StatusBadge from "@/components/common/StatusBadge.vue";
import HashLink from "@/components/common/HashLink.vue";
import { getCurrentEnv, NET_ENV } from '@/utils/env';
import { KNOWN_ADDRESSES } from '@/constants/knownAddresses';
import { publicKeyToAddress, addressToScriptHash } from '@/utils/neoHelpers';

const { t } = useI18n();

const {
  items: candidates,
  loading,
  error,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  loadPage,
  goToPage,
  changePageSize,
} = usePagination((limit, skip) => candidateService.getList(limit, skip), {
  routeSync: { basePath: "/candidates" },
  cacheKeyFn: (limit, skip) => getCacheKey("candidate_list", { limit, skip }),
  errorMessage: t("errors.loadCandidates"),
});

const doraMetadata = ref({});

async function loadDoraMetadata() {
  const env = getCurrentEnv().toLowerCase();
  const isTestnet = env.includes(NET_ENV.TestT5.toLowerCase()) || env.includes("test");
  if (isTestnet) return;
  const url = `https://dora.coz.io/api/v1/neo3/mainnet/committee`;
  
  try {
    const data = await cachedRequest(
      `dora_metadata_mainnet`,
      () => fetch(url).then(r => r.ok ? r.json() : []),
      300000 // 5 minutes cache
    );
    
    const metaMap = {};
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.pubkey) {
          try {
             const addr = publicKeyToAddress(item.pubkey);
             const scriptHash = addressToScriptHash(addr);
             metaMap[item.pubkey] = item;
             metaMap[addr] = item;
             metaMap[scriptHash] = item;
          } catch(e) {
             // Ignore error mapping individual public keys
          }
        }
      }
    }
    doraMetadata.value = metaMap;
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load Dora metadata", err);
  }
}

watch(candidates, () => {
  if (candidates.value.length > 0 && Object.keys(doraMetadata.value).length === 0) {
    loadDoraMetadata();
  }
}, { immediate: true });

const candidatesWithMeta = computed(() => {
  return candidates.value.map(c => {
    // c.candidate is the script hash.
    const meta = doraMetadata.value[c.candidate] || doraMetadata.value[c.publickey] || {};
    return {
      ...c,
      metaName: meta.name || null,
      metaLogo: meta.logo || null,
      metaPubkey: meta.pubkey || null,
    };
  });
});

function getKnownName(address) {
  return KNOWN_ADDRESSES[address] || null;
}

function getLogo(candidate) {
  if (candidate.metaLogo) {
    if (candidate.metaLogo.startsWith("http")) return candidate.metaLogo;
    return `https://filesend.ngd.network/gate/get/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc/${candidate.metaLogo}`;
  }
  
  const env = getCurrentEnv();
  const pubkey = candidate.publickey || candidate.metaPubkey;
  if (env === NET_ENV.Mainnet && pubkey) {
    return `https://governance.neo.org/logo/${pubkey}.png`;
  }
  return null;
}

function formatVotes(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString() : "0";
}
</script>
