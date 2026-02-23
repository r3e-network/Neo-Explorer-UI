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
        <div class="card-header flex justify-between items-center">
          <div>
            <p class="text-mid text-sm">Node Candidates</p>
            <p class="text-low text-sm">Select a candidate below to cast your NEO votes</p>
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
                <th class="table-header-cell-right">Est. GAS / Month</th>
                <th class="table-header-cell-right">APR</th>
                <th class="table-header-cell-right">Action</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="(candidate, index) in candidates" :key="candidate.publickey" class="list-row group">
                <td class="table-cell-secondary">{{ index + 1 }}</td>
                <td class="table-cell">
                  <div class="flex items-center gap-3">
                    <img 
                      :src="getLogo(candidate.publickey)" 
                      class="h-6 w-6 rounded-full bg-surface-elevated ring-1 ring-line-soft object-cover flex-shrink-0" 
                      alt="Logo"
                      @error="$event.target.src = '/img/brand/neo.png'"
                    />
                    <div class="min-w-0 flex flex-col gap-0.5">
                      <span v-if="getKnownName(candidate.publickey)" class="inline-block font-semibold text-high text-sm">
                        {{ getKnownName(candidate.publickey) }}
                      </span>
                      <router-link 
                        :to="`/account-profile/${candidate.address || candidate.publickey}`" 
                        class="etherscan-link font-hash text-xs break-all" 
                        :title="candidate.publickey"
                      >
                        {{ candidate.publickey }}
                      </router-link>
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
                <td class="table-cell-right font-medium text-status-success">
                  {{ calculateMonthlyGas(candidate.votes, index).toFixed(4) }} GAS
                </td>
                <td class="table-cell-right font-medium text-primary-500">
                  {{ calculateAPR(candidate.votes, index).toFixed(2) }}%
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
import { getRpcClientUrl } from '@/utils/env';
import { connectedAccount, connectWallet, disconnectWallet, voteForCandidate } from '@/utils/wallet';
import Breadcrumb from '@/components/common/Breadcrumb.vue';
import Skeleton from '@/components/common/Skeleton.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import { useToast } from 'vue-toastification';
import { usePriceCache } from '@/composables/usePriceCache';
import { KNOWN_ADDRESSES } from '@/constants/knownAddresses';

const toast = useToast();
const { fetchPrices } = usePriceCache();

const candidates = ref([]);
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

function getKnownName(publicKey) {
  // Try to find a match in KNOWN_ADDRESSES. The mapping contains public keys for nodes.
  return KNOWN_ADDRESSES[publicKey] || null;
}

function getLogo(publicKey) {
  // Try to load candidate logo from standard Neo governance sources if possible, otherwise fallback image handler catches it
  return `https://governance.neo.org/logo/${publicKey}.png`;
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
    // Get all candidates
    const res = await rpcClient.execute(new rpc.Query({ method: "getcandidates", params: [] }));
    if (res && res.length > 0) {
      // Sort by votes descending
      candidates.value = res.sort((a, b) => Number(b.votes) - Number(a.votes));
    } else {
      candidates.value = [];
    }
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
