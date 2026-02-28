const fs = require('fs');

let file = fs.readFileSync('src/views/Contract/components/ContractHeader.vue', 'utf8');

const oldTemplate = `<div class="flex items-start gap-3">
      <div class="page-header-icon bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
        <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="page-title">
            {{ contract.name || "Unknown Contract" }}
          </h1>
          <span
            v-if="isVerified"
            class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-success dark:border-emerald-800 dark:bg-emerald-900/30"
          >`;

const newTemplate = `<div class="flex items-start gap-3">
      <img v-if="metadata?.logo_url" :src="metadata.logo_url" class="h-10 w-10 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="Contract Logo" />
      <div v-else class="page-header-icon bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
        <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="page-title">
            {{ metadata?.name || contract.name || "Unknown Contract" }}
          </h1>
          <span
            v-if="isVerified || metadata?.is_verified"
            class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-success dark:border-emerald-800 dark:bg-emerald-900/30"
          >`;

file = file.replace(oldTemplate, newTemplate);

const oldProps = `defineProps({
  contract: { type: Object, required: true },
  isVerified: { type: Boolean, default: false },
  supportedStandards: { type: Array, default: () => [] },
});`;

const newProps = `defineProps({
  contract: { type: Object, required: true },
  isVerified: { type: Boolean, default: false },
  supportedStandards: { type: Array, default: () => [] },
  metadata: { type: Object, default: null },
});`;

file = file.replace(oldProps, newProps);

fs.writeFileSync('src/views/Contract/components/ContractHeader.vue', file);
