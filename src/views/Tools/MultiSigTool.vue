<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
    <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Multi-Signature Wallet' }]" />

    <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="page-header-icon bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        </div>
        <div>
          <h1 class="page-title">Multi-Signature Wallet</h1>
          <p class="page-subtitle">Create co-owned transactions, coordinate signatures, and execute operations safely</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <button 
          :disabled="!connectedAccount"
          @click="showCreateModal = true" 
          class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary-700"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          New Request
        </button>
      </div>
    </div>

    <div class="etherscan-card p-6">
      <div v-if="loading" class="space-y-4">
        <Skeleton v-for="i in 3" :key="i" height="80px" />
      </div>
      <div v-else-if="requests.length === 0" class="text-center py-12 text-mid">
        <svg class="mx-auto h-12 w-12 text-low mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <p>No multi-sig requests found.</p>
        <button v-if="connectedAccount" @click="showCreateModal = true" class="text-primary-500 hover:underline mt-2 text-sm font-medium">Create the first one</button>
        <span v-else class="mt-2 block text-sm font-medium text-mid">Connect wallet from the top bar to create</span>
      </div>
      <div v-else class="space-y-4">
        <div v-for="req in requests" :key="req.id" class="border border-line-soft rounded-xl p-4 hover:border-primary-400 transition-colors">
          <div class="flex flex-wrap gap-4 items-start justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-high">{{ req.method }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {{ req.status }}
                </span>
              </div>
              <p class="text-sm text-mid mb-2">{{ req.description || "No description provided." }}</p>
              <div class="text-xs text-low font-hash flex items-center gap-2">
                <span>Target: {{ req.target_contract }}</span>
                <span>•</span>
                <span>Created: {{ new Date(req.created_at).toLocaleDateString() }}</span>
              </div>
            </div>
            
            <div class="text-right">
              <div class="text-sm font-semibold text-high mb-1">Signatures</div>
              <div class="flex items-center gap-2 justify-end">
                <div class="text-2xl font-bold text-primary-600">{{ req.signatures?.length || 0 }}</div>
                <div class="text-sm text-mid">/ {{ req.signers_required }}</div>
              </div>
            </div>
          </div>
          <div class="mt-4 pt-4 border-t border-line-soft">
            <div class="text-xs font-semibold text-high mb-2">Target Signers</div>
            <div class="flex flex-wrap gap-2">
               <span v-for="signer in (req.eligible_signers || [])" :key="signer" class="inline-flex items-center px-2 py-1 rounded bg-surface-muted border border-line-soft text-xs font-mono text-mid">
                 {{ connectedAccount === signer ? 'You (Pending)' : signer }}
               </span>
            </div>
            <div v-if="connectedAccount && req.eligible_signers?.includes(connectedAccount)" class="mt-4">
              <button class="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors">
                 Sign Transaction
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Simple Create Modal placeholder -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div class="w-full max-w-lg rounded-2xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950">
        <div class="px-6 py-4 border-b border-line-soft flex items-center justify-between">
          <h2 class="text-lg font-bold text-high">Create Multi-Sig Request</h2>
          <button @click="showCreateModal = false" class="text-low hover:text-high"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
           <div>
             <label class="block text-sm font-medium text-high mb-1">Request Name</label>
             <input type="text" class="form-input w-full" placeholder="e.g. Monthly Payroll" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Target Contract Hash / Recipient Address</label>
             <input type="text" class="form-input w-full" placeholder="N..." list="fast-contracts" />
             <datalist id="fast-contracts">
                <option value="0xf0151f528127558851b39c2cd8aa47da7418ab28">Flamingo (FLM)</option>
                <option value="0x48c40d4666f93408be1bef038b6722404d9a4c2a">NeoBurger (bNEO)</option>
                <option value="0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5">NEO Token</option>
                <option value="0xd2a4cff31913016155e38e474a2c06d08be276cf">GAS Token</option>
                <option value="NP2fM6AAN3mS6qA3oFk3TWeCgDMMmHrtfT">Binance Hot Wallet 1</option>
             </datalist>
             <p class="text-[10px] text-mid mt-1 px-1">Tip: Type to enter a custom address or select a known contract</p>
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Operation / Method</label>
             <input type="text" class="form-input w-full" placeholder="e.g. transfer" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Multi-Sig Co-Signers (comma separated)</label>
             <input type="text" class="form-input w-full" placeholder="N..., N..., N..." />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Signatures Required (Threshold)</label>
             <input type="number" class="form-input w-full" value="2" min="1" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Description</label>
             <textarea class="form-input w-full h-24" placeholder="Explain the purpose of this transaction..."></textarea>
           </div>
        </div>
        <div class="px-6 py-4 border-t border-line-soft bg-slate-50 flex justify-end gap-3 dark:bg-slate-900">
          <button @click="showCreateModal = false" class="px-4 py-2 text-sm font-medium text-mid hover:text-high transition-colors">Cancel</button>
          <button @click="handleCreateRequest" class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors active:scale-95">Create Request</button>
        </div>
      </div>
    </div>

    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount } from '@/utils/wallet';
import { useToast } from "vue-toastification";

// eslint-disable-next-line no-unused-vars
const _ = supabaseService;

const toast = useToast();
const loading = ref(true);
const requests = ref([]);
const showCreateModal = ref(false);

async function handleCreateRequest() {
  if (typeof window === "undefined" || !window.NEOLineN3) {
    toast.error("NeoLine N3 wallet not found.");
    return;
  }
  
  try {
    toast.info("Awaiting wallet signature...");
    const neoline = new window.NEOLineN3.Init();
    
    const result = await neoline.signMessage({
      message: "Authorize creation of new Multi-Sig Request"
    });
    
    if (result && result.signature) {
      toast.success("Request creation authorized successfully!");
      showCreateModal.value = false;
    }
  } catch (e) {
    console.error(e);
    toast.error("Signature rejected or failed: " + (e.description || e.message));
  }
}

onMounted(async () => {
  try {
    const data = await supabaseService.getMultisigRequests();
    requests.value = data || [];
  } catch (e) {
    if (import.meta.env.DEV) console.error("Error loading requests", e);
  } finally {
    loading.value = false;
  }
});
</script>
