<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'ABI Encoder / Decoder' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
          </div>
          <div>
            <h1 class="page-title">ABI Encoder & Decoder</h1>
            <p class="page-subtitle">Encode smart contract methods into executable scripts or decode raw hex transactions.</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card overflow-hidden">
        
        <!-- Tabs -->
        <div class="flex border-b border-line-soft bg-surface-muted/30">
          <button 
            @click="activeMode = 'encode'"
            class="flex-1 sm:flex-none px-8 py-4 font-bold text-sm transition-all duration-300 border-b-2 tracking-tight"
            :class="activeMode === 'encode' ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400 bg-white dark:bg-slate-900' : 'border-transparent text-mid hover:text-high hover:bg-surface'"
          >
            Encode Payload
          </button>
          <button 
            @click="activeMode = 'decode'"
            class="flex-1 sm:flex-none px-8 py-4 font-bold text-sm transition-all duration-300 border-b-2 tracking-tight"
            :class="activeMode === 'decode' ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400 bg-white dark:bg-slate-900' : 'border-transparent text-mid hover:text-high hover:bg-surface'"
          >
            Decode Script
          </button>
        </div>

        <div class="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
          
          <!-- Encode Mode -->
          <template v-if="activeMode === 'encode'">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="block text-sm font-bold text-high tracking-tight">Contract Hash</label>
                <input type="text" v-model="encodeForm.contractHash" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl shadow-inner focus:ring-2 focus:ring-fuchsia-500/20" placeholder="e.g. 0xef4073a0..." />
              </div>
              <div class="space-y-2">
                <label class="block text-sm font-bold text-high tracking-tight">Method Name</label>
                <input type="text" v-model="encodeForm.method" class="form-input w-full bg-surface text-high text-sm rounded-xl shadow-inner focus:ring-2 focus:ring-fuchsia-500/20" placeholder="e.g. transfer" />
              </div>
            </div>
            
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <label class="block text-sm font-bold text-high tracking-tight">Parameters</label>
                <button @click="addParam" class="text-xs font-bold text-fuchsia-600 hover:text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 px-3 py-1.5 rounded-lg dark:bg-fuchsia-900/30 dark:hover:bg-fuchsia-900/50 dark:text-fuchsia-400 transition-all duration-300 shadow-sm">+ Add Param</button>
              </div>
              
              <div v-if="encodeForm.params.length === 0" class="p-6 text-center border-2 border-dashed border-line-soft rounded-2xl bg-surface-muted/50 text-mid text-sm">
                No parameters added. Click <span class="font-bold text-fuchsia-500">"+ Add Param"</span> if the method requires arguments.
              </div>
              
              <transition-group name="list" tag="div" class="space-y-3">
                <div v-for="(param, i) in encodeForm.params" :key="i" class="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-surface-muted p-2 pr-3 rounded-2xl border border-line-soft relative group hover:border-primary-400 transition-colors shadow-sm">
                  <div class="w-full sm:w-1/3 flex items-center">
                    <div class="px-3 text-mid font-mono text-xs opacity-50 shrink-0">{{ i + 1 }}</div>
                    <select v-model="param.type" class="form-input w-full bg-surface text-sm font-semibold text-high rounded-xl border-transparent focus:border-fuchsia-400 focus:ring-0 shadow-sm cursor-pointer outline-none">
                      <option value="String">String</option>
                      <option value="Integer">Integer</option>
                      <option value="Hash160">Hash160 (Address)</option>
                      <option value="Hash256">Hash256</option>
                      <option value="ByteArray">ByteArray (Hex)</option>
                      <option value="PublicKey">PublicKey</option>
                      <option value="Boolean">Boolean</option>
                      <option value="Any">Any</option>
                    </select>
                  </div>
                  <div class="w-full sm:w-flex-1 relative">
                    <input type="text" v-model="param.value" class="form-input w-full bg-surface font-mono text-sm pr-10 border-transparent focus:border-fuchsia-400 focus:ring-0 rounded-xl shadow-sm" placeholder="Value..." />
                    <button @click="removeParam(i)" class="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-md transition-colors" title="Remove param">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                </div>
              </transition-group>
            </div>
            
            <div class="pt-6 mt-6 flex justify-end border-t border-line-soft">
              <button 
                @click="encodeScript"
                :disabled="!encodeForm.contractHash || !encodeForm.method"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-8 py-3 text-sm font-bold text-white hover:bg-fuchsia-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95"
              >
                Encode to Base64
              </button>
            </div>
            
            <transition name="fade">
              <div v-if="encodedResult" class="mt-6 p-6 rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white dark:border-fuchsia-900/30 dark:from-fuchsia-900/10 dark:to-slate-900 shadow-sm space-y-4">
                <div>
                  <p class="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-widest mb-1.5">Base64 Script</p>
                  <p class="text-sm text-high font-mono break-all p-3 bg-surface-muted rounded-xl border border-line-soft shadow-inner">{{ encodedResult.base64 }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-widest mb-1.5">Hex Script</p>
                  <p class="text-sm text-high font-mono break-all p-3 bg-surface-muted rounded-xl border border-line-soft shadow-inner">{{ encodedResult.hex }}</p>
                </div>
              </div>
            </transition>
          </template>
          
          <!-- Decode Mode -->
          <template v-if="activeMode === 'decode'">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="block text-sm font-bold text-high tracking-tight">Compiled Script</label>
                <select v-model="decodeFormat" class="form-input bg-surface text-xs py-1.5 px-3 rounded-lg border-line-soft hover:border-primary-400 transition-colors shadow-sm cursor-pointer outline-none">
                  <option value="base64">Base64</option>
                  <option value="hex">Hex String</option>
                </select>
              </div>
              <textarea v-model="decodeInput" class="form-input w-full h-40 bg-surface text-high font-mono text-sm rounded-2xl shadow-inner focus:ring-2 focus:ring-fuchsia-500/20" placeholder="Paste raw transaction script payload here..."></textarea>
            </div>
            
            <div class="pt-6 flex justify-end border-t border-line-soft">
              <button 
                @click="decodeScript"
                :disabled="!decodeInput.trim()"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-8 py-3 text-sm font-bold text-white hover:bg-fuchsia-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95"
              >
                Decode Script
              </button>
            </div>
            
            <transition name="fade">
              <div v-if="decodedResult" class="mt-6 rounded-2xl overflow-hidden border border-line-soft shadow-sm">
                <div v-if="decodedResult.error" class="p-5 bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400 text-sm font-bold flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  {{ decodedResult.error }}
                </div>
                <div v-else class="bg-surface">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-gradient-to-br from-fuchsia-50/50 to-transparent dark:from-fuchsia-900/10 border-b border-line-soft">
                    <div>
                      <p class="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-widest mb-1">Contract Invoked</p>
                      <p class="text-sm font-mono text-high font-semibold break-all">{{ decodedResult.contractHash }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-widest mb-1">Method Name</p>
                      <p class="text-sm font-bold text-high">{{ decodedResult.method }}</p>
                    </div>
                  </div>
                  <div class="p-5">
                    <p class="text-[10px] text-mid font-bold uppercase tracking-widest mb-3">Instructions (Opcodes)</p>
                    <div class="max-h-80 overflow-y-auto bg-slate-900 rounded-xl p-4 text-xs font-mono text-slate-300 space-y-1.5 shadow-inner">
                      <div v-for="(inst, i) in decodedResult.instructions" :key="i" class="flex gap-4 border-b border-slate-800/50 pb-1.5 mb-1.5 last:border-0 last:mb-0 last:pb-0 hover:bg-slate-800/50 rounded px-1 transition-colors">
                        <span class="text-slate-500 w-8 shrink-0 select-none">{{ i.toString().padStart(2, '0') }}</span>
                        <span class="text-fuchsia-400 w-24 shrink-0 font-bold">{{ inst.opcode }}</span>
                        <span class="break-all text-slate-200">{{ inst.operand || '' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </template>
          
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { useToast } from "vue-toastification";
import { sc, u, wallet } from "@cityofzion/neon-js";
import { disassembleScript, extractContractInvocation } from "@/utils/scriptDisassembler";

const toast = useToast();
const activeMode = ref("encode");

// Encode State
const encodeForm = ref({
  contractHash: "",
  method: "",
  params: []
});
const encodedResult = ref(null);

// Decode State
const decodeFormat = ref("base64");
const decodeInput = ref("");
const decodedResult = ref(null);

function addParam() {
  encodeForm.value.params.push({ type: 'String', value: '' });
}

function removeParam(index) {
  encodeForm.value.params.splice(index, 1);
}

function encodeScript() {
  try {
    let hash = encodeForm.value.contractHash.trim();
    if (!hash.startsWith('0x')) hash = '0x' + hash;
    
    const method = encodeForm.value.method.trim();
    
    const args = encodeForm.value.params.map((p, index) => {
      try {
        let val = p.value;
        if (p.type === 'Hash160') {
           if (val.startsWith('N')) {
              val = new wallet.Account(val).scriptHash;
           } else if (val.startsWith('0x')) {
              val = val.replace(/^0x/, '');
           }
        } else if (p.type === 'ByteArray' || p.type === 'Hash256') {
           if (val.startsWith('0x')) val = val.replace(/^0x/, '');
        } else if (p.type === 'Integer') {
           val = val.toString();
        } else if (p.type === 'Boolean') {
           val = val === 'true' || val === '1';
        }
        return sc.ContractParam.fromJson({ type: p.type, value: val });
      } catch (err) {
        throw new Error(`Invalid format for Parameter ${index + 1} (${p.type})`);
      }
    });
    
    const sb = new sc.ScriptBuilder();
    sb.emitAppCall(hash, method, args);
    
    const hex = sb.build();
    const base64 = u.hex2base64(hex);
    
    encodedResult.value = { hex, base64 };
    toast.success("Script successfully encoded!");
  } catch (err) {
    console.error(err);
    toast.error("Failed to encode: " + err.message);
  }
}

function decodeScript() {
  try {
    let input = decodeInput.value.trim();
    let base64Script = "";
    
    if (decodeFormat.value === "hex") {
      const cleanHex = input.replace(/^0x/, '');
      base64Script = u.hex2base64(cleanHex);
    } else {
      base64Script = input;
    }
    
    const instructions = disassembleScript(base64Script);
    const invocation = extractContractInvocation(base64Script);
    
    if (!invocation) {
      decodedResult.value = {
        error: "Script successfully disassembled, but no primary contract invocation (SYSCALL System.Contract.Call) was found.",
        instructions
      };
    } else {
      decodedResult.value = {
        contractHash: invocation.contractHash,
        method: invocation.method,
        instructions
      };
    }
    
    toast.success("Script successfully decoded!");
  } catch (err) {
    console.error(err);
    decodedResult.value = { error: "Failed to decode script. Ensure it is valid Hex or Base64." };
    toast.error("Failed to decode: " + err.message);
  }
}
</script>
