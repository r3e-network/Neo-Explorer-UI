<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Contract Deployer' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
          </div>
          <div>
            <h1 class="page-title">Contract Deployer</h1>
            <p class="page-subtitle">Upload your compiled NEF and Manifest files to deploy directly to the Neo N3 blockchain.</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card p-6">
        <div class="max-w-3xl mx-auto space-y-6">
          <div v-if="!connectedAccount" class="text-center py-10 border border-dashed border-line-soft rounded-xl bg-surface-muted">
             <svg class="h-10 w-10 text-mid mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
             <p class="text-high font-medium mb-1">Wallet Not Connected</p>
             <p class="text-sm text-mid">Please connect your NeoLine wallet to deploy a contract.</p>
          </div>

          <template v-else>
            <!-- NEF Upload -->
            <div>
              <label class="block text-sm font-semibold text-high mb-2">Compiled NEF File</label>
              <div 
                class="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
                :class="nefFile ? 'border-blue-500/50 bg-blue-50/30 dark:bg-blue-900/10' : 'border-line-soft hover:border-primary-400 bg-surface'"
                @click="$refs.nefInput.click()"
                style="cursor: pointer;"
              >
                <input type="file" ref="nefInput" class="hidden" accept=".nef" @change="onNefSelected" />
                <template v-if="!nefFile">
                  <svg class="w-10 h-10 text-mid mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <p class="text-sm font-semibold text-high">Click to select your .nef file</p>
                </template>
                <template v-else>
                  <svg class="w-10 h-10 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <p class="text-sm font-bold text-blue-600 dark:text-blue-400">{{ nefFile.name }}</p>
                  <p class="text-xs text-mid mt-1">{{ formatBytes(nefFile.size) }}</p>
                  <button @click.stop="clearNef" class="mt-3 text-xs text-red-500 hover:text-red-600 font-medium hover:underline">Remove file</button>
                </template>
              </div>
            </div>

            <!-- Manifest Upload -->
            <div>
              <label class="block text-sm font-semibold text-high mb-2">Manifest JSON File</label>
              <div 
                class="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
                :class="manifestFile ? 'border-blue-500/50 bg-blue-50/30 dark:bg-blue-900/10' : 'border-line-soft hover:border-primary-400 bg-surface'"
                @click="$refs.manifestInput.click()"
                style="cursor: pointer;"
              >
                <input type="file" ref="manifestInput" class="hidden" accept=".json" @change="onManifestSelected" />
                <template v-if="!manifestFile">
                  <svg class="w-10 h-10 text-mid mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                  <p class="text-sm font-semibold text-high">Click to select your manifest.json</p>
                </template>
                <template v-else>
                  <svg class="w-10 h-10 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <p class="text-sm font-bold text-blue-600 dark:text-blue-400">{{ manifestFile.name }}</p>
                  <p v-if="parsedManifestName" class="text-xs text-mid mt-1">Contract: <span class="font-semibold">{{ parsedManifestName }}</span></p>
                  <button @click.stop="clearManifest" class="mt-3 text-xs text-red-500 hover:text-red-600 font-medium hover:underline">Remove file</button>
                </template>
              </div>
            </div>
            
            <div class="pt-4 flex justify-end">
               <button 
                 @click="deployContract" 
                 :disabled="!isReadyToDeploy || isDeploying"
                 class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
               >
                 <svg v-if="isDeploying" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 {{ isDeploying ? 'Deploying...' : 'Deploy Contract' }}
               </button>
            </div>
            
            <transition name="fade">
              <div v-if="txHash" class="p-4 rounded-xl border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 text-green-800 dark:text-green-400 flex items-center justify-between mt-4">
                <div>
                  <p class="text-sm font-bold mb-1">Contract Deployment Transaction Submitted!</p>
                  <p class="text-xs break-all font-mono opacity-80">{{ txHash }}</p>
                </div>
                <router-link :to="`/transaction-info/${txHash}`" class="text-sm font-semibold hover:underline flex items-center gap-1.5 whitespace-nowrap bg-green-200/50 dark:bg-green-800/50 px-3 py-1.5 rounded-lg transition-colors hover:bg-green-300/50 dark:hover:bg-green-700/50">
                  View Tx
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
import { ref, computed } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { connectedAccount } from '@/utils/wallet';
import { useToast } from "vue-toastification";
import { formatBytes } from "@/utils/explorerFormat";
import { walletService } from "@/services/walletService";

const toast = useToast();
const nefFile = ref(null);
const manifestFile = ref(null);
const nefBase64 = ref("");
const manifestString = ref("");
const parsedManifestName = ref("");
const isDeploying = ref(false);
const txHash = ref("");

const isReadyToDeploy = computed(() => {
  return nefFile.value && manifestFile.value && nefBase64.value && manifestString.value;
});

function buf2base64(buffer) {
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");

  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function onNefSelected(e) {
  const file = e.target.files[0];
  if (file) {
    nefFile.value = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      nefBase64.value = buf2base64(ev.target.result);
    };
    reader.readAsArrayBuffer(file);
  }
}

function onManifestSelected(e) {
  const file = e.target.files[0];
  if (file) {
    manifestFile.value = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const parsed = JSON.parse(text);
        parsedManifestName.value = parsed.name || "Unknown Contract";
        // Minify string
        manifestString.value = JSON.stringify(parsed);
      } catch(err) {
        toast.error("Invalid Manifest JSON");
        clearManifest();
      }
    };
    reader.readAsText(file);
  }
}

function clearNef() {
  nefFile.value = null;
  nefBase64.value = "";
}

function clearManifest() {
  manifestFile.value = null;
  manifestString.value = "";
  parsedManifestName.value = "";
}

async function deployContract() {
  if (!connectedAccount.value) return;
  if (!isReadyToDeploy.value) return;
  
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first via the header.");
    return;
  }

  isDeploying.value = true;
  txHash.value = "";
  
  try {
    toast.info("Please review the deployment in your wallet...");
    
    const result = await walletService.invoke({
      scriptHash: "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd", // ContractManagement
      operation: "deploy",
      args: [
        { type: "ByteArray", value: nefBase64.value },
        { type: "String", value: manifestString.value }
      ],
      // Deploy can invoke nested witness checks inside _deploy; Global is the safe default.
      scope: 128
    });
    
    if (result && result.txid) {
      txHash.value = result.txid;
      toast.success("Contract successfully deployed to the network!");
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
