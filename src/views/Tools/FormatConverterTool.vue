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
          <p class="page-subtitle">Convert between Base64, Hex, and Strings for Neo N3 parameters</p>
        </div>
      </div>
    </div>

    <div class="etherscan-card p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <!-- Input -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label class="text-sm font-semibold text-high">Input Type</label>
            <select v-model="inputType" @change="convertData" class="form-input bg-surface text-sm py-1.5 px-3">
              <option value="string">String / UTF-8</option>
              <option value="hex">Hex String</option>
              <option value="base64">Base64</option>
            </select>
          </div>
          <textarea v-model="inputValue" @input="convertData" class="form-input w-full h-32 font-mono text-sm resize-none" placeholder="Paste value here..."></textarea>
        </div>
        
        <!-- Output -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label class="text-sm font-semibold text-high">Convert To</label>
            <select v-model="outputType" @change="convertData" class="form-input bg-surface text-sm py-1.5 px-3">
              <option value="base64">Base64 (RPC Argument Format)</option>
              <option value="hex">Hex String</option>
              <option value="string">String / UTF-8</option>
            </select>
          </div>
          <div class="relative group">
            <textarea readonly :value="outputValue" class="form-input w-full h-32 font-mono text-sm bg-surface-elevated text-primary-600 resize-none cursor-text"></textarea>
            <button v-if="outputValue" @click="copyToClipboard" class="absolute top-2 right-2 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-line-soft text-low hover:text-primary-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </button>
          </div>
          <p v-if="error" class="text-xs font-medium text-red-500">{{ error }}</p>
        </div>

      </div>
    </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";

const inputType = ref('string');
const outputType = ref('base64');
const inputValue = ref('');
const outputValue = ref('');
const error = ref('');

function stringToHex(str) {
  let hex = '';
  for(let i=0; i<str.length; i++) {
    hex += '' + str.charCodeAt(i).toString(16);
  }
  return hex;
}

function hexToString(hex) {
  let str = '';
  hex = hex.replace(/^0x/, '');
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

function hexToBase64(hexstring) {
  hexstring = hexstring.replace(/^0x/, '');
  return btoa(hexstring.match(/\w{2}/g).map(function(a) {
      return String.fromCharCode(parseInt(a, 16));
  }).join(""));
}

function base64ToHex(str) {
  const raw = atob(str);
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16);
    result += (hex.length === 2 ? hex : '0' + hex);
  }
  return result.toUpperCase();
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
  navigator.clipboard.writeText(outputValue.value);
}
</script>