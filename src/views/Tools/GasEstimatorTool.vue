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

      <div class="etherscan-card p-6 md:p-8">
        <div class="max-w-3xl mx-auto space-y-8">
          
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-bold text-high tracking-tight">Transaction Script</label>
              <select v-model="scriptFormat" class="form-input bg-surface text-xs py-1.5 px-3 rounded-lg border-line-soft hover:border-primary-400 transition-colors shadow-sm cursor-pointer outline-none">
                <option value="base64">Base64</option>
                <option value="hex">Hex String</option>
              </select>
            </div>
            <textarea v-model="scriptInput" class="form-input w-full h-36 bg-surface text-high font-mono text-sm rounded-2xl shadow-inner focus:ring-2 focus:ring-orange-500/20" placeholder="Paste your raw transaction payload script here..."></textarea>
          </div>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-bold text-high tracking-tight">Transaction Signers <span class="text-mid font-normal ml-1">(Optional)</span></label>
              <button @click="addSigner" class="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 transition-all duration-300 shadow-sm">+ Add Signer</button>
            </div>
            
            <div v-if="signers.length === 0" class="p-6 text-center border-2 border-dashed border-line-soft rounded-2xl bg-surface-muted/50 text-mid text-sm">
              <svg class="w-8 h-8 mx-auto mb-2 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              No signers defined.<br><span class="text-xs opacity-80">An empty dummy signer will be used to calculate network byte fees.</span>
            </div>
            
            <transition-group name="list" tag="div" class="space-y-3">
              <div v-for="(signer, i) in signers" :key="i" class="flex gap-3 items-center bg-surface-muted p-2 pr-3 rounded-xl border border-line-soft relative group hover:border-primary-400 transition-colors">
                <div class="w-full relative flex items-center">
                  <div class="px-3 text-mid font-mono text-xs opacity-50 shrink-0">{{ i + 1 }}</div>
                  <input type="text" v-model="signers[i]" class="form-input w-full bg-surface font-mono text-sm pr-10 border-transparent focus:border-orange-400 focus:ring-0 rounded-lg shadow-sm" placeholder="ScriptHash or Address (e.g. N... or 0x...)" />
                  <button @click="removeSigner(i)" class="absolute right-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-md transition-colors" title="Remove signer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              </div>
            </transition-group>
          </div>
          
          <div class="pt-6 mt-6 flex justify-end border-t border-line-soft">
            <button 
              @click="estimateGas"
              :disabled="!scriptInput.trim() || isEstimating"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 py-3 text-sm font-bold text-white hover:bg-orange-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95"
            >
              <svg v-if="isEstimating" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              {{ isEstimating ? 'Simulating...' : 'Estimate Fees' }}
            </button>
          </div>

          <transition name="fade">
            <div v-if="result" class="mt-8 space-y-5">
              <h3 class="text-lg font-bold text-high tracking-tight flex items-center gap-2">
                <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Simulation Result
              </h3>
              
              <div v-if="result.error" class="p-5 rounded-2xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 font-medium text-sm break-all shadow-sm">
                {{ result.error }}
              </div>
              
              <template v-else>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="p-5 rounded-2xl border border-line-soft bg-surface text-center shadow-sm flex flex-col justify-center relative overflow-hidden group">
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50 dark:to-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <p class="text-[10px] text-mid font-bold uppercase tracking-widest mb-2 relative z-10">VM State</p>
                    <p class="text-xl font-black relative z-10" :class="result.state === 'HALT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                      {{ result.state }}
                    </p>
                  </div>
                  <div class="p-5 rounded-2xl border border-line-soft bg-surface text-center shadow-sm flex flex-col justify-center relative overflow-hidden group">
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50 dark:to-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <p class="text-[10px] text-mid font-bold uppercase tracking-widest mb-2 relative z-10">System Fee (Execution)</p>
                    <p class="text-xl font-bold text-high relative z-10">{{ result.systemFee }} <span class="text-xs font-semibold text-mid ml-0.5">GAS</span></p>
                  </div>
                  <div class="p-5 rounded-2xl border border-line-soft bg-surface text-center shadow-sm flex flex-col justify-center relative overflow-hidden group">
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50 dark:to-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <p class="text-[10px] text-mid font-bold uppercase tracking-widest mb-2 relative z-10">Network Fee (Size)</p>
                    <p class="text-xl font-bold text-high relative z-10">{{ result.networkFee }} <span class="text-xs font-semibold text-mid ml-0.5">GAS</span></p>
                  </div>
                </div>
                
                <div class="p-6 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:border-orange-900/30 dark:from-orange-900/20 dark:to-orange-900/10 flex items-center justify-between shadow-inner">
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-orange-500 text-white rounded-lg shadow-sm">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <p class="text-sm text-orange-900 dark:text-orange-100 font-bold tracking-tight">Total Estimated Cost</p>
                  </div>
                  <p class="text-3xl font-black text-orange-600 dark:text-orange-400 tracking-tight">{{ result.totalFee }} <span class="text-sm font-bold opacity-80">GAS</span></p>
                </div>
                
                <div v-if="result.exception" class="p-5 rounded-2xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 text-sm font-mono break-all mt-4 shadow-sm">
                  <p class="font-bold mb-1 text-xs uppercase tracking-wider opacity-80">Exception Output</p>
                  {{ result.exception }}
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
const scriptFormat = ref("base64");
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
        const seeds = ["http://seed5t5.neo.org:20332", "http://seed2t5.neo.org:20332", "http://seed4t5.neo.org:20332"];
        return seeds[Math.floor(Math.random() * seeds.length)];
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
    if (scriptFormat.value === "hex") {
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
