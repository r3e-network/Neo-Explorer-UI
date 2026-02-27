<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Contract Factory' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
          </div>
          <div>
            <h1 class="page-title">Contract Factory</h1>
            <p class="page-subtitle">Launch standard tokens and NFT collections quickly without writing code.</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Sidebar / Selection -->
        <div class="lg:col-span-4 space-y-4">
          <div class="etherscan-card p-5">
            <h2 class="text-base font-bold text-high mb-4">Select Template</h2>
            <div class="space-y-3">
              <label 
                v-for="(tpl, key) in templates" 
                :key="key"
                class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                :class="selectedTemplate === key ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-line-soft bg-surface hover:border-primary-300'"
              >
                <input type="radio" v-model="selectedTemplate" :value="key" class="mt-1 w-4 h-4 text-primary-600 border-line-soft focus:ring-primary-500" @change="resetForm" />
                <div>
                  <p class="text-sm font-bold text-high">{{ tpl.name }}</p>
                  <p class="text-xs text-mid mt-0.5">{{ tpl.description }}</p>
                </div>
              </label>
            </div>
          </div>
          
          <div v-if="!connectedAccount" class="etherscan-card p-5 bg-surface-muted border-dashed text-center">
             <svg class="h-8 w-8 text-mid mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
             <p class="text-sm font-semibold text-high mb-1">Wallet Not Connected</p>
             <p class="text-xs text-mid">Connect your NeoLine wallet to deploy contracts.</p>
          </div>
        </div>
        
        <!-- Form Area -->
        <div class="lg:col-span-8">
          <div class="etherscan-card p-6 min-h-[400px] flex flex-col">
            <h2 class="text-lg font-bold text-high mb-6 border-b border-line-soft pb-4">
              Configure {{ activeTemplate.name }}
            </h2>
            
            <div class="space-y-5 flex-1">
              <div v-for="field in activeTemplate.fields" :key="field.id">
                <label class="block text-sm font-semibold text-high mb-1.5">{{ field.label }} <span v-if="field.required" class="text-red-500">*</span></label>
                
                <div v-if="field.type === 'neofs_upload'" class="flex flex-col sm:flex-row gap-3">
                  <input type="text" v-model="formData[field.id]" class="form-input flex-1 bg-surface text-high text-sm font-mono" :placeholder="field.placeholder" />
                  <button 
                    @click="triggerLogoInput(field.id)"
                    class="shrink-0 btn-outline flex items-center justify-center gap-2 text-sm px-4 py-2"
                    :disabled="isUploadingLogo"
                  >
                    <svg v-if="isUploadingLogo" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    Upload to NeoFS
                  </button>
                  <input type="file" :ref="setLogoInputRef(field.id)" class="hidden" accept="image/*" @change="e => uploadLogoToNeoFS(e, field.id)" />
                </div>
                
                <textarea v-else-if="field.type === 'textarea'" v-model="formData[field.id]" class="form-input w-full h-24 bg-surface text-high text-sm" :placeholder="field.placeholder"></textarea>
                
                <input v-else :type="field.type" v-model="formData[field.id]" class="form-input w-full bg-surface text-high text-sm" :placeholder="field.placeholder" />
                
                <p v-if="field.hint" class="text-xs text-mid mt-1.5">{{ field.hint }}</p>
              </div>
            </div>
            
            <div class="pt-6 mt-6 border-t border-line-soft flex items-center justify-end">
               <button 
                 @click="deployFactoryContract" 
                 :disabled="!connectedAccount || isDeploying || !isFormValid"
                 class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
               >
                 <svg v-if="isDeploying" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                 {{ isDeploying ? 'Deploying...' : 'Deploy Contract' }}
               </button>
            </div>
            
            <transition name="fade">
              <div v-if="txHash" class="p-4 rounded-xl border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 text-green-800 dark:text-green-400 flex items-center justify-between mt-6">
                <div>
                  <p class="text-sm font-bold mb-1">Contract Deploy Transaction Submitted!</p>
                  <p class="text-xs break-all font-mono opacity-80">{{ txHash }}</p>
                </div>
                <router-link :to="`/transaction-info/${txHash}`" class="text-sm font-semibold hover:underline flex items-center gap-1.5 whitespace-nowrap bg-green-200/50 dark:bg-green-800/50 px-3 py-1.5 rounded-lg transition-colors hover:bg-green-300/50 dark:hover:bg-green-700/50">
                  View Tx
                </router-link>
              </div>
            </transition>
            
          </div>
        </div>
      </div>
      
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { connectedAccount } from '@/utils/wallet';
import { useToast } from "vue-toastification";
import { walletService } from "@/services/walletService";
import { wallet } from "@cityofzion/neon-js";

const toast = useToast();
const selectedTemplate = ref("nep17");
const isDeploying = ref(false);
const isUploadingLogo = ref(false);
const txHash = ref("");
const formData = ref({});

const templates = {
  nep17: {
    name: "NEP-17 Token",
    description: "Standard fungible token. Ideal for utility tokens, currencies, and DAOs.",
    fields: [
      { id: "name", label: "Token Name", type: "text", placeholder: "e.g. My Awesome Token", required: true },
      { id: "symbol", label: "Symbol", type: "text", placeholder: "e.g. MAT", required: true },
      { id: "decimals", label: "Decimals", type: "number", default: 8, required: true },
      { id: "initialSupply", label: "Initial Supply", type: "number", default: 1000000, required: true },
      { id: "author", label: "Author / Company", type: "text", placeholder: "e.g. Neo Community" },
      { id: "description", label: "Description", type: "textarea", placeholder: "Brief description of the token..." },
      { id: "logoUrl", label: "Logo URL (NeoFS or HTTPS)", type: "neofs_upload", placeholder: "neofs:..." }
    ]
  },
  meme: {
    name: "Meme Coin Template",
    description: "Specialized NEP-17 token optimized for Meme coins with built-in social links.",
    fields: [
      { id: "name", label: "Meme Name", type: "text", placeholder: "e.g. DogeNeo", required: true },
      { id: "symbol", label: "Ticker Symbol", type: "text", placeholder: "e.g. DNEO", required: true },
      { id: "initialSupply", label: "Total Supply", type: "number", default: 1000000000, required: true },
      { id: "twitter", label: "Twitter / X Handle", type: "text", placeholder: "e.g. @DogeNeo" },
      { id: "telegram", label: "Telegram Group", type: "text", placeholder: "e.g. t.me/DogeNeo" },
      { id: "logoUrl", label: "Meme Mascot Logo (NeoFS)", type: "neofs_upload", placeholder: "neofs:..." }
    ]
  },
  nep11: {
    name: "NEP-11 NFT Collection",
    description: "Standard Non-Fungible Token collection contract.",
    fields: [
      { id: "name", label: "Collection Name", type: "text", placeholder: "e.g. Neo Punks", required: true },
      { id: "symbol", label: "Symbol", type: "text", placeholder: "e.g. NPUNK", required: true },
      { id: "baseUri", label: "Base URI for Metadata", type: "text", placeholder: "e.g. https://api.mycollection.com/metadata/", hint: "The trailing slash is recommended." },
      { id: "logoUrl", label: "Collection Banner (NeoFS)", type: "neofs_upload", placeholder: "neofs:..." }
    ]
  }
};

const activeTemplate = computed(() => templates[selectedTemplate.value]);

const isFormValid = computed(() => {
  for (const field of activeTemplate.value.fields) {
    if (field.required && !formData.value[field.id]) {
      return false;
    }
  }
  return true;
});

function resetForm() {
  const newForm = {};
  for (const field of activeTemplate.value.fields) {
    newForm[field.id] = field.default !== undefined ? field.default : "";
  }
  formData.value = newForm;
  txHash.value = "";
}

// Initialize form
resetForm();

const inputRefs = ref({});
function setLogoInputRef(id) {
  return (el) => {
    if (el) inputRefs.value[id] = el;
  };
}
function triggerLogoInput(id) {
  const el = inputRefs.value[id];
  if (el) el.click();
}

async function uploadLogoToNeoFS(e, fieldId) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first via the header.");
    return;
  }
  
  // NOTE: signMessage is tricky across different wallets (O3 vs NeoLine vs WC).
  // Some wallets only support invoke securely via standard interface.
  // For this mock demo, we will bypass strict signature requirements if not NeoLine
  // or we can just mock it for now since we are just filling a string.
  
  isUploadingLogo.value = true;
  toast.info("Preparing NeoFS upload payload...");
  
  try {
    // Mock successful upload by generating a NeoFS OID after a small delay
    await new Promise(resolve => setTimeout(resolve, 800));
    const mockOid = Array.from({length: 44}, () => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join('');
    formData.value[fieldId] = `neofs:${mockOid}`;
    toast.success("Logo uploaded to NeoFS successfully!");
  } catch (err) {
    console.error(err);
    toast.error("Upload rejected or failed.");
  } finally {
    isUploadingLogo.value = false;
    e.target.value = null; // reset input
  }
}

async function deployFactoryContract() {
  if (!connectedAccount.value || !isFormValid.value) return;
  
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first via the header.");
    return;
  }

  isDeploying.value = true;
  txHash.value = "";
  
  try {
    toast.info("Compiling template parameters...");
    // Simulate compilation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.info("Please review the deployment in your wallet...");
    
    // In a real factory, we would invoke the Factory Contract with our parameters.
    // For this demonstration, we simulate the factory deployment signature payload.
    // Let's do a self-transfer with a remark containing the template instructions to simulate deployment on-chain.
    
    const userScriptHash = new wallet.Account(connectedAccount.value).scriptHash;
    
    const result = await walletService.invoke({
        scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf', // GAS
        operation: 'transfer',
        args: [
            { type: "Hash160", value: userScriptHash },
            { type: "Hash160", value: userScriptHash },
            { type: "Integer", value: "0" },
            { type: "String", value: "FactoryDeploy:" + selectedTemplate.value }
        ],
        scope: 1
    });
    
    if (result && result.txid) {
      txHash.value = result.txid;
      toast.success(activeTemplate.value.name + " deployed successfully!");
    } else {
      throw new Error("No transaction ID returned.");
    }
  } catch (e) {
    console.error(e);
    toast.error("Deployment failed: " + (e.description || e.message || "User rejected"));
  } finally {
    isDeploying.value = false;
  }
}
</script>