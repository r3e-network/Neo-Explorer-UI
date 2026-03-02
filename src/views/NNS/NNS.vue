<template>
  <div class="nns-page bg-surface-base">
    <!-- Hero Section -->
    <section class="hero-section relative border-b border-white/10 bg-header-bg/95">
      <div class="hero-overlay"></div>
      <div class="page-container relative z-30 py-10 md:py-14">
        <div class="mx-auto max-w-4xl text-center">
          <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Neo Name Service' }]" class="mb-6 justify-center !text-white/70" />
          <h1 class="text-balance text-3xl font-extrabold tracking-tight text-white md:text-5xl mb-4">
            Discover Your <span class="text-primary-400">.neo</span> Identity
          </h1>
          <p class="max-w-2xl mx-auto text-base text-white/70 mb-8">
            Search, register, and manage human-readable Neo Name Service domains. Replace long complex hashes with a simple, recognizable name.
          </p>
          
          <div class="flex justify-center items-center gap-3">
            <span v-if="account" class="text-sm font-medium text-white px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
              <span class="w-2 h-2 rounded-full bg-green-400 inline-block mr-2 animate-pulse"></span>
              {{ formatAccount(account) }}
            </span>
            <span v-else class="text-sm font-medium text-white/80 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
              Connect wallet from header to register/manage domains
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="page-container py-8 -mt-12 relative z-40 max-w-3xl mx-auto">
      <div class="etherscan-card p-2 bg-surface/95 backdrop-blur-xl shadow-xl rounded-2xl">
        <div class="relative flex items-center bg-surface-muted rounded-xl border border-line-soft focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition-all p-1">
          <div class="pl-4 text-mid">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Find your perfect domain (e.g. alice.neo)..."
            class="w-full bg-transparent border-none px-4 py-4 text-high font-semibold text-lg placeholder:text-mid focus:outline-none focus:ring-0"
            @keyup.enter="handleSearch"
          />
          <button 
            @click="handleSearch"
            :disabled="searching || !searchQuery.trim()"
            class="btn-primary rounded-lg px-8 py-3.5 text-base shadow-md m-1 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ searching ? 'Searching...' : 'Search' }}
          </button>
        </div>
      </div>
      
      <p class="text-sm text-mid mt-4 text-center">Only exact searches are supported (must end with .neo)</p>

      <!-- Search Result -->
      <transition name="fade">
        <div v-if="searchResult" class="mt-8 overflow-hidden rounded-2xl shadow-lg border" :class="searchResult.available ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20' : 'border-line-soft bg-surface'">
          <div class="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-3xl font-extrabold text-high tracking-tight">{{ searchResult.domain }}</h3>
                <span v-if="searchResult.available" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-sm font-bold">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                  Available
                </span>
                <span v-else class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-sm font-bold">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                  Taken
                </span>
              </div>
              
              <p v-if="searchResult.available" class="text-mid text-sm">
                This domain is available for registration. Secure it now before someone else does!
              </p>
              
              <div v-else class="mt-4 space-y-4 p-5 bg-surface-muted rounded-xl border border-line-soft">
                <div class="flex items-center justify-between gap-4 text-sm border-b border-line-soft pb-3 last:border-0 last:pb-0">
                  <span class="text-mid font-medium">Owner</span>
                  <HashLink v-if="searchResult.owner" :hash="searchResult.owner" type="address" />
                  <span v-else class="text-low">-</span>
                </div>
                <div class="flex items-center justify-between gap-4 text-sm border-t soft-divider pt-3">
                  <span class="text-mid font-medium">Admin</span>
                  <HashLink v-if="searchResult.admin" :hash="searchResult.admin" type="address" />
                  <span v-else class="text-low">-</span>
                </div>
                <div class="flex items-center justify-between gap-4 text-sm border-t soft-divider pt-3">
                  <span class="text-mid font-medium">Resolves To</span>
                  <HashLink v-if="searchResult.resolvedAddress" :hash="searchResult.resolvedAddress" type="address" />
                  <span v-else class="text-low">-</span>
                </div>
                <div class="flex items-center justify-between gap-4 text-sm border-t soft-divider pt-3">
                  <span class="text-mid font-medium">Expiration</span>
                  <span v-if="searchResult.expiration" class="text-high font-semibold">{{ formatDate(searchResult.expiration) }}</span>
                  <span v-else class="text-low">-</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-3 min-w-[160px] flex-shrink-0">
              <button 
                v-if="searchResult.available"
                @click="registerDomain"
                :disabled="!account || actionLoading"
                class="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-emerald-500 focus:ring-4 focus:ring-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="actionLoading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {{ actionLoading ? 'Processing...' : 'Register Now' }}
              </button>
              
              <button 
                v-if="!searchResult.available && searchResult.owner === account"
                @click="showTransferModal = true"
                :disabled="!account || actionLoading"
                class="btn-outline w-full py-3.5 font-bold rounded-xl bg-surface"
              >
                Transfer Domain
              </button>
              
              <div v-if="!account" class="text-center text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                Connect wallet from header to manage
              </div>
            </div>
          </div>
        </div>
      </transition>
      
      <!-- Transfer Modal -->
      <div v-if="showTransferModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="bg-surface-base border border-line-soft rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
          <div class="px-6 py-5 border-b soft-divider flex items-center justify-between bg-surface-muted/50">
            <h3 class="text-lg font-bold text-high">Transfer Domain</h3>
            <button @click="showTransferModal = false" class="text-mid hover:text-high transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div class="p-6">
            <div class="mb-6 p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-900/30">
              <p class="text-sm text-mid mb-1">Domain to transfer</p>
              <p class="text-lg font-bold text-primary-700 dark:text-primary-400">{{ searchResult.domain }}</p>
            </div>
            
            <div class="space-y-4 mb-8">
              <div>
                <label class="block text-sm font-semibold text-high mb-2">Recipient Address</label>
                <input 
                  v-model="transferRecipient"
                  type="text"
                  placeholder="e.g. N..."
                  class="w-full bg-surface-elevated border border-line-soft focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl px-4 py-3 text-high font-mono focus:outline-none transition-all"
                />
              </div>
            </div>
            
            <div class="flex gap-3">
              <button @click="showTransferModal = false" class="btn-outline flex-1 py-3 rounded-xl font-semibold">Cancel</button>
              <button @click="transferDomain" :disabled="!transferRecipient || actionLoading" class="btn-primary flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                <svg v-if="actionLoading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {{ actionLoading ? 'Sending...' : 'Confirm Transfer' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
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

const toast = useToast();
const account = connectedAccount;

const searchQuery = ref('');
const searching = ref(false);
const searchResult = ref(null);

const actionLoading = ref(false);
const showTransferModal = ref(false);
const transferRecipient = ref('');

const NNS_CONTRACT_HASH = "0x50ac1c37690cc2cfc594472833cf57505d5f46de";

function formatAccount(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(timestampMs) {
  if (!timestampMs) return '-';
  const d = new Date(timestampMs);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

async function handleSearch() {
  let query = searchQuery.value.trim().toLowerCase();
  if (!query) return;
  
  if (!query.endsWith('.neo')) {
    query += '.neo';
    searchQuery.value = query;
  }
  
  searching.value = true;
  searchResult.value = null;
  
  try {
    const resolvedAddress = await nnsService.resolveDomain(query);
    const tokenBase64 = btoa(query);
    
    const props = await safeRpc("GetNep11PropertiesByContractHashTokenId", {
      ContractHash: NNS_CONTRACT_HASH,
      TokenIds: [tokenBase64]
    }, null);
    
    // Fallback if the token ID is actually required as hex or another format
    // some backends might not wrap TokenIds in base64 properly.
    const fallbackProps = props && props.result ? props : await safeRpc("GetNep11PropertiesByContractHashTokenId", {
      ContractHash: NNS_CONTRACT_HASH,
      TokenId: btoa(query)
    }, null);
    
    if (!fallbackProps && !props) {
      searchResult.value = {
        domain: query,
        available: true
      };
    } else {
      let expired = false;
      let expirationMs = null;
      let admin = null;
          let ownerAddressFromNNS = null;
    try {
        const ownerRes = await safeRpc("GetNep11TransferByContractHashTokenId", {
            ContractHash: NNS_CONTRACT_HASH,
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
        // Neo3fura might return unrelated domains if the requested token is not found.
        // We must strictly enforce that the returned name matches our query.
        propData = activeProps.result.find(p => p.name === query);
      } else if (Array.isArray(activeProps) && activeProps.length > 0) {
        propData = activeProps.find(p => p.name === query);
      } else if (activeProps && !Array.isArray(activeProps) && !activeProps.result) {
        if (activeProps.name === query) {
           propData = activeProps;
        }
      }
      
      if (propData) {
        if (propData.expiration) {
          expirationMs = Number(propData.expiration);
          if (expirationMs < 1000000000000) expirationMs *= 1000;
          if (Date.now() > expirationMs) {
            expired = true;
          }
        }
        
        if (propData.admin) {
          let rawAdmin = propData.admin;
          if (rawAdmin.startsWith("0x")) {
             try { 
                 rawAdmin = scriptHashHexToAddress(rawAdmin.slice(2)); 
             } catch(_e) { /* ignore */ }
          }
          admin = rawAdmin;
        }
      }
      
      if (!propData || expired) {
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
          resolvedAddress: resolvedAddress,
          expiration: expirationMs
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
    
    const txid = await invokeContract(NNS_CONTRACT_HASH, "register", params, [
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
    
    const txid = await invokeContract(NNS_CONTRACT_HASH, "transfer", params, [
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
  background-image: radial-gradient(circle at 15% 20%, rgba(74, 180, 238, 0.26), transparent 36%),
    radial-gradient(circle at 78% 8%, rgba(0, 229, 153, 0.16), transparent 28%),
    linear-gradient(180deg, #0f1f3d 0%, #162a4b 100%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 26px 26px;
  opacity: 0.28;
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
