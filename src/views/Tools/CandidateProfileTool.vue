<template>
  <div class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
    <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Candidate Profile Manager' }]" />

    <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="page-header-icon bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </div>
        <div>
          <h1 class="page-title">Candidate Profile Manager</h1>
          <p class="page-subtitle">Update your on-chain validator identity, Dora metadata, and upload your official logo directly to NeoFS.</p>
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
          @click="saveProfile" 
          class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          Save Profile
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <!-- Validator Identity Section -->
        <div class="etherscan-card p-6">
          <h2 class="text-lg font-bold text-high mb-4">On-Chain Identity</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-high mb-1">Public Key</label>
              <input type="text" v-model="form.publicKey" class="form-input w-full bg-surface" placeholder="03..." disabled />
              <p class="text-xs text-mid mt-1">Your validator public key, derived from your connected wallet.</p>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-high mb-1">Name</label>
                <input type="text" v-model="form.name" class="form-input w-full bg-surface" placeholder="e.g. My Neo Node" :disabled="!connectedAccount" />
              </div>
              <div>
                <label class="block text-sm font-medium text-high mb-1">Location</label>
                <input type="text" v-model="form.location" class="form-input w-full bg-surface" placeholder="e.g. Zurich, Switzerland" :disabled="!connectedAccount" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-high mb-1">Website</label>
              <input type="url" v-model="form.website" class="form-input w-full bg-surface" placeholder="https://..." :disabled="!connectedAccount" />
            </div>

            <div>
              <label class="block text-sm font-medium text-high mb-1">Description</label>
              <textarea v-model="form.description" rows="3" class="form-input w-full bg-surface resize-none" placeholder="Brief description of your node operation and infrastructure..." :disabled="!connectedAccount"></textarea>
            </div>
          </div>
        </div>

        <!-- Social Links Section -->
        <div class="etherscan-card p-6">
          <h2 class="text-lg font-bold text-high mb-4">Social Links</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-high mb-1">Twitter / X</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-mid">@</span>
                <input type="text" v-model="form.twitter" class="form-input w-full bg-surface pl-8" placeholder="username" :disabled="!connectedAccount" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-high mb-1">GitHub</label>
              <input type="text" v-model="form.github" class="form-input w-full bg-surface" placeholder="https://github.com/..." :disabled="!connectedAccount" />
            </div>
            <div>
              <label class="block text-sm font-medium text-high mb-1">Discord</label>
              <input type="text" v-model="form.discord" class="form-input w-full bg-surface" placeholder="Server invite or username" :disabled="!connectedAccount" />
            </div>
            <div>
              <label class="block text-sm font-medium text-high mb-1">Telegram</label>
              <input type="text" v-model="form.telegram" class="form-input w-full bg-surface" placeholder="t.me/..." :disabled="!connectedAccount" />
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Logo Upload Section -->
        <div class="etherscan-card p-6">
          <h2 class="text-lg font-bold text-high mb-4">Node Logo</h2>
          
          <div class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-line-soft rounded-xl mb-4 relative" :class="{ 'bg-surface-elevated': !form.logoUrl }">
            <template v-if="form.logoUrl">
              <img :src="form.logoUrl" alt="Node Logo" class="w-32 h-32 object-contain rounded-lg mb-4" />
              <button @click="form.logoUrl = ''" class="absolute top-2 right-2 text-red-500 hover:text-red-600 bg-surface rounded-full p-1 border border-line-soft">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </template>
            <template v-else>
              <div class="w-16 h-16 rounded-full bg-primary-100 text-primary-500 dark:bg-primary-900/30 flex items-center justify-center mb-3">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <p class="text-sm font-medium text-high mb-1">Upload to NeoFS</p>
              <p class="text-xs text-mid text-center mb-4">PNG, JPG, or SVG. Max 2MB.</p>
              <button :disabled="!connectedAccount" class="inline-flex items-center gap-2 rounded-lg bg-surface border border-line-soft px-4 py-2 text-sm font-semibold text-high hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Select File
              </button>
            </template>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-high mb-1">NeoFS Object URL</label>
            <input type="text" v-model="form.logoUrl" class="form-input w-full bg-surface text-xs" placeholder="neofs://..." :disabled="!connectedAccount" />
          </div>
        </div>

        <!-- Preview Card -->
        <div class="etherscan-card p-6 bg-gradient-to-br from-surface to-surface-elevated">
          <h2 class="text-lg font-bold text-high mb-4">Preview</h2>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full border border-line-soft bg-surface flex items-center justify-center overflow-hidden shrink-0">
              <img v-if="form.logoUrl" :src="form.logoUrl" class="w-full h-full object-cover" />
              <svg v-else class="w-6 h-6 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            </div>
            <div class="min-w-0">
              <div class="font-bold text-high truncate">{{ form.name || 'Unnamed Validator' }}</div>
              <div class="text-xs text-mid flex items-center gap-1 mt-0.5">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span class="truncate">{{ form.location || 'Unknown Location' }}</span>
              </div>
            </div>
          </div>
          <div v-if="form.description" class="mt-4 text-sm text-mid line-clamp-3">
            {{ form.description }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";

const connectedAccount = ref("");
const form = ref({
  publicKey: "",
  name: "",
  location: "",
  website: "",
  description: "",
  twitter: "",
  github: "",
  discord: "",
  telegram: "",
  logoUrl: "",
});

const connectWallet = () => {
  // Simulate connection
  connectedAccount.value = "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc";
  form.value.publicKey = "03b209fd4f53a7170ea4444e0cb0a6bb6a53c2bd016926989cf85f9b0fba17a70c";
};

const saveProfile = () => {
  alert("Profile update transaction ready to be signed!");
};
</script>
