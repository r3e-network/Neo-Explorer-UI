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
          <table class="w-full min-w-[760px]">
            <thead class="table-head">
              <tr>
                <th class="table-header-cell w-16">#</th>
                <th class="table-header-cell">Public Key</th>
                <th class="table-header-cell-right">Votes</th>
                <th class="table-header-cell text-center">Status</th>
                <th class="table-header-cell-right">Action</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="(candidate, index) in candidates" :key="candidate.publickey" class="list-row group">
                <td class="table-cell-secondary">{{ index + 1 }}</td>
                <td class="table-cell">
                  <div class="font-hash text-sm text-high w-[120px] sm:w-[200px] md:w-[300px] lg:w-full truncate" :title="candidate.publickey">
                    {{ candidate.publickey }}
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
import { ref, onMounted } from 'vue';
import { rpc } from '@cityofzion/neon-js';
import { getRpcClientUrl } from '@/utils/env';
import { connectedAccount, connectWallet, disconnectWallet, voteForCandidate } from '@/utils/wallet';
import Breadcrumb from '@/components/common/Breadcrumb.vue';
import Skeleton from '@/components/common/Skeleton.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import { useToast } from 'vue-toastification';

const toast = useToast();
const candidates = ref([]);
const loading = ref(true);
const error = ref('');
const account = connectedAccount;
const voting = ref(false);

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
  loadCandidates();
});
</script>
