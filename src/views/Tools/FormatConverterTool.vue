<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
    <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Neo Converter' }]" />

    <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="page-header-icon bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
        </div>
        <div>
          <h1 class="page-title">Format Converter</h1>
          <p class="page-subtitle">Convert between Base64, Hex, and Strings for Neo N3 parameters.</p>
        </div>
      </div>
    </div>

    <div class="etherscan-card p-6 md:p-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        
        <!-- Input -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label class="text-sm font-bold text-high tracking-tight">Input Type</label>
            <select v-model="inputType" @change="convertData" class="form-input bg-surface text-sm py-1.5 px-3 rounded-lg border-line-soft hover:border-primary-400 transition-colors shadow-sm cursor-pointer outline-none">
              <option value="string">String / UTF-8</option>
              <option value="hex">Hex String</option>
              <option value="base64">Base64</option>
            </select>
          </div>
          <div class="relative group">
             <textarea v-model="inputValue" @input="convertData" class="form-input w-full h-40 font-mono text-sm resize-none rounded-2xl shadow-inner focus:ring-2 focus:ring-pink-500/20" placeholder="Paste value here..."></textarea>
             <button v-if="inputValue" @click="inputValue = ''; convertData()" class="absolute top-3 right-3 p-1.5 rounded-lg bg-surface hover:bg-red-50 dark:hover:bg-red-900/30 text-mid hover:text-red-500 transition-colors shadow-sm opacity-0 group-hover:opacity-100" title="Clear input">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
          </div>
        </div>
        
        <!-- Output -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label class="text-sm font-bold text-high tracking-tight">Convert To</label>
            <select v-model="outputType" @change="convertData" class="form-input bg-surface text-sm py-1.5 px-3 rounded-lg border-line-soft hover:border-primary-400 transition-colors shadow-sm cursor-pointer outline-none">
              <option value="base64">Base64 (RPC Argument Format)</option>
              <option value="hex">Hex String</option>
              <option value="string">String / UTF-8</option>
            </select>
          </div>
          <div class="relative group">
            <textarea readonly :value="outputValue" class="form-input w-full h-40 font-mono text-sm bg-surface-elevated text-pink-600 dark:text-pink-400 resize-none cursor-text rounded-2xl shadow-inner outline-none"></textarea>
            
            <button v-if="outputValue" @click="copyToClipboard" class="absolute top-3 right-3 p-2 rounded-xl bg-white dark:bg-slate-800 border border-line-soft text-low hover:text-pink-600 dark:hover:text-pink-400 hover:border-pink-200 dark:hover:border-pink-800 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-105 active:scale-95" title="Copy to clipboard">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </button>
            
            <!-- Empty state overlay -->
            <div v-if="!outputValue && !error" class="absolute inset-0 flex flex-col items-center justify-center text-mid bg-surface-muted/30 rounded-2xl pointer-events-none">
               <svg class="w-8 h-8 opacity-20 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
               <span class="text-xs font-semibold uppercase tracking-wider opacity-60">Awaiting Input</span>
            </div>
          </div>
          
          <transition name="fade">
            <div v-if="error" class="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/10 dark:text-red-400 p-3 rounded-xl border border-red-200 dark:border-red-900/30">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               {{ error }}
            </div>
          </transition>
        </div>

      </div>
    </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { useToast } from "vue-toastification";
import { u } from "@cityofzion/neon-js";

const toast = useToast();

const inputType = ref('string');
const outputType = ref('base64');
const inputValue = ref('');
const outputValue = ref('');
const error = ref('');

function stringToHex(str) {
  return u.str2hexstring(str);
}

function hexToString(hex) {
  return u.hexstring2str(hex.replace(/^0x/, ''));
}

function hexToBase64(hexstring) {
  return u.hex2base64(hexstring.replace(/^0x/, ''));
}

function base64ToHex(str) {
  return u.base642hex(str);
}

function convertData() {
  error.value = '';
  if (!inputValue.value.trim()) {
    outputValue.value = '';
    return;
  }
  
  try {
    let hexFormat = '';
    if (inputType.value === 'string') hexFormat = stringToHex(inputValue.value.trim());
    else if (inputType.value === 'hex') hexFormat = inputValue.value.trim().replace(/^0x/, '');
    else if (inputType.value === 'base64') hexFormat = base64ToHex(inputValue.value.trim());
    
    if (outputType.value === 'hex') outputValue.value = hexFormat;
    else if (outputType.value === 'base64') outputValue.value = hexToBase64(hexFormat);
    else if (outputType.value === 'string') outputValue.value = hexToString(hexFormat);
  } catch (e) {
    error.value = 'Invalid input format';
    outputValue.value = '';
  }
}

function copyToClipboard() {
  if (!outputValue.value) return;
  navigator.clipboard.writeText(outputValue.value).then(() => {
    toast.success("Copied to clipboard!");
  }).catch(() => {
    toast.error("Failed to copy");
  });
}
</script>