<template>
  <div class="matrix-page bg-surface-base min-h-screen pb-12">
    <!-- Hero Section -->
    <section class="hero-section relative border-b border-line-soft bg-header-bg overflow-hidden">
      <div class="matrix-grid-bg absolute inset-0 opacity-20"></div>
      <div class="hero-gradient absolute inset-0"></div>
      <div class="page-container relative z-30 py-16 md:py-20 flex flex-col items-center">
        <Breadcrumb :items="breadcrumbs" class="mb-8 !text-emerald-400/80" />
        
        <div class="text-center max-w-3xl mx-auto space-y-6">
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live on Mainnet
          </div>
          
          <h1 class="text-balance text-4xl font-black tracking-tight text-white md:text-6xl drop-shadow-sm">
            Own Your <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">.matrix</span> Identity
          </h1>
          
          <p class="text-base text-white/70 md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            The permanent, feeless naming layer for the Neo N3 network. Register your human-readable domain once, and own it forever. No renewal fees.
          </p>
        </div>
      </div>
    </section>

    <!-- Search Section -->
    <section class="page-container relative z-40 max-w-4xl mx-auto -mt-10">
      <div class="p-2 bg-surface/90 backdrop-blur-2xl shadow-2xl rounded-3xl border border-line-soft/50 ring-1 ring-black/5">
        <div class="relative flex items-center bg-surface-muted rounded-2xl border border-line-soft focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500 transition-all p-1.5">
          <div class="pl-4 text-emerald-500/70">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search for a domain (e.g. alice.matrix)"
            class="w-full bg-transparent border-none px-4 py-4 text-high font-bold text-lg md:text-xl placeholder:text-mid placeholder:font-medium focus:outline-none focus:ring-0"
            @keyup.enter="handleSearch"
            :disabled="searching"
          />
          <button 
            @click="handleSearch"
            :disabled="searching || !searchQuery.trim()"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed m-1"
          >
            <svg v-if="searching" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ searching ? 'Searching...' : 'Search' }}
          </button>
        </div>
      </div>
      <p class="text-sm text-mid mt-4 text-center font-medium">Domain must end strictly with <code class="bg-surface-muted px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400">.matrix</code></p>
    </section>

    <!-- Results Section -->
    <section class="page-container max-w-4xl mx-auto mt-8">
      <transition name="fade" mode="out-in">
        <!-- Initial States / Features -->
        <div v-if="!searchResult" class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div class="etherscan-card p-6 border-t-4 border-t-emerald-500 bg-gradient-to-b from-surface to-surface-muted/30">
            <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 class="text-lg font-bold text-high mb-2">Zero Registration Fees</h3>
            <p class="text-sm text-mid leading-relaxed">Unlike traditional naming services, the .matrix registry does not charge native GAS or NEO fees to secure a domain.</p>
          </div>
          <div class="etherscan-card p-6 border-t-4 border-t-cyan-500 bg-gradient-to-b from-surface to-surface-muted/30">
            <div class="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-2xl flex items-center justify-center mb-4 text-cyan-600 dark:text-cyan-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h3 class="text-lg font-bold text-high mb-2">Permanent Ownership</h3>
            <p class="text-sm text-mid leading-relaxed">No expiration dates, no recurring renewal costs. Once registered, the domain is mathematically bound to your wallet forever.</p>
          </div>
          <div class="etherscan-card p-6 border-t-4 border-t-blue-500 bg-gradient-to-b from-surface to-surface-muted/30">
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            </div>
            <h3 class="text-lg font-bold text-high mb-2">Universal Resolution</h3>
            <p class="text-sm text-mid leading-relaxed">Natively integrated across the explorer ecosystem. Look up accounts, trace transactions, and transfer assets easily.</p>
          </div>
        </div>

        <!-- Available State -->
        <div v-else-if="searchResult.available" class="etherscan-card overflow-hidden rounded-3xl border-2 border-emerald-400/50 bg-gradient-to-b from-emerald-50/50 to-surface dark:from-emerald-950/20 shadow-xl">
          <div class="p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div class="flex-1 space-y-4">
              <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 text-sm font-bold border border-emerald-200 dark:border-emerald-800/50">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                Domain Available
              </div>
              <h3 class="text-4xl md:text-5xl font-black text-high tracking-tight">{{ searchResult.domain }}</h3>
              <p class="text-mid text-base max-w-lg">
                This domain is unregistered. You can claim it permanently and feelessly to your connected wallet right now.
              </p>
            </div>

            <div class="flex flex-col gap-3 min-w-[240px] shrink-0 bg-surface p-6 rounded-2xl shadow-sm border border-line-soft">
              <div class="flex justify-between items-center pb-3 border-b border-line-soft">
                <span class="text-sm font-medium text-mid">Registration Fee</span>
                <span class="text-lg font-black text-emerald-600 dark:text-emerald-400">Free</span>
              </div>
              <div class="flex justify-between items-center pb-4">
                <span class="text-sm font-medium text-mid">Expiration</span>
                <span class="text-sm font-bold text-high">Never</span>
              </div>
              
              <button 
                @click="registerDomain"
                :disabled="!account || actionLoading"
                class="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-emerald-500 focus:ring-4 focus:ring-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="actionLoading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {{ actionLoading ? 'Processing...' : 'Register Domain' }}
              </button>
              <div v-if="!account" class="text-center text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                Please connect your wallet first
              </div>
            </div>
          </div>
        </div>

        <!-- Taken State -->
        <div v-else class="etherscan-card overflow-hidden rounded-3xl shadow-xl">
          <div class="bg-surface-muted/50 p-8 border-b border-line-soft flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div class="space-y-3">
               <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 text-sm font-bold border border-amber-200 dark:border-amber-800/50">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                  Domain Registered
                </div>
                <h3 class="text-3xl md:text-4xl font-black text-high tracking-tight">{{ searchResult.domain }}</h3>
            </div>
            <div v-if="searchResult.owner === account" class="shrink-0">
               <button 
                  @click="showTransferModal = true"
                  class="btn-outline w-full sm:w-auto px-8 py-3.5 font-bold rounded-xl bg-surface flex items-center justify-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                  Transfer Domain
                </button>
            </div>
          </div>
          
          <div class="p-8">
            <h4 class="text-lg font-bold text-high mb-6">Domain Records</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="p-5 bg-surface-muted rounded-2xl border border-line-soft space-y-1.5">
                <p class="text-xs font-bold text-mid uppercase tracking-wider">Controller (Owner)</p>
                <div class="flex items-center gap-2">
                  <HashLink v-if="searchResult.owner" :hash="searchResult.owner" type="address" class="text-lg font-mono font-medium" />
                  <span v-else class="text-low">Unknown</span>
                </div>
              </div>
              <div class="p-5 bg-surface-muted rounded-2xl border border-line-soft space-y-1.5">
                <p class="text-xs font-bold text-mid uppercase tracking-wider">Resolution Target</p>
                <div class="flex items-center gap-2">
                  <HashLink v-if="searchResult.resolvedAddress" :hash="searchResult.resolvedAddress" type="address" class="text-lg font-mono font-medium" />
                  <span v-else class="text-low">Not configured</span>
                </div>
              </div>
              <div class="p-5 bg-surface-muted rounded-2xl border border-line-soft space-y-1.5">
                <p class="text-xs font-bold text-mid uppercase tracking-wider">Administrative Key</p>
                <div class="flex items-center gap-2">
                  <HashLink v-if="searchResult.admin" :hash="searchResult.admin" type="address" class="text-lg font-mono font-medium" />
                  <span v-else class="text-low">Default (Owner)</span>
                </div>
              </div>
              <div class="p-5 bg-surface-muted rounded-2xl border border-line-soft space-y-1.5">
                <p class="text-xs font-bold text-mid uppercase tracking-wider">Status</p>
                <div class="flex items-center gap-2">
                  <span class="text-lg font-bold text-high">Permanent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Transfer Modal -->
      <transition name="fade">
        <div v-if="showTransferModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showTransferModal = false"></div>
          <div class="bg-surface-base border border-line-soft rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10">
            <div class="px-6 py-5 border-b border-line-soft flex items-center justify-between bg-surface-muted">
              <h3 class="text-xl font-bold text-high">Transfer Domain</h3>
              <button @click="showTransferModal = false" class="text-mid hover:text-high p-1 rounded-lg hover:bg-line-soft transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div class="p-8">
              <div class="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center">
                <p class="text-sm text-mid mb-1 font-medium">Domain Asset</p>
                <p class="text-xl font-black text-emerald-700 dark:text-emerald-400">{{ searchResult.domain }}</p>
              </div>
              
              <div class="space-y-4 mb-8">
                <div>
                  <label class="block text-sm font-bold text-high mb-2">Recipient Address</label>
                  <input 
                    v-model="transferRecipient"
                    type="text"
                    placeholder="Enter Neo N3 Address (N...)"
                    class="w-full bg-surface border border-line-soft focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-3.5 text-high font-mono text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>
              
              <button @click="transferDomain" :disabled="!transferRecipient || actionLoading" class="w-full py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg active:scale-95">
                <svg v-if="actionLoading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {{ actionLoading ? 'Signing Transaction...' : 'Confirm Transfer' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
      
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useToast } from 'vue-toastification';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import HashLink from "@/components/common/HashLink.vue";
import { connectedAccount } from '@/utils/wallet';
import nnsService from '@/services/nnsService';
import { safeRpc } from '@/services/api';
import { scriptHashHexToAddress } from '@/utils/neoHelpers';
import { getCurrentEnv } from '@/utils/env';

const toast = useToast();
const account = connectedAccount;

const breadcrumbs = [
  { label: 'Home', to: '/homepage' },
  { label: 'Matrix Domain Registry' },
];

const searchQuery = ref('');
const searching = ref(false);
const searchResult = ref(null);

const actionLoading = ref(false);
const showTransferModal = ref(false);
const transferRecipient = ref('');

const MATRIX_CONTRACT_HASH = getCurrentEnv() === 'TestT5' 
  ? (import.meta.env.VITE_MATRIX_CONTRACT_HASH_TESTNET || "0x89908093c5ccc463e2c5744d6bacb06108b60a75")
  : (import.meta.env.VITE_MATRIX_CONTRACT_HASH_MAINNET || "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd");

async function handleSearch() {
  let query = searchQuery.value.trim().toLowerCase();
  if (!query) return;

  if (!query.endsWith('.matrix')) {
    query += '.matrix';
  }
  searchQuery.value = query;
  
  searching.value = true;
  searchResult.value = null;
  
  try {
    const resolvedAddress = await nnsService.resolveMatrixDomain(query);
    const tokenBase64 = btoa(query);
    
    const props = await safeRpc("GetNep11PropertiesByContractHashTokenId", {
      ContractHash: MATRIX_CONTRACT_HASH,
      TokenIds: [tokenBase64]
    }, null);
    
    const fallbackProps = props && props.result ? props : await safeRpc("GetNep11PropertiesByContractHashTokenId", {
      ContractHash: MATRIX_CONTRACT_HASH,
      TokenId: btoa(query)
    }, null);
    
    if (!fallbackProps && !props) {
      searchResult.value = {
        domain: query,
        available: true
      };
    } else {
      let admin = null;
      let ownerAddressFromNNS = null;
      try {
        const ownerRes = await safeRpc("GetNep11TransferByContractHashTokenId", {
            ContractHash: MATRIX_CONTRACT_HASH,
            TokenId: btoa(query)
        }, null);
        if (ownerRes && Array.isArray(ownerRes) && ownerRes.length > 0) {
             ownerAddressFromNNS = ownerRes[0].to;
        } else if (ownerRes && ownerRes.result && Array.isArray(ownerRes.result) && ownerRes.result.length > 0) {
             ownerAddressFromNNS = ownerRes.result[0].to;
        }
      } catch(_e) { /* ignore */ }

      let ownerAddr = resolvedAddress || ownerAddressFromNNS;
      
      let propData = null;
      const activeProps = fallbackProps || props;
      if (activeProps && Array.isArray(activeProps.result) && activeProps.result.length > 0) {
        propData = activeProps.result.find(p => p.name === query);
      } else if (Array.isArray(activeProps) && activeProps.length > 0) {
        propData = activeProps.find(p => p.name === query);
      } else if (activeProps && !Array.isArray(activeProps) && !activeProps.result) {
        if (activeProps.name === query) {
           propData = activeProps;
        }
      }
      
      if (propData && propData.admin) {
        let rawAdmin = propData.admin;
        if (rawAdmin.startsWith("0x")) {
           try { 
               rawAdmin = scriptHashHexToAddress(rawAdmin.slice(2)); 
           } catch(_e) { /* ignore */ }
        }
        admin = rawAdmin;
      }
      
      if (!propData) {
        searchResult.value = {
          domain: query,
          available: true
        };
      } else {
        searchResult.value = {
          domain: query,
          available: false,
          owner: ownerAddr, 
          admin: admin,
          resolvedAddress: resolvedAddress
        };
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error("Search NNS failed", e);
    toast.error("Failed to query domain. It might be available.");
    searchResult.value = {
      domain: query,
      available: true
    };
  } finally {
    searching.value = false;
  }
}

import { sc, wallet } from "@cityofzion/neon-js";
import { invokeContract } from '@/utils/wallet';

async function registerDomain() {
  if (!account.value) {
    toast.info("Please connect your wallet first");
    return;
  }
  
  actionLoading.value = true;
  try {
    const domain = searchResult.value.domain;
    const scriptHash = wallet.getScriptHashFromAddress(account.value);
    
    const params = [
      sc.ContractParam.string(domain),
      sc.ContractParam.hash160(scriptHash)
    ];
    
    const txid = await invokeContract(MATRIX_CONTRACT_HASH, "register", params, [
      { account: scriptHash, scopes: "CalledByEntry" }
    ]);
    
    if (txid) {
      toast.success(`Registration transaction sent: ${txid}`);
      searchResult.value.available = false;
      searchResult.value.owner = account.value;
    }
  } catch (e) {
    console.error("Register failed", e);
    toast.error("Registration failed or was rejected");
  } finally {
    actionLoading.value = false;
  }
}

async function transferDomain() {
  if (!account.value || !transferRecipient.value) return;
  
  actionLoading.value = true;
  try {
    const domain = searchResult.value.domain;
    const fromScriptHash = wallet.getScriptHashFromAddress(account.value);
    const toScriptHash = wallet.getScriptHashFromAddress(transferRecipient.value);
    
    const tokenIdHex = Array.from(domain).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    
    const params = [
      sc.ContractParam.hash160(toScriptHash),
      sc.ContractParam.byteArray(tokenIdHex),
      sc.ContractParam.any()
    ];
    
    const txid = await invokeContract(MATRIX_CONTRACT_HASH, "transfer", params, [
      { account: fromScriptHash, scopes: "CalledByEntry" }
    ]);
    
    if (txid) {
      toast.success(`Transfer transaction sent: ${txid}`);
      showTransferModal.value = false;
      searchResult.value.owner = transferRecipient.value;
      transferRecipient.value = '';
    }
  } catch (e) {
    console.error("Transfer failed", e);
    toast.error("Transfer failed or was rejected");
  } finally {
    actionLoading.value = false;
  }
}
</script>

<style scoped>
.hero-section {
  background-color: #0f172a; /* slate-900 base */
}

.matrix-grid-bg {
  background-image: 
    linear-gradient(to right, rgba(16, 185, 129, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(16, 185, 129, 0.1) 1px, transparent 1px);
  background-size: 3rem 3rem;
  background-position: center center;
  mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
  -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
}

.hero-gradient {
  background: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 100% 100%, rgba(6, 182, 212, 0.1) 0%, transparent 50%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
