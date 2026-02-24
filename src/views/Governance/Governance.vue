<template>
  <div class="governance-page">
    <section class="max-w-[1400px] mx-auto px-4 py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Governance' }]" />

      <div class="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div class="flex items-center gap-3">
          <div class="page-header-icon bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-300">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <div>
            <h1 class="page-title">{{ $t("nav.governance") || "Governance" }}</h1>
            <p class="page-subtitle">Participate in Neo N3 consensus by voting for a candidate node</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <span v-if="account" class="text-sm font-medium text-high px-4 py-2 rounded-lg bg-surface-elevated border border-line-soft">
            {{ formatAccount(account) }}
          </span>
          <button 
            @click="toggleWallet" 
            :class="[
              'px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95',
              account ? 'bg-error-100 text-error-600 dark:bg-error-900/40 dark:text-error-400 border border-error-500/20' : 'btn-primary'
            ]"
          >
            {{ account ? 'Disconnect' : 'Connect Wallet' }}
          </button>
        </div>
      </div>

      <!-- Voting Reward Calculator -->
      <div class="etherscan-card mb-6 overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 gap-4">
          <div class="flex items-center gap-4">
            <label for="neo-amount" class="text-sm font-semibold text-high whitespace-nowrap">
              My NEO to Vote:
            </label>
            <div class="relative max-wxs">
              <input
                id="neo-amount"
                type="number"
                v-model.number="userNeoAmount"
                min="1"
                class="form-input w-32 py-2 pr-12 text-sm font-semibold text-high"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-mid">NEO</span>
            </div>
            <span class="hidden md:inline-block text-xs text-mid">
              Estimated rewards based on network total votes and 15s block time.
            </span>
          </div>
          <div v-if="neoPrice && gasPrice" class="flex items-center gap-4 text-xs font-semibold text-mid">
            <span class="inline-flex items-center gap-1.5 rounded-lg border border-line-soft bg-surface-elevated px-2.5 py-1.5">
              NEO: <span class="text-high">${{ neoPrice.toFixed(2) }}</span>
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-lg border border-line-soft bg-surface-elevated px-2.5 py-1.5">
              GAS: <span class="text-high">${{ gasPrice.toFixed(2) }}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="etherscan-card overflow-hidden">
        <div class="card-header flex justify-between items-center flex-wrap gap-3">
          <div>
            <p class="text-mid text-sm">Node Candidates</p>
            <p class="text-low text-sm">Select a candidate below to cast your NEO votes</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-mid font-medium uppercase tracking-wide">Sort by:</span>
            <select 
              v-model="sortBy"
              class="bg-surface-elevated border border-line-soft rounded-lg px-3 py-1.5 text-sm text-high focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="votes">Votes (High to Low)</option>
              <option value="apr">APR (High to Low)</option>
            </select>
          </div>
        </div>

        <div v-if="loading" class="p-4 space-y-2">
          <Skeleton v-for="i in 10" :key="i" height="44px" />
        </div>

        <div v-else-if="error" class="p-4">
          <ErrorState title="Failed to load candidates" :message="error" @retry="loadCandidates" />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[960px]">
            <thead class="table-head">
              <tr>
                <th class="table-header-cell w-16">#</th>
                <th class="table-header-cell">Public Key / Name</th>
                <th class="table-header-cell-right">Votes</th>
                <th class="table-header-cell text-center">Status</th>
                <th class="table-header-cell-right">Liveness</th>
                <th class="table-header-cell-right">Est. GAS / Month</th>
                <th class="table-header-cell-right">APR</th>
                <th class="table-header-cell-right">Action</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <!-- NeoBurger Row -->
              <tr class="list-row group bg-amber-50/50 dark:bg-amber-900/10">
                <td class="table-cell-secondary">
                  <span class="text-xl">🍔</span>
                </td>
                <td class="table-cell">
                  <div class="flex items-center gap-3">
                    <img 
                      src="https://app.neoburger.io/favicon.ico" 
                      class="h-6 w-6 rounded-full bg-white ring-1 ring-line-soft object-cover flex-shrink-0" 
                      alt="NeoBurger Logo"
                    />
                    <div class="min-w-0 flex flex-col gap-0.5">
                      <span class="inline-flex items-center gap-1.5 font-bold text-high text-sm">
                        NeoBurger
                        <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Recommended
                        </span>
                      </span>
                      <span class="text-low text-[10px] font-medium break-all">Smart automated voting strategy</span>
                    </div>
                  </div>
                </td>
                <td class="table-cell-right font-medium text-high">
                  <span class="text-mid text-xs">Pooled</span>
                </td>
                <td class="table-cell text-center">
                  <span class="inline-block px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Optimized
                  </span>
                </td>
                <td class="table-cell-right font-medium text-high">
                  <span class="text-mid text-xs">--</span>
                </td>
                <td class="table-cell-right font-medium text-status-success">
                  ~ {{ (neoBurgerMonthlyGas).toFixed(4) }} GAS
                </td>
                <td class="table-cell-right font-bold text-amber-600 dark:text-amber-400">
                  ~ {{ (neoBurgerApr).toFixed(2) }}%
                </td>
                <td class="table-cell-right">
                  <a 
                    href="https://app.neoburger.io/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                  >
                    Go to NeoBurger
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </td>
              </tr>

              <!-- Standard Candidates -->
              <tr v-for="(candidate) in sortedCandidates" :key="candidate.publickey" class="list-row group">
                <td class="table-cell-secondary">{{ candidates.indexOf(candidate) + 1 }}</td>
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
                      <span v-if="getKnownName(candidate)" class="inline-block font-semibold text-high text-sm">
                        {{ getKnownName(candidate) }}
                      </span>
                      <router-link 
                        :to="`/account-profile/${publicKeyToAddress(candidate.publickey)}`" 
                        class="etherscan-link font-hash text-xs break-all" 
                        :title="candidate.publickey"
                      >
                        {{ publicKeyToAddress(candidate.publickey) }}
                      </router-link>
                      <span class="text-low text-[10px] font-mono break-all">{{ candidate.publickey }}</span>
                    </div>
                  </div>
                </td>
                <td class="table-cell-right font-medium text-high">
                  {{ formatVotes(candidate.votes) }}
                </td>
                <td class="table-cell text-center">
                  <span :class="[
                    'inline-block px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-semibold',
                    candidate.active ? 'bg-status-success-bg text-status-success' : 'bg-surface-elevated text-mid border border-line-soft'
                  ]">
                    {{ candidate.active ? 'Active' : 'Standby' }}
                  </span>
                </td>
                <td class="table-cell-right font-medium text-high text-xs">
                  <template v-if="candidates.indexOf(candidate) < 7 && livenessData[candidates.indexOf(candidate)]">
                    <span :class="livenessData[candidates.indexOf(candidate)].ratio >= 99 ? 'text-status-success' : 'text-status-warning'">
                      {{ livenessData[candidates.indexOf(candidate)].ratio }}%
                    </span>
                  </template>
                  <span v-else class="text-mid">--</span>
                </td>
                <td class="table-cell-right font-medium text-status-success">
                  {{ calculateMonthlyGas(candidate.votes, candidates.indexOf(candidate)).toFixed(4) }} GAS
                </td>
                <td class="table-cell-right font-medium text-primary-500">
                  {{ calculateAPR(candidate.votes, candidates.indexOf(candidate)).toFixed(2) }}%
                </td>
                <td class="table-cell-right">
                  <button 
                    @click="handleVote(candidate)"
                    :disabled="!account || voting"
                    class="btn-mini px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Vote
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { rpc } from '@cityofzion/neon-js';
import { getRpcClientUrl, getCurrentEnv, NET_ENV } from '@/utils/env';
import { connectedAccount, connectWallet, disconnectWallet, voteForCandidate } from '@/utils/wallet';
import Breadcrumb from '@/components/common/Breadcrumb.vue';
import Skeleton from '@/components/common/Skeleton.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import { useToast } from 'vue-toastification';
import { usePriceCache } from '@/composables/usePriceCache';
import { KNOWN_ADDRESSES } from '@/constants/knownAddresses';
import { publicKeyToAddress } from '@/utils/neoHelpers';

const toast = useToast();
const { fetchPrices } = usePriceCache();

const candidates = ref([]);
const livenessData = ref({});
const sortBy = ref('votes');
const loading = ref(true);
const error = ref('');
const account = connectedAccount;
const voting = ref(false);

const userNeoAmount = ref(1000);
const neoPrice = ref(0);
const gasPrice = ref(0);

// Neo N3 specific constants
const TOTAL_NEO_SUPPLY = 100_000_000;
const BLOCKS_PER_YEAR = 2_102_400; // Assuming exactly 15 seconds per block
const BLOCKS_PER_MONTH = BLOCKS_PER_YEAR / 12;

const totalNetworkVotes = computed(() => {
  return candidates.value.reduce((sum, c) => sum + Number(c.votes || 0), 0);
});

const neoBurgerApr = computed(() => {
  if (candidates.value.length === 0) return 0;
  // NeoBurger optimizes votes across top nodes, so its APR is roughly equal to the maximum council node APR.
  let maxApr = 0;
  for (let i = 0; i < Math.min(21, candidates.value.length); i++) {
    const apr = calculateAPR(candidates.value[i].votes, i);
    if (apr > maxApr) maxApr = apr;
  }
  return maxApr;
});

const neoBurgerMonthlyGas = computed(() => {
  if (candidates.value.length === 0) return 0;
  let maxGas = 0;
  for (let i = 0; i < Math.min(21, candidates.value.length); i++) {
    const gas = calculateMonthlyGas(candidates.value[i].votes, i);
    if (gas > maxGas) maxGas = gas;
  }
  return maxGas;
});

const sortedCandidates = computed(() => {
  const list = [...candidates.value];
  if (sortBy.value === 'apr') {
    return list.sort((a, b) => {
      // original index is needed for calculateAPR to know if it's consensus node
      const aIndex = candidates.value.indexOf(a);
      const bIndex = candidates.value.indexOf(b);
      return calculateAPR(b.votes, bIndex) - calculateAPR(a.votes, aIndex);
    });
  }
  return list; // Already sorted by votes from loadCandidates
});

function getKnownName(candidate) {
  // 1. Check if Dora committee API provided a custom name
  if (candidate.name) return candidate.name;
  // 2. Fallback to hardcoded constants map
  return KNOWN_ADDRESSES[candidate.publickey] || null;
}

function getLogo(candidate) {
  // 1. Check if Dora committee API provided a specific logo URL or NeoFS object ID
  if (candidate.logo) {
    if (candidate.logo.startsWith("http")) return candidate.logo;
    // Assume NeoFS object ID
    return `https://filesend.ngd.network/gate/get/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc/${candidate.logo}`;
  }
  
  const env = getCurrentEnv();
  // Mainnet fallback to governance.neo.org
  if (env === NET_ENV.Mainnet) {
    return `https://governance.neo.org/logo/${candidate.publickey}.png`;
  }
  
  // Testnet or others: no logo by default
  return null;
}

function calculateMonthlyGas(candidateVotesStr, index) {
  const amount = Number(userNeoAmount.value) || 0;
  if (amount <= 0 || totalNetworkVotes.value <= 0) return 0;
  
  const candidateVotes = Number(candidateVotesStr) || 0;
  
  // Total GAS minted per block is 5
  // - 10% (0.5 GAS) goes to all NEO holders evenly (regardless of voting)
  // - 10% (0.5 GAS) goes to the 21 Neo Council members directly
  // - 80% (4.0 GAS) goes to voters of the 21 Neo Council members:
  //    - 40% (2.0 GAS) split among voters of the Top 7 (Consensus Nodes)
  //    - 40% (2.0 GAS) split among voters of the Next 14 (Council Members)

  const isConsensusNode = index < 7;
  const isCouncilNode = index >= 7 && index < 21;
  
  // Base generation: 10% of 5 GAS per block is divided across all 100M NEO
  const baseRewardPerBlock = amount * (0.5 / TOTAL_NEO_SUPPLY);
  
  // Voter generation
  let voterRewardPerBlock = 0;
  if (candidateVotes > 0) {
    if (isConsensusNode) {
      // 2.0 GAS split equally among 7 nodes = ~0.2857 GAS per node per block
      const candidateBlockReward = 2.0 / 7;
      voterRewardPerBlock = amount * (candidateBlockReward / candidateVotes);
    } else if (isCouncilNode) {
      // 2.0 GAS split equally among 14 nodes = ~0.1428 GAS per node per block
      const candidateBlockReward = 2.0 / 14;
      voterRewardPerBlock = amount * (candidateBlockReward / candidateVotes);
    }
  }
  
  const totalRewardPerBlock = baseRewardPerBlock + voterRewardPerBlock;
  return totalRewardPerBlock * BLOCKS_PER_MONTH;
}

function calculateAPR(candidateVotesStr, index) {
  if (neoPrice.value <= 0 || gasPrice.value <= 0 || userNeoAmount.value <= 0) return 0;
  
  const monthlyGas = calculateMonthlyGas(candidateVotesStr, index);
  const annualGas = monthlyGas * 12;
  
  const annualUsdYield = annualGas * gasPrice.value;
  const initialUsdInvestment = userNeoAmount.value * neoPrice.value;
  
  return (annualUsdYield / initialUsdInvestment) * 100;
}

async function loadPrices() {
  try {
    const data = await fetchPrices();
    neoPrice.value = data.neo || 0;
    gasPrice.value = data.gas || 0;
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load prices", err);
  }
}

async function loadCandidates() {
  loading.value = true;
  error.value = '';
  try {
    const rpcClient = new rpc.RPCClient(getRpcClientUrl());
    
    // Determine the environment string for Dora API
    const env = getCurrentEnv().toLowerCase();
    const doraEnv = env.includes(NET_ENV.TestT5.toLowerCase()) ? "testnet" : "mainnet";

    const [rpcRes, doraRes] = await Promise.allSettled([
      rpcClient.execute(new rpc.Query({ method: "getcandidates", params: [] })),
      fetch(`https://dora.coz.io/api/v1/neo3/${doraEnv}/committee`).then(r => r.ok ? r.json() : [])
    ]);

    let rawCandidates = [];
    if (rpcRes.status === 'fulfilled' && rpcRes.value && rpcRes.value.length > 0) {
       rawCandidates = rpcRes.value;
    } else {
       throw new Error("Failed to fetch candidates from RPC node.");
    }

    const doraData = (doraRes.status === 'fulfilled' && Array.isArray(doraRes.value)) ? doraRes.value : [];
    
    // Create a map of pubkey -> Dora metadata
    const metadataMap = {};
    for (const item of doraData) {
      if (item.pubkey) {
        metadataMap[item.pubkey] = {
          name: item.name,
          logo: item.logo,
          description: item.description,
          location: item.location
        };
      }
    }

    // Merge RPC candidate list with Dora API metadata, sorting by votes descending
    candidates.value = rawCandidates.map(c => ({
      ...c,
      name: metadataMap[c.publickey]?.name || null,
      logo: metadataMap[c.publickey]?.logo || null,
      location: metadataMap[c.publickey]?.location || null
    })).sort((a, b) => Number(b.votes) - Number(a.votes));
    
    // Fetch liveness data passively in the background
    fetch(`/api/liveness?network=${doraEnv}`)
      .then(r => r.json())
      .then(data => {
         if (data && data.success && Array.isArray(data.liveness)) {
            const map = {};
            data.liveness.forEach(l => {
               map[l.nodeIndex] = l;
            });
            livenessData.value = map;
         }
      })
      .catch(e => {
         if (import.meta.env.DEV) console.warn("Failed to fetch liveness data", e);
      });
    
  } catch (err) {
    console.error("Failed to load candidates", err);
    error.value = err.message || "Failed to fetch candidates from RPC node.";
  } finally {
    loading.value = false;
  }
}

async function toggleWallet() {
  if (account.value) {
    await disconnectWallet();
  } else {
    await connectWallet();
  }
}

function formatAccount(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatVotes(votes) {
  return Number(votes || 0).toLocaleString();
}

async function handleVote(candidate) {
  if (!account.value) {
    toast.info("Please connect your wallet first.");
    return;
  }
  try {
    voting.value = true;
    await voteForCandidate(candidate.publickey);
  } catch (err) {
    // Errors handled inside voteForCandidate
  } finally {
    voting.value = false;
  }
}

onMounted(() => {
  loadPrices();
  loadCandidates();
});
</script>
