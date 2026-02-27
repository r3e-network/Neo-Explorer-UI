<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Gas Estimator' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <div>
            <h1 class="page-title">Gas Estimator & Fee Calculator</h1>
            <p class="page-subtitle">Simulate transactions to calculate precise System Fee (GasConsumed) and Network Fee.</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card p-6">
        <div class="max-w-3xl mx-auto space-y-6">
          
          <div class="space-y-2">
            <label class="block text-sm font-semibold text-high">Transaction Script (Base64 or Hex)</label>
            <textarea v-model="scriptInput" class="form-input w-full h-32 bg-surface text-high font-mono text-sm" placeholder="Paste your raw transaction payload script here..."></textarea>
          </div>
          
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-semibold text-high">Transaction Signers (Optional)</label>
              <button @click="addSigner" class="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-1 rounded-md dark:bg-orange-900/30 dark:text-orange-400 transition-colors">+ Add Signer</button>
            </div>
            
            <div v-if="signers.length === 0" class="p-4 text-center border border-dashed border-line-soft rounded-xl text-mid text-sm">
              No signers defined. Will use an empty dummy signer to calculate network byte fees.
            </div>
            
            <div v-for="(signer, i) in signers" :key="i" class="flex gap-3 items-center bg-surface-muted p-3 rounded-xl border border-line-soft relative">
              <div class="w-full relative">
                <input type="text" v-model="signers[i]" class="form-input w-full bg-surface font-mono text-sm pr-8" placeholder="ScriptHash or Address (e.g. N... or 0x...)" />
                <button @click="removeSigner(i)" class="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-500" title="Remove signer">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>
          </div>
          
          <div class="pt-4 flex justify-end border-t border-line-soft">
            <button 
              @click="estimateGas"
              :disabled="!scriptInput.trim() || isEstimating"
              class="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
            >
              <svg v-if="isEstimating" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {{ isEstimating ? 'Simulating...' : 'Estimate Fees' }}
            </button>
          </div>

          <transition name="fade">
            <div v-if="result" class="mt-6 space-y-4">
              <h3 class="text-base font-bold text-high border-b border-line-soft pb-2">Simulation Result</h3>
              
              <div v-if="result.error" class="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 font-medium text-sm break-all">
                {{ result.error }}
              </div>
              
              <template v-else>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="p-4 rounded-xl border border-line-soft bg-surface text-center">
                    <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-1">State</p>
                    <p class="text-lg font-bold" :class="result.state === 'HALT' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                      {{ result.state }}
                    </p>
                  </div>
                  <div class="p-4 rounded-xl border border-line-soft bg-surface text-center">
                    <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-1">System Fee (Execution)</p>
                    <p class="text-lg font-bold text-high">{{ result.systemFee }} <span class="text-sm font-normal text-mid">GAS</span></p>
                  </div>
                  <div class="p-4 rounded-xl border border-line-soft bg-surface text-center">
                    <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-1">Network Fee (Size)</p>
                    <p class="text-lg font-bold text-high">{{ result.networkFee }} <span class="text-sm font-normal text-mid">GAS</span></p>
                  </div>
                </div>
                
                <div class="p-4 rounded-xl border border-line-soft bg-surface flex items-center justify-between">
                  <p class="text-sm text-mid font-semibold">Total Estimated Cost</p>
                  <p class="text-2xl font-black text-orange-600 dark:text-orange-400">{{ result.totalFee }} GAS</p>
                </div>
                
                <div v-if="result.exception" class="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 text-sm font-mono break-all mt-4">
                  Exception: {{ result.exception }}
                </div>
              </template>
            </div>
          </transition>

        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { useToast } from "vue-toastification";
import { rpc, tx, u, wallet } from "@cityofzion/neon-js";
import { getCurrentEnv } from "@/utils/env";

const toast = useToast();
const scriptInput = ref("");
const signers = ref([]);
const isEstimating = ref(false);
const result = ref(null);

function addSigner() {
  signers.value.push("");
}

function removeSigner(index) {
  signers.value.splice(index, 1);
}

const getRpcUrl = () => {
    const env = getCurrentEnv().toLowerCase();
    if (env.includes("test") || env.includes("t5")) {
        return "https://testnet1.neo.coz.io:443";
    }
    return "https://mainnet1.neo.coz.io:443";
};

function formatFee(rawIntStr) {
    if (!rawIntStr) return "0";
    return (Number(rawIntStr) / 100000000).toFixed(8).replace(/\.?0+$/, "");
}

async function estimateGas() {
  const input = scriptInput.value.trim();
  if (!input) return;
  
  isEstimating.value = true;
  result.value = null;
  
  try {
    const rpcClient = new rpc.RPCClient(getRpcUrl());
    
    // Normalize Script
    let hexScript = "";
    if (/^[0-9a-fA-F]+$/.test(input) || input.startsWith('0x')) {
      hexScript = input.replace(/^0x/, '');
    } else {
      hexScript = u.base642hex(input);
    }
    
    const base64Script = u.hex2base64(hexScript);
    
    // Normalize Signers
    const invokeSigners = [];
    const accounts = [];
    
    if (signers.value.length === 0) {
       // Dummy fallback to calculate payload sizes
       const dummyAcc = new wallet.Account();
       accounts.push(dummyAcc);
       invokeSigners.push({
           account: dummyAcc.scriptHash,
           scopes: tx.WitnessScope.CalledByEntry
       });
    } else {
       for (const s of signers.value) {
           let val = s.trim();
           if (!val) continue;
           if (val.startsWith('N')) {
               val = new wallet.Account(val).scriptHash;
           } else if (val.startsWith('0x')) {
               val = val.replace(/^0x/, '');
           }
           invokeSigners.push({ account: val, scopes: tx.WitnessScope.CalledByEntry });
           // we need dummy accounts with these scriptHashes to build the dummy tx? 
           // Neon-js requires actual private keys to attach a valid witness signature for exact byte sizing.
           // We will just use new empty Accounts since a signature is exactly 64 bytes regardless of the key used.
           accounts.push(new wallet.Account()); 
       }
    }
    
    // 1. Estimate System Fee using invokeScript
    toast.info("Simulating execution...");
    const invokeRes = await rpcClient.invokeScript(base64Script, invokeSigners);
    
    // 2. Estimate Network Fee using a dummy transaction
    // To get the exact size, we build the object and sign it.
    let txn = new tx.Transaction({
        signers: invokeSigners,
        validUntilBlock: await rpcClient.getBlockCount() + 1000,
        script: hexScript,
        systemFee: invokeRes.gasconsumed || 0
    });
    
    // NeonJS calculateNetworkFee requires the transaction to be fully structured.
    // If it requires a signature to calculate byte cost:
    for (const acc of accounts) {
        txn.sign(acc, 860833102); // magic doesn't matter for size calc
    }
    
    const rawNetworkFee = await rpcClient.calculateNetworkFee(txn);
    
    const sysFeeDec = Number(invokeRes.gasconsumed || 0) / 100000000;
    const netFeeDec = Number(rawNetworkFee || 0) / 100000000;
    
    result.value = {
        state: invokeRes.state,
        exception: invokeRes.exception,
        systemFee: formatFee(invokeRes.gasconsumed),
        networkFee: formatFee(rawNetworkFee.toString()),
        totalFee: (sysFeeDec + netFeeDec).toFixed(8).replace(/\.?0+$/, "")
    };
    
    if (invokeRes.state === "FAULT") {
        toast.warning("Simulation FAULTED. See exception details.");
    } else {
        toast.success("Simulation complete!");
    }
    
  } catch (err) {
    console.error(err);
    result.value = { error: err.message || "Invalid script format or node unreachable." };
    toast.error("Simulation failed");
  } finally {
    isEstimating.value = false;
  }
}
</script>
