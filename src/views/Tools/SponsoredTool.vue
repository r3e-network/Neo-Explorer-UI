<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Sponsored Transactions' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <h1 class="page-title">Sponsored Transactions</h1>
            <p class="page-subtitle">Claim GAS or vote without paying network fees. Only available if your GAS balance is insufficient.</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card p-6">
        <div class="max-w-3xl mx-auto space-y-6">
          
          <div class="p-4 rounded-xl bg-amber-50/80 backdrop-blur-sm border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 text-amber-800 dark:text-amber-300">
            <div class="flex gap-3">
              <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div class="text-sm">
                <p class="font-bold mb-1">How it works</p>
                <p>This tool allows you to perform essential network actions (like claiming your GAS or voting for a consensus node) even if you don't have enough GAS to pay the transaction fee. A designated sponsor wallet will sign the transaction first and cover your fees automatically.</p>
              </div>
            </div>
          </div>

          <div v-if="!connectedAccount" class="text-center py-10 border border-dashed border-line-soft rounded-xl bg-surface-muted">
             <svg class="h-10 w-10 text-mid mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
             <p class="text-high font-medium mb-1">Wallet Not Connected</p>
             <p class="text-sm text-mid">Please connect your wallet from the header to use sponsored transactions.</p>
          </div>
          
          <template v-else>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div class="p-4 rounded-xl border border-line-soft bg-surface">
                 <p class="text-sm text-mid mb-1">Your GAS Balance</p>
                 <p class="text-xl font-bold text-high">{{ gasBalance }} <span class="text-sm font-normal text-low">GAS</span></p>
               </div>
               <div class="p-4 rounded-xl border border-line-soft bg-surface flex flex-col justify-center">
                 <p class="text-sm text-mid mb-1">Eligibility Status</p>
                 <div class="flex items-center gap-2">
                   <span v-if="isEligible" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold uppercase tracking-wider">
                     <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                     Eligible
                   </span>
                   <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
                     <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                     Not Eligible
                   </span>
                   <span class="text-xs text-mid">(Requires &lt; {{ eligibilityThreshold }} GAS)</span>
                 </div>
               </div>
            </div>

            <div class="space-y-4 pt-4 border-t border-line-soft">
               <label class="block text-sm font-semibold text-high">Select Operation</label>
               <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <button 
                   @click="operation = 'claim'" 
                   class="p-4 rounded-xl border text-left transition-all"
                   :class="operation === 'claim' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500/50' : 'border-line-soft bg-surface hover:border-primary-300'"
                 >
                   <p class="font-bold text-high mb-1 flex items-center gap-2">
                     <svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     Claim GAS
                   </p>
                   <p class="text-xs text-mid">Transfers 0 NEO to yourself to mint accumulated GAS rewards.</p>
                 </button>
                 
                 <button 
                   @click="operation = 'vote'" 
                   class="p-4 rounded-xl border text-left transition-all"
                   :class="operation === 'vote' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500/50' : 'border-line-soft bg-surface hover:border-primary-300'"
                 >
                   <p class="font-bold text-high mb-1 flex items-center gap-2">
                     <svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     Vote for Candidate
                   </p>
                   <p class="text-xs text-mid">Cast your NEO voting weight for a consensus node candidate.</p>
                 </button>
               </div>
            </div>

            <div v-if="operation === 'vote'" class="space-y-2 pt-2 animate-fade-in">
              <label class="block text-sm font-semibold text-high">Select Candidate</label>
              <select v-model="candidatePubKey" class="form-input w-full bg-surface text-high text-sm appearance-none cursor-pointer">
                <option value="" disabled selected>-- Select a consensus node candidate --</option>
                <option v-for="c in candidateList" :key="c.pubkey" :value="c.pubkey">
                  {{ c.name || c.pubkey.slice(0, 12) + '...' }} ({{ formatVotes(c.votes) }} votes)
                </option>
              </select>
              <div v-if="!candidateList.length" class="text-xs text-low flex items-center gap-2 mt-1">
                <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Loading candidates...
              </div>
            </div>

            <div class="pt-4 flex justify-end">
               <button 
                 @click="executeSponsoredTx" 
                 :disabled="!isEligible || isProcessing || (operation === 'vote' && !candidatePubKey)"
                 class="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
               >
                 <svg v-if="isProcessing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 {{ isProcessing ? 'Processing...' : 'Execute Sponsored Transaction' }}
               </button>
            </div>
            
            <div v-if="txHash" class="p-4 rounded-xl border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 text-green-800 dark:text-green-400 flex items-center justify-between mt-4">
              <div>
                <p class="text-sm font-bold mb-1">Transaction Broadcasted Successfully!</p>
                <p class="text-xs break-all font-mono opacity-80">{{ txHash }}</p>
              </div>
              <router-link :to="`/transaction-info/${txHash}`" class="text-sm font-semibold hover:underline flex items-center gap-1.5 whitespace-nowrap bg-green-200/50 dark:bg-green-800/50 px-3 py-1.5 rounded-lg transition-colors hover:bg-green-300/50 dark:hover:bg-green-700/50">
                View Tx
              </router-link>
            </div>
          </template>
          
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { connectedAccount } from '@/utils/wallet';
import { walletService } from "@/services/walletService";
import { useToast } from "vue-toastification";
import { rpc, wallet } from "@cityofzion/neon-js";
import { getCurrentEnv } from "@/utils/env";
import { cachedRequest } from "@/services/cache";

const toast = useToast();
const gasBalance = ref("0");
const operation = ref("claim");
const candidatePubKey = ref("");
const isProcessing = ref(false);
const txHash = ref("");
const candidateList = ref([]);

function formatVotes(value) {
  return Number(value || 0).toLocaleString();
}

const eligibilityThreshold = 0.5; // GAS

const isEligible = computed(() => {
  return Number(gasBalance.value) < eligibilityThreshold;
});

const getRpcUrl = () => {
    const env = getCurrentEnv().toLowerCase();
    if (env.includes("test") || env.includes("t5")) {
        const seeds = ["http://seed5t5.neo.org:20332", "http://seed2t5.neo.org:20332", "http://seed4t5.neo.org:20332"];
        return seeds[Math.floor(Math.random() * seeds.length)];
    }
    return "https://mainnet1.neo.coz.io:443";
};

async function fetchBalance() {
  if (!connectedAccount.value) {
    gasBalance.value = "0";
    return;
  }
  
  try {
    const rpcClient = new rpc.RPCClient(getRpcUrl());
    const result = await rpcClient.getNep17Balances(connectedAccount.value);
    const gasAsset = result.balance.find(b => b.assethash === '0xd2a4cff31913016155e38e474a2c06d08be276cf');
    if (gasAsset) {
      gasBalance.value = (Number(gasAsset.amount) / 100000000).toFixed(4);
    } else {
      gasBalance.value = "0";
    }
  } catch(e) {
    console.warn("Failed to fetch balance", e);
    gasBalance.value = "0";
  }
}

watch(() => connectedAccount.value, () => {
  txHash.value = "";
  fetchBalance();
});

async function loadCandidates() {
  try {
    const env = getCurrentEnv().toLowerCase();
    const networkMode = (env.includes("test") || env.includes("t5")) ? "testnet" : "mainnet";
    const isTestnet = networkMode !== "mainnet";
    if (isTestnet) return;
    const doraUrl = `https://dora.coz.io/api/v1/neo3/mainnet/committee`;
    
    const candidates = await cachedRequest(
      `dora_committee_${networkMode}`,
      () => fetch(doraUrl).then(r => r.ok ? r.json() : []),
      300000
    );
    
    if (Array.isArray(candidates)) {
       candidateList.value = candidates.sort((a, b) => Number(b.votes || 0) - Number(a.votes || 0));
    }
  } catch (e) {
    console.warn("Failed to load candidates", e);
  }
}

onMounted(() => {
  fetchBalance();
  loadCandidates();
});

async function executeSponsoredTx() {
  if (!connectedAccount.value) return;
  if (typeof window === "undefined") return;

  const activeProvider = walletService.provider;
  const requiresNeoLine = activeProvider === walletService.PROVIDERS.NEOLINE;
  if (requiresNeoLine && !window.NEOLineN3) {
    toast.error("NeoLine N3 wallet not found.");
    return;
  }

  isProcessing.value = true;
  txHash.value = "";
  
  try {
    const env = getCurrentEnv().toLowerCase();
    const networkMode = (env.includes("test") || env.includes("t5")) ? "testnet" : "mainnet";
    
    // 1. Get sponsor info from our backend
    const sponsorInfoRes = await fetch('/api/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'info' })
    });
    
    if (!sponsorInfoRes.ok) throw new Error("Could not fetch sponsor info. Backend might not be configured.");
    const sponsorInfo = await sponsorInfoRes.json();
    const sponsorScriptHash = new wallet.Account(sponsorInfo.sponsorAddress).scriptHash;
    const userScriptHash = new wallet.Account(connectedAccount.value).scriptHash;
    
    // 2. Ask the connected wallet to build and sign the transaction (but do NOT broadcast)
    toast.info("Please sign the transaction in your connected wallet...");
    // Ensure wallet connected via service
    if (!walletService.isConnected) {
      toast.error("Please connect your wallet first via the header.");
      isProcessing.value = false;
      return;
    }
    
    let signedTxRes;
    const neoHash = '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5';
    
    try {
        if (operation.value === 'claim') {
             signedTxRes = await walletService.invoke({
                scriptHash: neoHash,
                operation: 'transfer',
                args: [
                    { type: "Hash160", value: userScriptHash },
                    { type: "Hash160", value: userScriptHash },
                    { type: "Integer", value: "0" },
                    { type: "Any", value: null }
                ],
                signers: [
                    { account: sponsorScriptHash, scopes: 0 },
                    { account: userScriptHash, scopes: 1 }
                ],
                broadcastOverride: true
            });
        } else {
             signedTxRes = await walletService.invoke({
                scriptHash: neoHash,
                operation: 'vote',
                args: [
                    { type: "Hash160", value: userScriptHash },
                    { type: "PublicKey", value: candidatePubKey.value.trim() }
                ],
                signers: [
                    { account: sponsorScriptHash, scopes: 0 },
                    { account: userScriptHash, scopes: 1 }
                ],
                broadcastOverride: true
            });
        }
    } catch(e) {
        throw new Error(e.description || e.message || "User rejected signature.");
    }
    
    // 3. Send the partially signed transaction to Vercel backend to get Sponsor signature & broadcast
    toast.info("Verifying and broadcasting sponsored transaction...");
    
    const signRes = await fetch('/api/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'sign',
            transactionHex: signedTxRes.signedTx,
            network: networkMode
        })
    });
    
    if (!signRes.ok) {
        const err = await signRes.json();
        throw new Error(err.error || "Failed to broadcast via sponsor");
    }
    
    const finalResult = await signRes.json();
    txHash.value = finalResult.txid;
    
    toast.success("Sponsored transaction successful!");
    setTimeout(fetchBalance, 3000); // refresh balance
    
  } catch (e) {
    console.error(e);
    toast.error("Transaction failed: " + (e.message || "Unknown error"));
  } finally {
    isProcessing.value = false;
  }
}
</script>
