const fs = require('fs');
let file = fs.readFileSync('src/views/Token/TokenDetail.vue', 'utf8');

const oldDestruct = `const {
  tokenId,
  isLoading,
  error,
  tokenInfo: token,
  decimal: tokenDecimals,
  activeName,
  tabs,
  reloadToken,
} = useTokenDetail({
  defaultTab: "transfers",
  tabs: [
    { key: "transfers", label: "Transfers" },
    { key: "holders", label: "Holders" },
  ],
});`;

const newDestruct = `const {
  tokenId,
  isLoading,
  error,
  tokenInfo: token,
  decimal: tokenDecimals,
  activeName,
  tabs,
  reloadToken,
  tokenMetadata,
} = useTokenDetail({
  defaultTab: "transfers",
  tabs: [
    { key: "transfers", label: "Transfers" },
    { key: "holders", label: "Holders" },
  ],
});`;

file = file.replace(oldDestruct, newDestruct);

// Fix template
const oldHeader = `<div class="flex items-start gap-3">
          <img v-if="hasTokenIcon(token.hash)" :src="getTokenIcon(token.hash, token.type)" class="h-10 w-10 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="Token Logo" />
          <div v-else class="page-header-icon bg-primary-100 text-primary-500 dark:bg-primary-900/40 dark:text-primary-400">
            <span class="text-lg font-bold">{{ token.symbol?.charAt(0) || "?" }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <h1 class="page-title">{{ token.tokenname || "Token" }} ({{ token.symbol || "-" }})</h1>
            <p class="page-subtitle">
              {{ token.type ? \`NEP-\${token.type} Token\` : "Token" }}
            </p>
          </div>
        </div>`;

const newHeader = `<div class="flex items-start gap-3">
          <img v-if="tokenMetadata?.logo_url" :src="tokenMetadata.logo_url" class="h-10 w-10 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="Token Logo" />
          <img v-else-if="hasTokenIcon(token.hash)" :src="getTokenIcon(token.hash, token.type)" class="h-10 w-10 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="Token Logo" />
          <div v-else class="page-header-icon bg-primary-100 text-primary-500 dark:bg-primary-900/40 dark:text-primary-400">
            <span class="text-lg font-bold">{{ tokenMetadata?.symbol || token.symbol?.charAt(0) || "?" }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="page-title">{{ tokenMetadata?.name || token.tokenname || "Token" }} ({{ tokenMetadata?.symbol || token.symbol || "-" }})</h1>
              <span v-if="tokenMetadata?.is_verified" class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-success dark:border-emerald-800 dark:bg-emerald-900/30">
                <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                Verified
              </span>
            </div>
            <p class="page-subtitle mt-1">
              {{ token.type ? \`NEP-\${token.type} Token\` : "Token" }}
              <a v-if="tokenMetadata?.website" :href="tokenMetadata.website" target="_blank" class="ml-2 text-primary-500 hover:underline">Official Website ↗</a>
            </p>
          </div>
        </div>`;

file = file.replace(oldHeader, newHeader);

fs.writeFileSync('src/views/Token/TokenDetail.vue', file);
