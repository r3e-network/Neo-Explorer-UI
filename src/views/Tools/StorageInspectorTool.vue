<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Storage Inspector' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
          </div>
          <div>
            <h1 class="page-title">Storage Inspector</h1>
            <p class="page-subtitle">Read the raw Key-Value storage state of any smart contract on Neo N3.</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card p-6">
        <div class="max-w-3xl mx-auto space-y-6">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2 md:col-span-2">
              <label class="block text-sm font-semibold text-high">Contract Hash</label>
              <input type="text" v-model="contractHash" class="form-input w-full bg-surface text-high font-mono text-sm" placeholder="e.g. 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5" />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-semibold text-high">Storage Key</label>
              <input type="text" v-model="storageKey" class="form-input w-full bg-surface text-high font-mono text-sm" placeholder="e.g. totalSupply or 0x01..." @keyup.enter="fetchStorage" />
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-semibold text-high">Key Format</label>
              <select v-model="keyFormat" class="form-input w-full bg-surface text-high text-sm appearance-none">
                <option value="string">String (UTF-8)</option>
                <option value="hex">Hex String</option>
                <option value="base64">Base64</option>
              </select>
            </div>
          </div>

          <div class="pt-4 border-t border-line-soft flex justify-end">
             <button 
               @click="fetchStorage" 
               :disabled="!isValidInput || isLoading"
               class="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
             >
               <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
               {{ isLoading ? 'Querying...' : 'Read Storage' }}
             </button>
          </div>

          <!-- Result Area -->
          <transition name="fade">
            <div v-if="hasQueried" class="mt-6 space-y-4">
              <h3 class="text-base font-bold text-high border-b border-line-soft pb-2">Storage Value</h3>
              
              <div v-if="!rawBase64Result" class="p-6 text-center border border-dashed border-line-soft rounded-xl bg-surface-muted">
                <p class="text-high font-medium">No Data Found</p>
                <p class="text-sm text-mid mt-1">The requested key does not exist in the contract's storage.</p>
              </div>
              
              <div v-else class="space-y-4">
                <div class="p-4 rounded-xl border border-line-soft bg-surface">
                  <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-2">Base64</p>
                  <p class="text-sm text-high font-mono break-all">{{ rawBase64Result }}</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="p-4 rounded-xl border border-line-soft bg-surface">
                    <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-2">Hex</p>
                    <p class="text-sm text-high font-mono break-all">{{ hexResult }}</p>
                  </div>
                  
                  <div class="p-4 rounded-xl border border-line-soft bg-surface">
                    <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-2">String (UTF-8)</p>
                    <p class="text-sm text-high font-mono break-all">{{ stringResult || '—' }}</p>
                  </div>
                  
                  <div class="p-4 rounded-xl border border-line-soft bg-surface md:col-span-2">
                    <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-2">Integer</p>
                    <p class="text-sm text-high font-mono break-all">{{ intResult }}</p>
                  </div>
                </div>
              </div>
            </div>
          </transition>
          
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { useToast } from "vue-toastification";
import { rpc, u } from "@cityofzion/neon-js";
import { getCurrentEnv } from "@/utils/env";

const toast = useToast();
const contractHash = ref("");
const storageKey = ref("");
const keyFormat = ref("string");

const isLoading = ref(false);
const hasQueried = ref(false);
const rawBase64Result = ref("");

const isValidInput = computed(() => contractHash.value.trim() && storageKey.value.trim());

const hexResult = computed(() => {
  if (!rawBase64Result.value) return "";
  try {
    return u.base642hex(rawBase64Result.value);
  } catch (e) {
    return "";
  }
});

const stringResult = computed(() => {
  if (!hexResult.value) return "";
  try {
    return u.hexstring2str(hexResult.value);
  } catch (e) {
    return "";
  }
});

const intResult = computed(() => {
  if (!hexResult.value) return "0";
  try {
    // Neo integers are little-endian in storage
    const reversedHex = u.reverseHex(hexResult.value);
    // Neon-js BigInteger wrapper or just standard parse
    // For simplicity, handle small to medium integers
    return BigInt('0x' + (reversedHex || '0')).toString();
  } catch (e) {
    return "Invalid Integer";
  }
});

const getRpcUrl = () => {
    const env = getCurrentEnv().toLowerCase();
    if (env.includes("test") || env.includes("t5")) {
        return "https://testnet1.neo.coz.io:443";
    }
    return "https://mainnet1.neo.coz.io:443";
};

async function fetchStorage() {
  if (!isValidInput.value) return;
  
  isLoading.value = true;
  hasQueried.value = false;
  rawBase64Result.value = "";
  
  try {
    const rpcClient = new rpc.RPCClient(getRpcUrl());
    
    let keyHex = "";
    if (keyFormat.value === "string") {
      keyHex = u.str2hexstring(storageKey.value);
    } else if (keyFormat.value === "base64") {
      keyHex = u.base642hex(storageKey.value);
    } else {
      keyHex = storageKey.value.replace(/^0x/, '');
    }
    
    const hash = contractHash.value.startsWith('0x') ? contractHash.value : '0x' + contractHash.value;
    
    const result = await rpcClient.getStorage(hash, keyHex);
    rawBase64Result.value = result || "";
    hasQueried.value = true;
  } catch (e) {
    console.error(e);
    toast.error("Failed to fetch storage: " + (e.message || "Unknown error"));
  } finally {
    isLoading.value = false;
  }
}
</script>
