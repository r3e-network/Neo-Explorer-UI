<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Abstract Account Creator' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-4">
          <div class="page-header-icon bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-600 dark:from-indigo-900/40 dark:to-indigo-800/40 dark:text-indigo-400 shadow-sm border border-indigo-200/50 dark:border-indigo-800/50">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <div class="pt-1">
            <h1 class="page-title text-2xl font-extrabold tracking-tight">Abstract Account Creator</h1>
            <p class="page-subtitle text-base mt-1">Generate an isolated AA address using the Proxy Verification Script pattern.</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card p-6 md:p-8 border-t-4 border-t-indigo-500 shadow-xl shadow-indigo-900/5">
        <div class="max-w-4xl mx-auto space-y-10">
          <div v-if="!connectedAccount" class="text-center py-16 border border-dashed border-line-soft rounded-3xl bg-surface-muted/30">
             <div class="h-16 w-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-5 border border-line-soft shadow-sm">
               <svg class="h-8 w-8 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
             </div>
             <p class="text-high text-lg font-bold mb-2">Wallet Not Connected</p>
             <p class="text-sm text-mid max-w-sm mx-auto">Please connect your Neo wallet to register a new Abstract Account.</p>
          </div>

          <template v-else>
            <div class="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 border border-indigo-200/60 dark:border-indigo-900/40 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
              <div class="p-2.5 bg-indigo-100 dark:bg-indigo-800/40 rounded-xl shrink-0">
                <svg class="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <h4 class="font-bold text-high mb-2 text-base">How does this work?</h4>
                <p class="text-sm text-mid leading-relaxed">
                  Instead of paying 10 GAS to deploy a smart contract, we use a <strong>Proxy Verification Script</strong>. 
                  This tool generates a unique UUID, derives your isolated Neo Address off-chain, and registers it with the globally deployed Master Entry Contract. 
                  Your funds stay in your unique address, protected by the Master Contract's dynamic rules.
                </p>
              </div>
            </div>

            <!-- Configuration -->
            <div class="space-y-6">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <label class="block text-sm font-bold text-high tracking-tight">Account UUID</label>
                  <button @click="generateUUID" class="text-xs text-indigo-600 font-semibold hover:underline">Generate New UUID</button>
                </div>
                <input type="text" v-model="uuid" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" />
              </div>

              <div class="space-y-3">
                <label class="block text-sm font-bold text-high tracking-tight">Admin Addresses (Neo or EVM)</label>
                <div v-for="(admin, index) in admins" :key="'admin-'+index" class="flex items-center gap-2">
                  <input type="text" v-model="admins[index]" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl" placeholder="N... or 0x..." />
                  <button @click="admins.splice(index, 1)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <button @click="admins.push('')" class="text-xs text-indigo-600 font-semibold hover:underline">+ Add Admin</button>
              </div>
              
              <div class="space-y-3">
                <label class="block text-sm font-bold text-high tracking-tight">Admin Threshold</label>
                <input type="number" v-model.number="adminThreshold" min="1" :max="Math.max(1, admins.length)" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl" />
              </div>
              
              <div class="space-y-3">
                <label class="block text-sm font-bold text-high tracking-tight">Manager Addresses (Neo or EVM)</label>
                <div v-for="(manager, index) in managers" :key="'manager-'+index" class="flex items-center gap-2">
                  <input type="text" v-model="managers[index]" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl" placeholder="N... or 0x..." />
                  <button @click="managers.splice(index, 1)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <button @click="managers.push('')" class="text-xs text-indigo-600 font-semibold hover:underline">+ Add Manager</button>
              </div>
              
              <div class="space-y-3">
                <label class="block text-sm font-bold text-high tracking-tight">Manager Threshold</label>
                <input type="number" v-model.number="managerThreshold" min="0" :max="Math.max(0, managers.length)" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl" />
              </div>
            </div>

            <!-- Derived Address Preview -->
            <transition name="fade">
              <div v-if="uuid" class="p-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white dark:border-indigo-900/30 dark:from-indigo-900/10 dark:to-slate-900 shadow-sm space-y-4">
                <div>
                  <p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mb-1.5">Your Abstract Account Address</p>
                  <p class="text-lg text-high font-bold font-mono break-all p-3 bg-surface-muted rounded-xl border border-line-soft shadow-inner">{{ computedAddress || 'Computing...' }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mb-1.5">Verification Script Hex</p>
                  <p class="text-xs text-high font-mono break-all p-3 bg-surface-muted rounded-xl border border-line-soft shadow-inner">{{ computedScriptHex || 'Computing...' }}</p>
                </div>
              </div>
            </transition>
            
            <div class="pt-6 mt-6 flex justify-end border-t border-line-soft">
               <button 
                 @click="createAccount" 
                 :disabled="isCreating || !uuid || !computedAddress"
                 class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95"
               >
                 <svg v-if="isCreating" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                 {{ isCreating ? 'Registering...' : 'Register Account' }}
               </button>
            </div>
            
            <transition name="fade">
              <div v-if="txHash" class="p-5 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-400 flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 gap-4 shadow-sm">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p class="text-sm font-bold tracking-tight">Account Registered Successfully!</p>
                  </div>
                  <p class="text-xs break-all font-mono opacity-80 pl-7">{{ txHash }}</p>
                </div>
                <router-link :to="'/transaction-info/' + txHash" class="w-full sm:w-auto text-sm font-semibold hover:underline flex items-center justify-center gap-1.5 whitespace-nowrap bg-emerald-200/50 dark:bg-emerald-800/50 px-4 py-2 rounded-xl transition-colors hover:bg-emerald-300/50 dark:hover:bg-emerald-700/50 shadow-sm text-emerald-900 dark:text-emerald-100">
                  View Transaction
                </router-link>
              </div>
            </transition>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { connectedAccount } from '@/utils/wallet';
import { walletService, getAbstractAccountHash } from "@/services/walletService";
import { useToast } from "vue-toastification";
import { getRpcUrl } from "@/utils/env";

const toast = useToast();
const isCreating = ref(false);
const txHash = ref("");

const uuid = ref("");
const admins = ref([""]);
const adminThreshold = ref(1);
const managers = ref([]);
const managerThreshold = ref(0);

const computedScriptHex = ref("");
const computedAddress = ref("");

let neonJs = null;

function generateUUID() {
  uuid.value = crypto.randomUUID();
}

function normalizeByteArrayForWallet(value) {
  const raw = String(value || "").trim();
  if (!raw) return raw;

  const withoutPrefix = raw.replace(/^0x/i, "");
  if (/^[0-9a-f]+$/i.test(withoutPrefix) && withoutPrefix.length % 2 === 0) {
    return withoutPrefix;
  }
  return raw;
}

function stringToHex(str) {
  let hex = '';
  for(let i = 0; i < str.length; i++) {
    hex += '' + str.charCodeAt(i).toString(16);
  }
  return hex;
}

async function computeAA() {
  if (!uuid.value || !neonJs) {
    computedScriptHex.value = "";
    computedAddress.value = "";
    return;
  }
  
  try {
    const aaHash = getAbstractAccountHash();
    if (!aaHash) return;
    
    const uuidHex = stringToHex(uuid.value);
    
    // We generate the proxy script:
    // PUSH uuid, PUSH 1, PACK, PUSH 15 (CallFlags.All), PUSH "verify", PUSH aaHash, SYSCALL System.Contract.Call
    
    // An easy way to generate it is using createScript
    const script = neonJs.sc.createScript({
       scriptHash: aaHash,
       operation: 'verify',
       args: [ neonJs.sc.ContractParam.byteArray(uuidHex) ]
    });
    
    computedScriptHex.value = script;
    const scriptHash = neonJs.u.reverseHex(neonJs.u.hash160(script));
    computedAddress.value = neonJs.wallet.getAddressFromScriptHash(scriptHash);
  } catch (e) {
    console.error(e);
  }
}

watch(uuid, computeAA);

onMounted(async () => {
  try {
    neonJs = window.Neon || await import('@cityofzion/neon-js');
    generateUUID();
    
    // Try to pre-fill admin with current connected account pubkey if available
    // But we don't have pubkey easily accessible without DAPI.
  } catch (e) {
    console.error(e);
  }
});

function formatErrorMessage(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  return err.description || err.message || err.error?.message || JSON.stringify(err);
}

async function createAccount() {
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first");
    return;
  }
  if (!uuid.value) {
    toast.error("Please generate an Account UUID");
    return;
  }
  
  const validAdmins = admins.value.filter(a => a.trim().length > 0);
  if (validAdmins.length === 0) {
    toast.error("Must have at least one admin public key");
    return;
  }

  isCreating.value = true;
  txHash.value = "";

  try {
    const aaHash = getAbstractAccountHash();
    if (!aaHash) throw new Error("Master Abstract Account contract not found in environment config.");

    const uuidHex = stringToHex(uuid.value);
    
    function normalizeAddress(addr) {
      if (addr.startsWith('N') && addr.length === 34) {
        return neonJs.wallet.getScriptHashFromAddress(addr);
      }
      if (addr.startsWith('0x')) {
        return addr.slice(2);
      }
      return addr;
    }

    const adminsParam = validAdmins.map(addr => ({ type: 'Hash160', value: normalizeAddress(addr) }));
    const managersParam = managers.value.filter(m => m.trim().length > 0).map(addr => ({ type: 'Hash160', value: normalizeAddress(addr) }));

    const invokeParams = {
      scriptHash: aaHash,
      operation: "CreateAccount",
      args: [
        { type: "ByteArray", value: uuidHex },
        { type: "Array", value: adminsParam },
        { type: "Integer", value: adminThreshold.value },
        { type: "Array", value: managersParam },
        { type: "Integer", value: managerThreshold.value }
      ],
      signers: [
        {
          account: connectedAccount.value,
          scopes: 1 // CalledByEntry
        }
      ]
    };

    const result = await walletService.invoke(invokeParams);
    
    let deployedTxId = result?.txid || "";
    
    if (!deployedTxId) {
      throw new Error("No transaction ID returned.");
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
