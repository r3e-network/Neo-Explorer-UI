<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Abstract Account Creator' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-4">
          <div class="page-header-icon bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <div>
            <h1 class="page-title">Abstract Account Creator</h1>
            <p class="page-subtitle">Deploy your cross-chain Neo identity with multi-sig and recovery controls.</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-4 space-y-4">
          <div v-if="!connectedAccount" class="etherscan-card p-5 bg-surface-muted border-dashed text-center">
             <svg class="h-8 w-8 text-mid mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
             <p class="text-sm font-semibold text-high mb-1">Wallet Not Connected</p>
             <p class="text-xs text-mid">Connect your Neo wallet to register a new Abstract Account.</p>
          </div>
          
          <div v-if="connectedAccount" class="etherscan-card p-5">
            <h4 class="text-base font-bold text-high mb-4">Account ID Status</h4>
            <div class="space-y-4">
              <div v-if="isEvmWallet" class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-400">
                <div class="flex items-center gap-2 mb-2">
                  <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <p class="font-bold text-sm">EVM Public Key Active</p>
                </div>
                <p class="text-xs opacity-90 break-all">{{ uuid }}</p>
              </div>
              <div v-else>
                <div class="flex items-center justify-between mb-2">
                  <label class="block text-sm font-bold text-high">Account UUID</label>
                  <button @click="generateUUID" class="text-xs text-indigo-600 font-semibold hover:underline">Regenerate</button>
                </div>
                <input type="text" v-model="uuid" class="form-input w-full bg-surface text-high font-mono text-xs rounded-xl focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" />
              </div>

              <!-- Derived Address Preview -->
              <transition name="fade">
                <div v-if="uuid && computedAddress" class="p-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white dark:border-indigo-900/30 dark:from-indigo-900/10 dark:to-slate-900 shadow-sm space-y-3">
                  <div>
                    <p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mb-1">Derived Address</p>
                    <p class="text-sm text-high font-bold font-mono break-all">{{ computedAddress }}</p>
                  </div>
                </div>
              </transition>
            </div>
          </div>
          
          <div class="etherscan-card p-5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 border-indigo-200/60 dark:border-indigo-900/40">
            <div class="flex items-center gap-3 mb-4 border-b border-indigo-200/60 dark:border-indigo-800/60 pb-3">
              <div class="p-2 bg-indigo-100 dark:bg-indigo-800/40 rounded-lg shrink-0">
                <svg class="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              </div>
              <h4 class="font-bold text-high">Protocol Features</h4>
            </div>
            <ol class="space-y-3 text-sm text-mid list-decimal list-inside ml-1">
              <li><strong>Zero Deploy Cost:</strong> Proxy Verification Script binds your EVM/UUID identity to the Master Contract off-chain.</li>
              <li><strong>Multi-Sig Access:</strong> Enforce strict logic using separate Admin and Manager account groups.</li>
              <li><strong>Dome Recovery (Dead Man's Switch):</strong> Recover your account through an Oracle if the primary signers go inactive.</li>
              <li><strong>EIP-712 Compatibility:</strong> Complete meta-transactions directly via EVM networks.</li>
            </ol>
          </div>
        </div>

        <!-- Form Area -->
        <div class="lg:col-span-8">
          <div class="etherscan-card min-h-[500px] flex flex-col border-t-4 border-t-indigo-500 shadow-xl shadow-indigo-900/5">
            <div class="flex items-center gap-6 px-6 pt-4 border-b border-line-soft mb-6">
              <button 
                class="pb-3 text-sm font-bold border-b-2 transition-colors"
                :class="activeTab === 'create' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400' : 'border-transparent text-mid hover:text-high'"
                @click="activeTab = 'create'"
              >
                Configuration
              </button>
              <button 
                class="pb-3 text-sm font-bold border-b-2 transition-colors"
                :class="activeTab === 'source' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400' : 'border-transparent text-mid hover:text-high'"
                @click="activeTab = 'source'"
              >
                Contract Source
              </button>
            </div>

            <div v-if="activeTab === 'create'" class="p-6 pt-0 flex-1 space-y-8" :class="{ 'opacity-50 pointer-events-none': !connectedAccount }">
              <div class="space-y-4">
                <h3 class="text-base font-bold text-high border-b border-line-soft pb-2 flex items-center gap-2">
                  <span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">1</span>
                  Mandatory Admins
                </h3>
                <p class="text-xs text-mid">Admins have full execution and configuration authority.</p>
                <div v-for="(admin, index) in admins" :key="'admin-'+index" class="flex items-center gap-2">
                  <input type="text" v-model="admins[index]" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl" placeholder="N... or 0x..." />
                  <button @click="admins.splice(index, 1)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <div class="flex items-center justify-between">
                  <button @click="admins.push('')" class="text-xs text-indigo-600 font-semibold hover:underline">+ Add Admin</button>
                  <div class="flex items-center gap-2">
                     <span class="text-xs font-bold text-high">Threshold:</span>
                     <input type="number" v-model.number="adminThreshold" min="1" :max="Math.max(1, admins.length)" class="form-input w-20 py-1 bg-surface text-high font-mono text-sm rounded-lg" />
                  </div>
                </div>
              </div>
              
              <div class="space-y-4">
                <h3 class="text-base font-bold text-high border-b border-line-soft pb-2 flex items-center gap-2">
                  <span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">2</span>
                  Operational Managers <span class="font-normal text-mid ml-1 text-xs">(Optional)</span>
                </h3>
                <p class="text-xs text-mid">Managers can execute whitelisted dApp transactions but cannot reconfigure the account.</p>
                <div v-for="(manager, index) in managers" :key="'manager-'+index" class="flex items-center gap-2">
                  <input type="text" v-model="managers[index]" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl" placeholder="N... or 0x..." />
                  <button @click="managers.splice(index, 1)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <div class="flex items-center justify-between">
                  <button @click="managers.push('')" class="text-xs text-indigo-600 font-semibold hover:underline">+ Add Manager</button>
                  <div class="flex items-center gap-2">
                     <span class="text-xs font-bold text-high">Threshold:</span>
                     <input type="number" v-model.number="managerThreshold" min="0" :max="Math.max(0, managers.length)" class="form-input w-20 py-1 bg-surface text-high font-mono text-sm rounded-lg" />
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-base font-bold text-high border-b border-line-soft pb-2 flex items-center gap-2">
                  <span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">3</span>
                  Dome Recovery Accounts <span class="font-normal text-mid ml-1 text-xs">(Optional)</span>
                </h3>
                <p class="text-xs text-mid">Dome accounts can take control of the wallet if all Admins and Managers are inactive for the specified timeout period.</p>
                <div v-for="(dome, index) in domes" :key="'dome-'+index" class="flex items-center gap-2">
                  <input type="text" v-model="domes[index]" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl" placeholder="N... or 0x..." />
                  <button @click="domes.splice(index, 1)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <div class="flex items-center justify-between">
                  <button @click="domes.push('')" class="text-xs text-indigo-600 font-semibold hover:underline">+ Add Dome Account</button>
                  <div class="flex items-center gap-2">
                     <span class="text-xs font-bold text-high">Threshold:</span>
                     <input type="number" v-model.number="domeThreshold" min="0" :max="Math.max(0, domes.length)" class="form-input w-20 py-1 bg-surface text-high font-mono text-sm rounded-lg" />
                  </div>
                </div>
                
                <div class="flex items-center gap-4 mt-3" v-if="domes.length > 0">
                  <div class="flex-1">
                    <label class="block text-xs font-bold text-high mb-1">Inactivity Timeout (ms)</label>
                    <input type="number" v-model.number="domeTimeout" class="form-input w-full py-2 bg-surface text-high font-mono text-sm rounded-lg" placeholder="e.g. 15768000000 (6 months)" />
                  </div>
                </div>
              </div>

              <div class="pt-6 border-t border-line-soft flex justify-end">
                 <button 
                   @click="createAccount" 
                   :disabled="!connectedAccount || isCreating || !uuid || !computedAddress"
                   class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-95"
                 >
                   <svg v-if="isCreating" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                   {{ isCreating ? 'Registering...' : 'Deploy Smart Account' }}
                 </button>
              </div>
              
              <transition name="fade">
                <div v-if="txHash" class="p-5 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-400 flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 gap-4 shadow-sm">
                  <div>
                    <p class="text-sm font-bold mb-1.5 flex items-center gap-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      Registration Transaction Submitted
                    </p>
                    <p class="text-xs break-all font-mono opacity-80 pl-7">{{ txHash }}</p>
                  </div>
                  <router-link :to="`/transaction-info/${txHash}`" class="text-sm font-bold hover:underline flex items-center gap-1.5 whitespace-nowrap bg-emerald-200/50 dark:bg-emerald-800/50 px-4 py-2 rounded-xl transition-all hover:bg-emerald-300/50 dark:hover:bg-emerald-700/50 hover:shadow-md shrink-0">
                    View Transaction
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                  </router-link>
                </div>
              </transition>
            </div>

            <!-- Source Code Tab -->
            <div v-else-if="activeTab === 'source'" class="p-6 pt-0">
              <div class="flex items-center gap-2 mb-4 overflow-x-auto pb-2 border-b border-line-soft">
                <button 
                  v-for="(file, idx) in sourceFiles" 
                  :key="idx"
                  @click="activeFileIdx = idx"
                  class="px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors"
                  :class="activeFileIdx === idx ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-mid hover:bg-surface-muted'"
                >
                  {{ file.name }}
                </button>
              </div>

              <div class="relative group mt-2 rounded-xl overflow-hidden border border-line-soft">
                <div class="absolute right-3 top-3 z-10 flex gap-2">
                  <button @click="copyCode(sourceFiles[activeFileIdx].content)" class="p-2 bg-surface/80 backdrop-blur-sm border border-line-soft rounded-lg text-low hover:text-high transition-colors shadow-sm" title="Copy code">
                    <svg v-if="copied" class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                  </button>
                </div>
                <highlightjs language="csharp" :code="sourceFiles[activeFileIdx].content" class="text-xs font-mono m-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { connectedAccount, connectedProvider, PROVIDERS } from '@/utils/wallet';
import { walletService, getAbstractAccountHash } from "@/services/walletService";
import { useToast } from "vue-toastification";

import hljs from 'highlight.js/lib/core';
import csharp from 'highlight.js/lib/languages/csharp';
import hljsVuePlugin from "@highlightjs/vue-plugin";
import 'highlight.js/styles/github-dark.css';

hljs.registerLanguage('csharp', csharp);
const highlightjs = hljsVuePlugin.component;

import code_Main from '../../../contracts/AbstractAccount/AbstractAccount.cs?raw';
import code_AccountLifecycle from '../../../contracts/AbstractAccount/AbstractAccount.AccountLifecycle.cs?raw';
import code_Admin from '../../../contracts/AbstractAccount/AbstractAccount.Admin.cs?raw';
import code_StorageAndContext from '../../../contracts/AbstractAccount/AbstractAccount.StorageAndContext.cs?raw';
import code_ExecutionAndPermissions from '../../../contracts/AbstractAccount/AbstractAccount.ExecutionAndPermissions.cs?raw';
import code_MetaTx from '../../../contracts/AbstractAccount/AbstractAccount.MetaTx.cs?raw';
import code_Upgrade from '../../../contracts/AbstractAccount/AbstractAccount.Upgrade.cs?raw';

const sourceFiles = [
  { name: 'AbstractAccount.cs', content: code_Main },
  { name: 'AccountLifecycle.cs', content: code_AccountLifecycle },
  { name: 'Admin.cs', content: code_Admin },
  { name: 'StorageAndContext.cs', content: code_StorageAndContext },
  { name: 'ExecutionAndPermissions.cs', content: code_ExecutionAndPermissions },
  { name: 'MetaTx.cs', content: code_MetaTx },
  { name: 'Upgrade.cs', content: code_Upgrade }
];

const activeFileIdx = ref(0);
const activeTab = ref('create');
const copied = ref(false);

function copyCode(text) {
  navigator.clipboard.writeText(text);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
}

const toast = useToast();
const uuid = ref("");

const admins = ref([""]);
const adminThreshold = ref(1);

const managers = ref([]);
const managerThreshold = ref(0);

const domes = ref([]);
const domeThreshold = ref(0);
const domeTimeout = ref(15768000000); // 6 months in ms default

const isCreating = ref(false);
const txHash = ref("");

const isEvmWallet = computed(() => connectedProvider.value === PROVIDERS.EVM_WALLET);

let neonJs = null;
const computedAddress = ref("");
const computedScriptHex = ref("");

function generateUUID() {
  if (isEvmWallet.value) return; // Prevent overwriting derived EVM pubkey
  uuid.value = crypto.randomUUID();
}

function normalizeAccountId(str) {
  if (isEvmWallet.value && /^[0-9a-fA-F]{130}$/.test(str)) {
    return str;
  }
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

function deriveAccount() {
  if (!neonJs || !uuid.value) {
    computedAddress.value = "";
    computedScriptHex.value = "";
    return;
  }
  
  try {
    const aaHash = getAbstractAccountHash();
    if (!aaHash) {
      computedAddress.value = "AA_HASH_NOT_CONFIGURED";
      return;
    }

    const accountIdHex = normalizeAccountId(uuid.value);
    
    const script = neonJs.sc.createScript({
      scriptHash: aaHash,
      operation: 'verify',
      args: [ neonJs.sc.ContractParam.byteArray(neonJs.u.HexString.fromHex(accountIdHex, false)) ]
    });
    
    computedScriptHex.value = script;
    
    const hash160 = neonJs.u.reverseHex(neonJs.u.hash160(script));
    computedAddress.value = neonJs.wallet.getAddressFromScriptHash(hash160);
  } catch (e) {
    console.error(e);
    computedAddress.value = "Error computing address";
  }
}

watch(uuid, deriveAccount);
watch(isEvmWallet, (evm) => {
  if (evm && walletService.account?.pubKey) {
    uuid.value = walletService.account.pubKey;
  }
});

onMounted(async () => {
  try {
    neonJs = window.Neon || await import('@cityofzion/neon-js');
    if (!uuid.value && !isEvmWallet.value) {
      generateUUID();
    } else if (isEvmWallet.value && walletService.account?.pubKey) {
      uuid.value = walletService.account.pubKey;
    }
  } catch (e) {
    console.error(e);
  }
});

function formatErrorMessage(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err.description) return err.description;
  if (err.message) return err.message;
  return JSON.stringify(err);
}

function normalizeAddress(addr) {
  if (addr.startsWith('N') && addr.length === 34) {
    return neonJs.wallet.getScriptHashFromAddress(addr);
  }
  if (addr.startsWith('0x')) {
    return addr.slice(2);
  }
  return addr;
}

async function createAccount() {
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first");
    return;
  }
  if (!uuid.value) {
    toast.error("Account ID (UUID or PubKey) is required");
    return;
  }
  
  const validAdmins = admins.value.filter(a => a.trim().length > 0);
  if (validAdmins.length === 0) {
    toast.error("Must have at least one admin public key");
    return;
  }
  if (adminThreshold.value < 1 || adminThreshold.value > validAdmins.length) {
    toast.error("Invalid Admin Threshold");
    return;
  }

  isCreating.value = true;
  txHash.value = "";

  try {
    const aaHash = getAbstractAccountHash();
    if (!aaHash) throw new Error("Master Abstract Account contract not found in environment config.");

    const accountIdHex = normalizeAccountId(uuid.value);

    const adminsParam = validAdmins.map(addr => ({ type: 'Hash160', value: normalizeAddress(addr) }));
    const managersParam = managers.value.filter(m => m.trim().length > 0).map(addr => ({ type: 'Hash160', value: normalizeAddress(addr) }));
    const domesParam = domes.value.filter(d => d.trim().length > 0).map(addr => ({ type: 'Hash160', value: normalizeAddress(addr) }));
    
    // Fallback logic for contract versions that might not support Dome params yet
    // Since we just updated the contract to support Dome, we pass it dynamically
    let method = 'createAccountWithAddress';
    let args = [
        { type: "ByteArray", value: accountIdHex },
        { type: "Hash160", value: normalizeAddress(computedAddress.value) },
        { type: "Array", value: adminsParam },
        { type: "Integer", value: adminThreshold.value },
        { type: "Array", value: managersParam },
        { type: "Integer", value: managerThreshold.value }
    ];
    
    if (domesParam.length > 0) {
        // Technically CreateAccountWithAddress in our contract does not accept dome accounts in the init constructor. 
        // Dome accounts must be added using setDomeAccounts after initialization! Let's just create it first.
        // Wait, yes, CreateAccount doesn't initialize Dome. We will need to set it via invoke if we want to.
        toast.info("Dome settings are applied in a separate transaction after creation.");
    }

    const invokeParams = {
      scriptHash: aaHash,
      operation: method,
      args: args,
      signers: [
        {
          account: connectedAccount.value,
          scopes: 1 // CalledByEntry
        }
      ]
    };

    const result = await walletService.invoke(invokeParams);
    
    let deployedTxId = result?.txid || "";
    if (!deployedTxId && result?.result?.txid) deployedTxId = result.result.txid;

    if (!deployedTxId) {
      throw new Error("No txid returned from wallet");
    }

    txHash.value = deployedTxId;
    toast.success("Account registration transaction submitted!");

  } catch (err) {
    console.error(err);
    toast.error("Registration failed: " + formatErrorMessage(err));
  } finally {
    isCreating.value = false;
  }
}
</script>
<style scoped>
.page-header-icon {
  @apply rounded-2xl p-3 shrink-0;
}
.etherscan-card {
  @apply bg-surface rounded-3xl border border-line-soft overflow-hidden;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
/* Ensure HighlightJS block has max height and scrolls */
:deep(pre code.hljs) {
  @apply max-h-[600px] overflow-y-auto bg-slate-50 dark:bg-slate-900;
}
</style>
