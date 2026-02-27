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

      <div class="etherscan-card p-6">
        
        <!-- Tabs -->
        <div class="flex border-b border-line-soft mb-6">
          <button 
            @click="activeMode = 'encode'"
            class="px-6 py-3 font-semibold text-sm transition-colors border-b-2"
            :class="activeMode === 'encode' ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400' : 'border-transparent text-mid hover:text-high'"
          >
            Encode Payload
          </button>
          <button 
            @click="activeMode = 'decode'"
            class="px-6 py-3 font-semibold text-sm transition-colors border-b-2"
            :class="activeMode === 'decode' ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400' : 'border-transparent text-mid hover:text-high'"
          >
            Decode Script
          </button>
        </div>

        <div class="max-w-3xl mx-auto space-y-6">
          
          <!-- Encode Mode -->
          <template v-if="activeMode === 'encode'">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="block text-sm font-semibold text-high">Contract Hash</label>
                <input type="text" v-model="encodeForm.contractHash" class="form-input w-full bg-surface text-high font-mono text-sm" placeholder="e.g. 0xef4073a0..." />
              </div>
              <div class="space-y-2">
                <label class="block text-sm font-semibold text-high">Method Name</label>
                <input type="text" v-model="encodeForm.method" class="form-input w-full bg-surface text-high text-sm" placeholder="e.g. transfer" />
              </div>
            </div>
            
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="block text-sm font-semibold text-high">Parameters</label>
                <button @click="addParam" class="text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-700 bg-fuchsia-50 px-2 py-1 rounded-md dark:bg-fuchsia-900/30 dark:text-fuchsia-400 transition-colors">+ Add Param</button>
              </div>
              
              <div v-if="encodeForm.params.length === 0" class="p-4 text-center border border-dashed border-line-soft rounded-xl text-mid text-sm">
                No parameters added. Click "+ Add Param" if the method requires arguments.
              </div>
              
              <div v-for="(param, i) in encodeForm.params" :key="i" class="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-surface-muted p-3 rounded-xl border border-line-soft relative">
                <div class="w-full sm:w-1/3">
                  <select v-model="param.type" class="form-input w-full bg-surface text-sm appearance-none">
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
                  <input type="text" v-model="param.value" class="form-input w-full bg-surface font-mono text-sm pr-8" placeholder="Value..." />
                  <button @click="removeParam(i)" class="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-500" title="Remove param">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="pt-4 flex justify-end border-t border-line-soft">
              <button 
                @click="encodeScript"
                :disabled="!encodeForm.contractHash || !encodeForm.method"
                class="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-fuchsia-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
              >
                Encode to Base64
              </button>
            </div>
            
            <transition name="fade">
              <div v-if="encodedResult" class="mt-4 p-4 rounded-xl border border-line-soft bg-surface space-y-3">
                <div>
                  <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-1">Base64 Script</p>
                  <p class="text-sm text-high font-mono break-all p-2 bg-surface-muted rounded-lg border border-line-soft">{{ encodedResult.base64 }}</p>
                </div>
                <div>
                  <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-1">Hex Script</p>
                  <p class="text-sm text-high font-mono break-all p-2 bg-surface-muted rounded-lg border border-line-soft">{{ encodedResult.hex }}</p>
                </div>
              </div>
            </transition>
          </template>
          
          <!-- Decode Mode -->
          <template v-if="activeMode === 'decode'">
            <div class="space-y-2">
              <label class="block text-sm font-semibold text-high">Compiled Script (Base64 or Hex)</label>
              <textarea v-model="decodeInput" class="form-input w-full h-32 bg-surface text-high font-mono text-sm" placeholder="Paste raw transaction script payload here..."></textarea>
            </div>
            
            <div class="pt-4 flex justify-end border-t border-line-soft">
              <button 
                @click="decodeScript"
                :disabled="!decodeInput.trim()"
                class="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-fuchsia-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
              >
                Decode Script
              </button>
            </div>
            
            <transition name="fade">
              <div v-if="decodedResult" class="mt-4 p-4 rounded-xl border border-line-soft bg-surface">
                <div v-if="decodedResult.error" class="text-red-500 text-sm font-medium">
                  {{ decodedResult.error }}
                </div>
                <div v-else class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-1">Contract Invoked</p>
                      <p class="text-sm font-mono text-high break-all">{{ decodedResult.contractHash }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-1">Method Name</p>
                      <p class="text-sm font-bold text-high">{{ decodedResult.method }}</p>
                    </div>
                  </div>
                  <div>
                    <p class="text-xs text-mid font-semibold uppercase tracking-wider mb-2">Instructions (Opcodes)</p>
                    <div class="max-h-60 overflow-y-auto bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-300 space-y-1">
                      <div v-for="(inst, i) in decodedResult.instructions" :key="i" class="flex gap-4 border-b border-slate-800 pb-1 mb-1 last:border-0">
                        <span class="text-slate-500 w-8 shrink-0">{{ i.toString().padStart(2, '0') }}</span>
                        <span class="text-fuchsia-400 w-24 shrink-0 font-bold">{{ inst.opcode }}</span>
                        <span class="break-all">{{ inst.operand || '' }}</span>
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
    
    const args = encodeForm.value.params.map(p => {
      let val = p.value;
      if (p.type === 'Hash160') {
         // Auto-convert standard address to Hash160 if needed
         if (val.startsWith('N')) {
            val = new wallet.Account(val).scriptHash;
         }
      }
      return sc.ContractParam.fromJson({ type: p.type, value: val });
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
    
    // Check if it's hex or base64
    if (/^[0-9a-fA-F]+$/.test(input) || input.startsWith('0x')) {
      // It's hex
      const cleanHex = input.replace(/^0x/, '');
      base64Script = u.hex2base64(cleanHex);
    } else {
      // Assume base64
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
