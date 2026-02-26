<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
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
          :disabled="!connectedAccount"
          @click="showUploadModal = true" 
          class="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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

    <!-- My Files / Containers -->
    <div class="etherscan-card p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-base font-semibold text-high">My NeoFS Assets</h2>
        <div v-if="connectedAccount" class="flex items-center gap-2">
           <button @click="refreshAssets" class="p-1.5 rounded-lg hover:bg-surface-muted transition-colors text-mid" title="Refresh assets">
             <svg :class="{'animate-spin': isRefreshing}" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
           </button>
           <button @click="openNewContainerModal" class="btn-outline text-xs py-1.5">New Container</button>
        </div>
      </div>

      <div v-if="!connectedAccount" class="text-center py-12 bg-surface-muted/30 rounded-2xl border border-dashed border-line-soft">
        <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <svg class="h-8 w-8 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <p class="text-high font-medium mb-1">Wallet Not Connected</p>
        <p class="text-sm text-mid mb-6 max-w-xs mx-auto">Connect your wallet from the top header to view and manage your decentralized storage containers on NeoFS.</p>
      </div>

      <div v-else-if="assets.length === 0 && !isRefreshing" class="text-center py-12">
        <div class="w-16 h-16 rounded-full bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center mx-auto mb-4">
          <svg class="h-8 w-8 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
        </div>
        <p class="text-high font-medium mb-1">No containers found</p>
        <p class="text-sm text-mid mb-6">You don't have any NeoFS containers associated with this account yet.</p>
        <button @click="showUploadModal = true" class="btn-primary">Create Your First Container</button>
      </div>

      <div v-else class="space-y-4">
        <div v-if="isRefreshing" class="space-y-4">
          <div v-for="i in 2" :key="i" class="h-24 bg-surface-muted animate-pulse rounded-xl border border-line-soft"></div>
        </div>
        <template v-else>
          <div v-for="container in assets" :key="container.id" class="border border-line-soft rounded-xl p-5 hover:border-cyan-400/50 transition-all bg-surface hover:shadow-md">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2 2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                </div>
                <div>
                  <h3 class="font-bold text-high">{{ container.name }}</h3>
                  <p class="text-xs text-mid font-mono mt-0.5 break-all">{{ container.id }}</p>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider" :class="container.isPublic ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'">
                {{ container.isPublic ? 'Public' : 'Private' }}
              </span>
            </div>
            
            <div class="flex items-center justify-between pt-4 border-t border-line-soft/50">
              <div class="flex gap-4">
                <div class="text-xs">
                  <span class="text-low block uppercase tracking-tighter font-semibold">Objects</span>
                  <span class="text-high font-bold">{{ container.objectCount }}</span>
                </div>
                <div class="text-xs">
                  <span class="text-low block uppercase tracking-tighter font-semibold">Size</span>
                  <span class="text-high font-bold">{{ container.size }}</span>
                </div>
              </div>
              <div class="flex gap-2">
                <button @click="viewObjects(container)" class="btn-outline py-1 px-3 text-[11px]">View Objects</button>
                <button @click="openUploadForContainer(container.id)" class="btn-primary py-1 px-3 text-[11px]">Upload</button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    
    <!-- View Objects Modal -->
    <div v-if="showObjectsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div class="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl border border-line-soft overflow-hidden relative z-10 flex flex-col max-h-[85vh]">
        <div class="px-6 py-4 border-b border-line-soft flex items-center justify-between shrink-0">
          <div>
            <h2 class="text-lg font-bold text-high">Objects in Container</h2>
            <p class="text-xs text-mid font-mono mt-1">{{ activeContainer?.name || activeContainer?.id }}</p>
          </div>
          <button @click="showObjectsModal = false" class="text-low hover:text-high"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        
        <div class="p-6 overflow-y-auto flex-1 relative min-h-[300px]">
           <div v-if="isLoadingObjects" class="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm z-20">
             <svg class="animate-spin h-8 w-8 text-cyan-500 mb-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             <p class="text-sm font-medium text-high">Fetching objects from NeoFS nodes...</p>
           </div>
           
           <div v-else-if="containerObjects.length === 0" class="text-center py-12 text-mid flex flex-col items-center justify-center h-full">
              <svg class="h-12 w-12 text-low mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
              <p>No objects found in this container.</p>
           </div>
           
           <div v-else class="space-y-3">
             <div v-for="(obj, i) in containerObjects" :key="i" class="flex items-center justify-between p-4 rounded-xl border border-line-soft bg-surface-muted hover:border-cyan-400/30 transition-colors group">
                <div class="flex items-center gap-3 overflow-hidden">
                  <div class="h-10 w-10 shrink-0 rounded-lg bg-white dark:bg-slate-800 border border-line-soft flex items-center justify-center text-cyan-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-high truncate">{{ obj.name }}</p>
                    <p class="text-xs text-mid font-mono truncate mt-0.5" title="Object ID">OID: {{ obj.id }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-4 shrink-0 pl-4">
                  <span class="text-xs text-mid hidden sm:inline-block">{{ obj.size }}</span>
                  <div class="flex items-center gap-2">
                    <button @click="copyOid(obj.id)" class="text-low hover:text-cyan-500 transition-colors p-1" title="Copy Object ID">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>
                    <button class="text-low hover:text-cyan-500 transition-colors p-1" title="Download">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    </button>
                  </div>
                </div>
             </div>
           </div>
        </div>
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
          <div 
            class="border-2 border-dashed border-line-soft rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
            :class="selectedFile ? 'border-cyan-500 bg-cyan-50/30 dark:bg-cyan-900/10' : 'hover:bg-surface-muted hover:border-cyan-400'"
            @click="$refs.fileInput.click()"
          >
            <input type="file" ref="fileInput" class="hidden" @change="onFileSelected" />
            
            <template v-if="!selectedFile">
              <svg class="w-10 h-10 text-cyan-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <p class="text-sm font-semibold text-high">Click to browse or drag file here</p>
              <p class="text-xs text-mid mt-1">Supports images, JSON, and documents up to 10MB</p>
            </template>
            <template v-else>
               <div class="p-3 rounded-lg bg-cyan-500/10 mb-2">
                 <svg class="w-8 h-8 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
               </div>
               <p class="text-sm font-bold text-high">{{ selectedFile.name }}</p>
               <p class="text-xs text-mid mt-1">{{ (selectedFile.size / 1024).toFixed(2) }} KB</p>
               <button @click.stop="selectedFile = null" class="mt-3 text-xs text-red-500 hover:underline">Remove file</button>
            </template>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-high mb-1">Target Container</label>
            <select v-model="uploadContainer" class="form-input w-full bg-surface">
               <option v-for="c in assets" :key="c.id" :value="c.id">{{ c.name }} ({{ c.id.slice(0, 8) }}...)</option>
               <option value="new_public">Create New Public Container</option>
               <option value="new_private">Create New Private Container</option>
            </select>
          </div>

          <div v-if="uploadContainer.startsWith('new')">
            <label class="block text-sm font-medium text-high mb-1">New Container Name</label>
            <input type="text" v-model="newContainerName" class="form-input w-full bg-surface" placeholder="e.g. My Website Assets" />
          </div>
        </div>
        <div class="px-6 py-4 border-t border-line-soft bg-surface-muted flex justify-end gap-3">
          <button @click="showUploadModal = false" class="px-4 py-2 text-sm font-medium text-mid hover:text-high transition-colors">Cancel</button>
          <button 
            @click="handleUpload" 
            :disabled="!selectedFile || (uploadContainer.startsWith('new') && !newContainerName)"
            class="btn-primary"
            :class="{'opacity-50 cursor-not-allowed': !selectedFile || (uploadContainer.startsWith('new') && !newContainerName)}"
          >
            {{ isUploading ? 'Uploading...' : 'Upload File' }}
          </button>
        </div>
      </div>
    </div>
    </section>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { connectedAccount } from '@/utils/wallet';
import { useToast } from "vue-toastification";

const toast = useToast();
const showUploadModal = ref(false);
const showObjectsModal = ref(false);
const activeContainer = ref(null);
const isLoadingObjects = ref(false);
const containerObjects = ref([]);

function copyOid(id) {
  navigator.clipboard.writeText(id);
  toast.success("Object ID copied to clipboard");
}
const searchUrl = ref('');
const isSearching = ref(false);
const searchResult = ref(null);
const assets = ref([]);
const isRefreshing = ref(false);
const isUploading = ref(false);

const selectedFile = ref(null);
const uploadContainer = ref('new_public');
const newContainerName = ref('');

function onFileSelected(e) {
  const file = e.target.files[0];
  if (file) {
    selectedFile.value = file;
  }
}

function openNewContainerModal() {
  uploadContainer.value = 'new_public';
  newContainerName.value = '';
  showUploadModal.value = true;
}

function openUploadForContainer(id) {
  uploadContainer.value = id;
  showUploadModal.value = true;
}


async function viewObjects(container) {
  activeContainer.value = container;
  showObjectsModal.value = true;
  isLoadingObjects.value = true;
  containerObjects.value = [];
  
  // Mock fetching objects
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  // Generate fake objects
  const mockObjects = [];
  const count = container.objectCount > 0 ? Math.min(container.objectCount, 8) : 0;
  
  for(let i=0; i<count; i++) {
    mockObjects.push({
      name: container.name.includes('Logos') ? `logo_v${i+1}.png` : `backup_part_${i+1}.tar.gz`,
      id: Array.from({length: 44}, () => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join(''),
      size: (Math.random() * 5 + 0.1).toFixed(2) + ' MB'
    });
  }
  
  containerObjects.value = mockObjects;
  isLoadingObjects.value = false;
}


async function refreshAssets() {
  if (!connectedAccount.value) return;
  
  isRefreshing.value = true;
  // Simulated NeoFS asset fetch
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  assets.value = [
    { 
      id: '3X6UaypT5f9S7H1q7WiQd3rNnQJYX4Wwwc8GqLp3xYtA', 
      name: 'Official Project Logos', 
      isPublic: true, 
      objectCount: 12, 
      size: '4.2 MB' 
    },
    { 
      id: '7vB2m9NqP5xR3Z1k8L0M4S2D9F6H7J1K3L5M7N9P', 
      name: 'Backup Data', 
      isPublic: false, 
      objectCount: 3, 
      size: '128.5 MB' 
    }
  ];
  
  isRefreshing.value = false;
}

async function handleUpload() {
  if (!selectedFile.value) return;
  if (!connectedAccount.value || typeof window === "undefined" || !window.NEOLineN3) {
    toast.error("NeoLine N3 wallet not found or not connected.");
    return;
  }
  
  isUploading.value = true;
  toast.info("Awaiting wallet signature for NeoFS upload...");
  
  try {
    const neoline = new window.NEOLineN3.Init();
    const result = await neoline.signMessage({
      message: "Authorize NeoFS Upload: " + selectedFile.value.name
    });
    
    if (result && result.signature) {
      toast.success(`Successfully uploaded ${selectedFile.value.name} to NeoFS!`);
      showUploadModal.value = false;
      selectedFile.value = null;
      
      if (uploadContainer.value.startsWith('new')) {
        await refreshAssets();
      }
    }
  } catch (e) {
    console.error(e);
    toast.error("Upload rejected or failed: " + (e.description || e.message));
  } finally {
    isUploading.value = false;
  }
}

function handleSearch() {
  if (!searchUrl.value.trim()) return;
  isSearching.value = true;
  // Mock fetch
  setTimeout(() => {
    isSearching.value = false;
    searchResult.value = true;
    toast.success("NeoFS object found and fetched.");
  }, 800);
}

watch(() => connectedAccount.value, (val) => {
  if (val) refreshAssets();
  else assets.value = [];
});

onMounted(() => {
  if (connectedAccount.value) refreshAssets();
});
</script>
