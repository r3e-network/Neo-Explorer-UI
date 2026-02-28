<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Abstract Account Deployer' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <div>
            <h1 class="page-title">Abstract Account Deployer</h1>
            <p class="page-subtitle">Deploy a professional permission-controlling smart account with admins, managers, and spending limits.</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card p-6">
        <div class="max-w-3xl mx-auto space-y-8">
          <div v-if="!connectedAccount" class="text-center py-12 border border-dashed border-line-soft rounded-2xl bg-surface-muted/50">
             <div class="h-14 w-14 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-line-soft shadow-sm">
               <svg class="h-7 w-7 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
             </div>
             <p class="text-high font-bold mb-1">Wallet Not Connected</p>
             <p class="text-sm text-mid max-w-sm mx-auto">Please connect your NeoLine or O3 wallet to deploy the Abstract Account contract to the blockchain.</p>
          </div>

          <template v-else>
            <div class="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-900/30 rounded-xl p-5 flex items-start gap-4">
              <svg class="h-6 w-6 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div>
                <h4 class="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-1">Automated Contract Bundling</h4>
                <p class="text-sm text-indigo-800/80 dark:text-indigo-400/80 leading-relaxed">
                  This tool seamlessly injects the pre-compiled <strong>AbstractAccount.nef</strong> and deploys it on your behalf. By default, your connected wallet address is configured as the master Admin.
                </p>
              </div>
            </div>

            <div class="space-y-6">
              <div class="flex items-center gap-3 border-b border-line-soft pb-3">
                <span class="flex items-center justify-center w-6 h-6 rounded bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-bold text-sm">1</span>
                <h2 class="text-lg font-bold text-high">Admin Configuration</h2>
              </div>
              <p class="text-sm text-mid -mt-2">Admins maintain full sovereignty over the Abstract Account. They hold the power to upgrade the NEF contract logic, modify thresholds, and manage whitelists/blacklists.</p>
              
              <div class="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6">
                <div>
                  <label class="block text-sm font-semibold text-high mb-2">Admin Addresses (One per line)</label>
                  <textarea v-model="form.admins" rows="4" class="form-input w-full font-mono text-sm bg-surface shadow-inner resize-none" placeholder="N..."></textarea>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-high mb-2">Signature Threshold</label>
                  <div class="relative">
                    <input type="number" v-model.number="form.adminThreshold" min="1" class="form-input w-full bg-surface shadow-inner pr-12 text-center text-lg font-medium" />
                    <span class="absolute inset-y-0 right-4 flex items-center text-mid text-sm font-semibold pointer-events-none">of N</span>
                  </div>
                  <p class="text-xs text-low mt-2 text-center">Minimum signatures required</p>
                </div>
              </div>
            </div>

            <div class="space-y-6 pt-2">
              <div class="flex items-center gap-3 border-b border-line-soft pb-3">
                <span class="flex items-center justify-center w-6 h-6 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold text-sm">2</span>
                <h2 class="text-lg font-bold text-high">Manager Configuration <span class="text-xs font-medium text-mid ml-2 px-2 py-0.5 bg-surface-muted rounded-full border border-line-soft">(Optional)</span></h2>
              </div>
              <p class="text-sm text-mid -mt-2">Managers are restricted operational roles. They can execute transactions (like NEP-17 token transfers) on behalf of the Abstract Account, strictly bound by spending limits and whitelists.</p>
              
              <div class="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6">
                <div>
                  <label class="block text-sm font-semibold text-high mb-2">Manager Addresses (One per line)</label>
                  <textarea v-model="form.managers" rows="4" class="form-input w-full font-mono text-sm bg-surface shadow-inner resize-none" placeholder="N..."></textarea>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-high mb-2">Signature Threshold</label>
                  <div class="relative">
                    <input type="number" v-model.number="form.managerThreshold" min="0" class="form-input w-full bg-surface shadow-inner pr-12 text-center text-lg font-medium" />
                    <span class="absolute inset-y-0 right-4 flex items-center text-mid text-sm font-semibold pointer-events-none">of N</span>
                  </div>
                  <p class="text-xs text-low mt-2 text-center">Set to 0 to disable</p>
                </div>
              </div>
            </div>

            <div class="pt-8 mt-4 border-t border-line-soft flex justify-end">
               <button 
                 @click="deployContract" 
                 :disabled="isDeploying"
                 class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-bold text-white hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-[0.98]"
               >
                 <svg v-if="isDeploying" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                 <span>{{ isDeploying ? 'Processing Deployment...' : 'Deploy Abstract Account' }}</span>
               </button>
            </div>
            
            <transition name="fade">
              <div v-if="txHash" class="p-5 rounded-xl border border-success/30 bg-success/5 text-success/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8">
                <div class="flex items-start gap-3">
                  <div class="p-1 bg-success/20 rounded-full mt-0.5">
                    <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <div>
                    <p class="text-sm font-bold text-high mb-1">Contract Deployment Transaction Submitted!</p>
                    <p class="text-xs break-all font-mono opacity-80">{{ txHash }}</p>
                  </div>
                </div>
                <router-link :to="`/transaction/${txHash}`" class="text-sm font-semibold whitespace-nowrap bg-success/20 hover:bg-success/30 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shrink-0">
                  View Transaction
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
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
import { ref, watch } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { connectedAccount } from '@/utils/wallet';
import { useToast } from "vue-toastification";
import { walletService } from "@/services/walletService";
import { addressToScriptHash } from "@/utils/neoHelpers";
import { ABSTRACT_ACCOUNT_NEF_BASE64, ABSTRACT_ACCOUNT_MANIFEST_STRING } from "@/constants/abstractAccountArtifacts";

const toast = useToast();
const isDeploying = ref(false);
const txHash = ref("");

const form = ref({
  admins: "",
  adminThreshold: 1,
  managers: "",
  managerThreshold: 1
});

watch(connectedAccount, (acc) => {
  if (acc && !form.value.admins) {
    form.value.admins = acc;
  }
}, { immediate: true });

// Contract artifacts generated from contracts/AbstractAccount/bin/sc.

function parseAddresses(text) {
  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(addr => {
       const hash = addressToScriptHash(addr);
       if (!hash) throw new Error("Invalid address format: " + addr);
       return hash;
    });
}

async function deployContract() {
  if (!connectedAccount.value) return;
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first via the header.");
    return;
  }

  try {
    const adminHashes = parseAddresses(form.value.admins);
    const managerHashes = parseAddresses(form.value.managers);

    if (adminHashes.length === 0) {
      toast.error("At least one admin address is required");
      return;
    }

    if (form.value.adminThreshold > adminHashes.length || form.value.adminThreshold < 1) {
      toast.error("Invalid Admin Threshold");
      return;
    }

    if (managerHashes.length > 0 && (form.value.managerThreshold > managerHashes.length || form.value.managerThreshold < 1)) {
      toast.error("Invalid Manager Threshold");
      return;
    }

    const manifestObj = JSON.parse(ABSTRACT_ACCOUNT_MANIFEST_STRING);
    // Append a unique timestamp to the name so multiple deployments of the same NEF are allowed by the network
    manifestObj.name = `AbstractAccount_${Date.now().toString().slice(-6)}`;
    const dynamicManifestStr = JSON.stringify(manifestObj);

    // NeoLine format for deploy data arguments
    const deployData = {
      type: "Array",
      value: [
        { type: "Array", value: adminHashes.map(h => ({ type: "Hash160", value: h })) },
        { type: "Integer", value: form.value.adminThreshold.toString() },
        { type: "Array", value: managerHashes.map(h => ({ type: "Hash160", value: h })) },
        { type: "Integer", value: form.value.managerThreshold.toString() }
      ]
    };

    isDeploying.value = true;
    txHash.value = "";
    toast.info("Please review the deployment in your wallet...");

    const result = await walletService.invoke({
      scriptHash: "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd", // ContractManagement
      operation: "deploy",
      args: [
        { type: "ByteArray", value: ABSTRACT_ACCOUNT_NEF_BASE64 },
        { type: "String", value: dynamicManifestStr },
        deployData
      ],
      // _deploy performs nested witness checks (SetManagers -> CheckAdminSignatures),
      // so CalledByEntry is insufficient; Global scope is required for deploy.
      scope: 128
    });

    if (result && result.txid) {
      txHash.value = result.txid;
      toast.success("Abstract Account successfully deployed!");
    } else {
      throw new Error("No transaction ID returned.");
    }

  } catch (err) {
    console.error(err);
    toast.error("Deployment failed: " + (err.description || err.message || "User rejected"));
  } finally {
    isDeploying.value = false;
  }
}
</script>
