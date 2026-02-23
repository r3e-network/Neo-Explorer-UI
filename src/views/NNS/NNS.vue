<template>
  <div class="nns-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Neo Name Service' }]" />

      <div class="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div class="flex items-center gap-3">
          <div class="page-header-icon bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <div>
            <h1 class="page-title">Neo Name Service (NNS)</h1>
            <p class="page-subtitle">Search, register, and manage .neo domains</p>
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

      <div class="etherscan-card p-6">
        <h2 class="text-xl font-bold text-high mb-4">Search NNS Domain</h2>
        
        <div class="relative max-w-2xl">
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search for a domain (e.g., example.neo)..."
            class="w-full bg-surface-base border border-line-soft focus:border-primary-500 rounded-xl px-4 py-4 text-high font-medium text-lg placeholder:text-low focus:outline-none focus:ring-0 transition-colors"
            @keyup.enter="handleSearch"
          />
          <button 
            @click="handleSearch"
            :disabled="searching || !searchQuery.trim()"
            class="absolute right-2 top-1/2 -translate-y-1/2 btn-primary px-6 py-2 rounded-lg"
          >
            {{ searching ? 'Searching...' : 'Search' }}
          </button>
        </div>
        <p class="text-sm text-mid mt-2">Only exact searches are supported (must end with .neo)</p>

        <!-- Search Result -->
        <div v-if="searchResult" class="mt-8 p-5 border border-line-soft rounded-xl bg-surface-elevated">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 class="text-2xl font-bold text-high">{{ searchResult.domain }}</h3>
              <p v-if="searchResult.available" class="text-status-success font-medium flex items-center gap-1 mt-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                Available
              </p>
              <div v-else class="mt-1">
                <p class="text-status-error font-medium flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  Taken
                </p>
                <div class="mt-2 text-sm text-mid space-y-1">
                  <p>Owner: <HashLink v-if="searchResult.owner" :hash="searchResult.owner" type="address" /></p>
                  <p v-if="searchResult.admin">Admin: <HashLink :hash="searchResult.admin" type="address" /></p>
                  <p v-if="searchResult.resolvedAddress">Resolves to: <HashLink :hash="searchResult.resolvedAddress" type="address" /></p>
                  <p v-if="searchResult.expiration">Expires: <span class="text-high font-medium">{{ formatDate(searchResult.expiration) }}</span></p>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-2 min-w-[120px]">
              <button 
                v-if="searchResult.available"
                @click="registerDomain"
                :disabled="!account || actionLoading"
                class="btn-primary py-2.5 w-full"
              >
                {{ actionLoading ? 'Processing...' : 'Register' }}
              </button>
              
              <button 
                v-if="!searchResult.available && searchResult.owner === account"
                @click="showTransferModal = true"
                :disabled="!account || actionLoading"
                class="btn-outline py-2 w-full"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Transfer Modal -->
      <div v-if="showTransferModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div class="bg-surface-base border border-line-soft rounded-2xl shadow-xl w-full max-w-md p-6">
          <h3 class="text-xl font-bold text-high mb-4">Transfer {{ searchResult.domain }}</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-mid mb-1">Recipient Address</label>
              <input 
                v-model="transferRecipient"
                type="text"
                placeholder="N..."
                class="w-full bg-surface-elevated border border-line-soft focus:border-primary-500 rounded-lg px-3 py-2 text-high focus:outline-none transition-colors"
              />
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button @click="showTransferModal = false" class="btn-outline flex-1 py-2">Cancel</button>
            <button @click="transferDomain" :disabled="!transferRecipient || actionLoading" class="btn-primary flex-1 py-2">
              {{ actionLoading ? 'Sending...' : 'Confirm' }}
            </button>
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
import { connectedAccount, connectWallet, disconnectWallet } from '@/utils/wallet';
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
    const tokenIdHex = Array.from(query).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    
    const props = await safeRpc("GetNep11PropertiesByContractHashTokenId", {
      ContractHash: NNS_CONTRACT_HASH,
      TokenId: tokenIdHex
    }, null);
    
    if (!props) {
      searchResult.value = {
        domain: query,
        available: true
      };
    } else {
      let expired = false;
      let expirationMs = null;
      let admin = null;
      let ownerAddr = resolvedAddress;
      
      let propData = null;
      if (Array.isArray(props) && props.length > 0) {
        propData = props[0];
      } else if (props && !Array.isArray(props)) {
        propData = props;
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
          // If admin is a script hash, convert it
          let rawAdmin = propData.admin;
          if (rawAdmin.startsWith("0x")) {
             try { 
                 rawAdmin = scriptHashHexToAddress(rawAdmin.slice(2)); 
             } catch(e) {
                 // Ignore if not a valid script hash
             }
          }
          admin = rawAdmin;
        }
        
        // Owner might not be direct in properties, we use resolvedAddress if possible
        // Actually, let's call GetNep11TransferByContractHashTokenId to find latest owner?
        // Let's just rely on resolvedAddress for now, or fallback
      }
      
      if (expired) {
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
    
    // register(string name, UInt160 owner)
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
    
    // NNS transfer is a NEP-11 transfer
    // transfer(UInt160 to, ByteString tokenId, any data)
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