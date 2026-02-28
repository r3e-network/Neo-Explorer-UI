const fs = require('fs');

fs.writeFileSync('src/views/Tools/MultiSigTool.vue', `<template>
  <div class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
    <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Multi-Signature & Governance' }]" />

    <div class="mb-6 flex items-center justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="page-header-icon bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        </div>
        <div>
          <h1 class="page-title">Multi-Signature & Governance</h1>
          <p class="page-subtitle">Create proposals and collect signatures for multi-sig execution</p>
        </div>
      </div>
      
      <button @click="showCreateModal = true" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        New Request
      </button>
    </div>

    <div class="etherscan-card p-6">
      <div v-if="loading" class="space-y-4">
        <Skeleton v-for="i in 3" :key="i" height="80px" />
      </div>
      <div v-else-if="requests.length === 0" class="text-center py-12 text-mid">
        <svg class="mx-auto h-12 w-12 text-low mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <p>No multi-sig requests found.</p>
        <button @click="showCreateModal = true" class="text-primary-500 hover:underline mt-2 text-sm font-medium">Create the first one</button>
      </div>
      <div v-else class="space-y-4">
        <div v-for="req in requests" :key="req.id" class="border border-line-soft rounded-xl p-4 hover:border-primary-400 transition-colors">
          <div class="flex flex-wrap gap-4 items-start justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-high">{{ req.method }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">
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
              <div class="flex items-center gap-2">
                <div class="text-2xl font-bold text-primary-600">{{ req.signatures?.length || 0 }}</div>
                <div class="text-sm text-mid">/ {{ req.signers_required }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Simple Create Modal placeholder -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div class="bg-surface w-full max-w-lg rounded-2xl shadow-xl border border-line-soft overflow-hidden">
        <div class="px-6 py-4 border-b border-line-soft flex items-center justify-between">
          <h2 class="text-lg font-bold text-high">Create Multi-Sig Request</h2>
          <button @click="showCreateModal = false" class="text-low hover:text-high"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div class="p-6 space-y-4">
           <div>
             <label class="block text-sm font-medium text-high mb-1">Target Contract Hash</label>
             <input type="text" class="form-input w-full" placeholder="0x..." />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Method Name</label>
             <input type="text" class="form-input w-full" placeholder="e.g. transfer" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Signatures Required (Threshold)</label>
             <input type="number" class="form-input w-full" value="2" min="1" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Description / Proposal details</label>
             <textarea class="form-input w-full h-24" placeholder="Explain the purpose of this request..."></textarea>
           </div>
        </div>
        <div class="px-6 py-4 border-t border-line-soft bg-surface-muted flex justify-end gap-3">
          <button @click="showCreateModal = false" class="px-4 py-2 text-sm font-medium text-mid hover:text-high">Cancel</button>
          <button class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm">Create Request</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import { supabaseService } from "@/services/supabaseService";

const loading = ref(true);
const requests = ref([]);
const showCreateModal = ref(false);

onMounted(async () => {
  // Mock loading for now
  setTimeout(() => {
    loading.value = false;
  }, 1000);
});
</script>
`);

fs.writeFileSync('src/services/supabaseService.js', fs.readFileSync('src/services/supabaseService.js', 'utf8') + `
  async getMultisigRequests() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('multisig_requests')
        .select('*, signatures:multisig_signatures(id)')
        .order('created_at', { ascending: false });
      return data || [];
    } catch (err) {
      return [];
    }
  }
`);
