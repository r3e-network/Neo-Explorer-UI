<template>
  <div class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
    <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Council Governance' }]" />

    <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="page-header-icon bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
        </div>
        <div>
          <h1 class="page-title">Council Governance</h1>
          <p class="page-subtitle">Create official committee proposals, adjust network variables, and gather validator signatures</p>
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
        <p>No pending council proposals found.</p>
        <button @click="showCreateModal = true" class="text-primary-500 hover:underline mt-2 text-sm font-medium">Create the first one</button>
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
          <h2 class="text-lg font-bold text-high">Create Council Proposal</h2>
          <button @click="showCreateModal = false" class="text-low hover:text-high"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div class="p-6 space-y-4">
           <div>
             <label class="block text-sm font-medium text-high mb-1">Proposal Type</label>
             <select class="form-input w-full bg-surface">
               <option value="policy">Update Network Policy (Fee, Gas, etc.)</option>
               <option value="committee">Update Committee Members</option>
               <option value="designate">Designate Oracle / Role</option>
               <option value="other">Other Native Contract Invocation</option>
             </select>
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Target Native Contract</label>
             <select class="form-input w-full bg-surface">
               <option value="PolicyContract">Policy Contract</option>
               <option value="RoleManagement">Role Management</option>
               <option value="OracleContract">Oracle Contract</option>
               <option value="NEO">NEO Token (Governance)</option>
             </select>
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Method to Invoke</label>
             <input type="text" class="form-input w-full" placeholder="e.g. setFeePerByte" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">New Value / Parameter</label>
             <input type="text" class="form-input w-full" placeholder="JSON array or integer" />
           </div>
           <div class="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
             <p class="font-semibold mb-1">Note for Council Proposals:</p>
             <p>Signers are strictly limited to the current active Neo consensus nodes. Threshold is automatically determined (typically 2/3 + 1 of the committee).</p>
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Proposal Motivation</label>
             <textarea class="form-input w-full h-24" placeholder="Explain why the council should sign this proposal..."></textarea>
           </div>
        </div>
        <div class="px-6 py-4 border-t border-line-soft bg-surface-muted flex justify-end gap-3">
          <button @click="showCreateModal = false" class="px-4 py-2 text-sm font-medium text-mid hover:text-high transition-colors">Cancel</button>
          <button class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors active:scale-95">Create Request</button>
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
// eslint-disable-next-line no-unused-vars
const _ = supabaseService;

const loading = ref(true);
const requests = ref([]);
const showCreateModal = ref(false);

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
