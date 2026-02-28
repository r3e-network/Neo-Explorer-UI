const fs = require('fs');

fs.writeFileSync('src/views/Tools/NeoFSTool.vue', `<template>
  <div class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
    <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'NeoFS Gateway' }]" />

    <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="page-header-icon bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
        </div>
        <div>
          <h1 class="page-title">NeoFS Gateway</h1>
          <p class="page-subtitle">Upload, search, and manage decentralized files on NeoFS</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <button 
          v-if="!connectedAccount" 
          @click="connectWallet" 
          class="inline-flex items-center gap-2 rounded-lg bg-surface-elevated border border-line-soft px-4 py-2 text-sm font-semibold text-high hover:border-primary-500 transition-colors"
        >
          Connect Wallet
        </button>
        <button 
          v-else
          @click="showUploadModal = true" 
          class="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors active:scale-95"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          Upload File
        </button>
      </div>
    </div>

    <!-- Search / Retrieval Tool -->
    <div class="etherscan-card p-6 mb-8">
      <h2 class="text-base font-semibold text-high mb-4">Retrieve from NeoFS</h2>
      <div class="flex gap-3">
        <input v-model="searchUrl" type="text" class="form-input flex-1" placeholder="Enter NeoFS URL (neofs://...) or Container ID" @keyup.enter="handleSearch" />
        <button @click="handleSearch" :disabled="!searchUrl.trim() || isSearching" class="btn-primary min-w-[100px] flex items-center justify-center">
          <svg v-if="isSearching" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span v-else>Fetch</span>
        </button>
      </div>
      <div v-if="searchResult" class="mt-4 p-4 border border-line-soft rounded-xl bg-surface-muted flex items-start gap-4">
        <!-- Minimal placeholder for search result -->
        <div class="flex-1">
          <p class="text-sm font-medium text-high">File Found</p>
          <p class="text-xs text-mid break-all">{{ searchUrl }}</p>
        </div>
        <button class="btn-outline text-xs">Download</button>
      </div>
    </div>

    <!-- My Files / Containers (Placeholder) -->
    <div class="etherscan-card p-6">
      <h2 class="text-base font-semibold text-high mb-4">My Containers</h2>
      <div v-if="!connectedAccount" class="text-center py-12 text-mid">
        <svg class="mx-auto h-12 w-12 text-low mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        <p>Connect your wallet to view your NeoFS containers and files.</p>
      </div>
      <div v-else class="text-center py-12 text-mid">
        <p>You do not have any active NeoFS containers yet.</p>
      </div>
    </div>

    <!-- Upload Modal -->
    <div v-if="showUploadModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div class="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-line-soft overflow-hidden relative z-10">
        <div class="px-6 py-4 border-b border-line-soft flex items-center justify-between">
          <h2 class="text-lg font-bold text-high">Upload to NeoFS</h2>
          <button @click="showUploadModal = false" class="text-low hover:text-high"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div class="border-2 border-dashed border-line-soft rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-muted hover:border-cyan-400 transition-colors">
            <svg class="w-10 h-10 text-cyan-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            <p class="text-sm font-semibold text-high">Click to browse or drag file here</p>
            <p class="text-xs text-mid mt-1">Supports PNG, JPG, JSON, and ZIP up to 5MB (for Explorer integration demo)</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-high mb-1">Target Container</label>
            <select class="form-input w-full bg-surface">
               <option value="new">Create New Public Container</option>
               <option value="private">Create New Private Container</option>
            </select>
          </div>
        </div>
        <div class="px-6 py-4 border-t border-line-soft bg-surface-muted flex justify-end gap-3">
          <button @click="showUploadModal = false" class="px-4 py-2 text-sm font-medium text-mid hover:text-high transition-colors">Cancel</button>
          <button class="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-sm transition-colors active:scale-95">Upload File</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { connectedAccount, connectWallet } from '@/utils/wallet';

const showUploadModal = ref(false);
const searchUrl = ref('');
const isSearching = ref(false);
const searchResult = ref(null);

function handleSearch() {
  if (!searchUrl.value.trim()) return;
  isSearching.value = true;
  // Mock fetch
  setTimeout(() => {
    isSearching.value = false;
    searchResult.value = true;
  }, 800);
}
</script>`);
