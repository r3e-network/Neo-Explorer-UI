const fs = require('fs');

let file = fs.readFileSync('src/views/Token/Tokens.vue', 'utf8');

const importReplacement = `import { tokenService } from "@/services";
import { supabaseService } from "@/services/supabaseService";`;

file = file.replace('import { tokenService } from "@/services";', importReplacement);

const newMeta = `const { debouncedFn: debouncedSearch, cancel: cancelDebounce } = useDebounceFn(() => {
  router.push(\`/tokens/\${activeTab.value}/1\`).catch(() => {});
}, SEARCH_DEBOUNCE_MS);

const supabaseMeta = ref({});

watch(() => tokens.value, async (newTokens) => {
  if (newTokens && newTokens.length) {
    const hashes = newTokens.map(t => t.hash).filter(Boolean);
    const meta = await supabaseService.getContractMetadataBatch(hashes);
    supabaseMeta.value = meta;
  } else {
    supabaseMeta.value = {};
  }
}, { immediate: true });`;

file = file.replace(/const \{ debouncedFn: debouncedSearch, cancel: cancelDebounce \} = useDebounceFn\(\(\) => \{\n  router\.push\(`\/tokens\/\$\{activeTab\.value\}\/1`\)\.catch\(\(\) => \{\}\);\n\}, SEARCH_DEBOUNCE_MS\);/, newMeta);

// Now update template for NEP-17
const oldNep17Img = `<img v-if="hasTokenIcon(token.hash)" :src="getTokenIcon(token.hash, 'NEP17')" class="h-8 w-8 rounded-full object-cover" alt="" />
                    <div v-else`;
const newNep17Img = `<img v-if="supabaseMeta[token.hash]?.logo_url" :src="supabaseMeta[token.hash].logo_url" class="h-8 w-8 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="" />
                    <img v-else-if="hasTokenIcon(token.hash)" :src="getTokenIcon(token.hash, 'NEP17')" class="h-8 w-8 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="" />
                    <div v-else`;
file = file.replace(oldNep17Img, newNep17Img);

const oldNep17Name = `<span class="text-high font-medium hover:text-primary-500 transition-colors">
                      {{ token.tokenname || "Unknown Token" }}
                    </span>`;
const newNep17Name = `<span class="text-high font-medium hover:text-primary-500 transition-colors flex items-center gap-1">
                      {{ supabaseMeta[token.hash]?.name || token.tokenname || "Unknown Token" }}
                      <svg v-if="supabaseMeta[token.hash]?.is_verified" class="h-3.5 w-3.5 text-success" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    </span>`;
file = file.replace(oldNep17Name, newNep17Name);

// Update template for NEP-11
const oldNep11Img = `<img v-if="hasTokenIcon(token.hash)" :src="getTokenIcon(token.hash, 'NEP11')" class="h-8 w-8 rounded-full object-cover" alt="" />
                    <div v-else`;
const newNep11Img = `<img v-if="supabaseMeta[token.hash]?.logo_url" :src="supabaseMeta[token.hash].logo_url" class="h-8 w-8 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="" />
                    <img v-else-if="hasTokenIcon(token.hash)" :src="getTokenIcon(token.hash, 'NEP11')" class="h-8 w-8 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="" />
                    <div v-else`;
file = file.replace(oldNep11Img, newNep11Img);

const oldNep11Name = `<span class="text-high font-medium hover:text-primary-500 transition-colors">
                      {{ token.tokenname || "Unknown Collection" }}
                    </span>`;
const newNep11Name = `<span class="text-high font-medium hover:text-primary-500 transition-colors flex items-center gap-1">
                      {{ supabaseMeta[token.hash]?.name || token.tokenname || "Unknown Collection" }}
                      <svg v-if="supabaseMeta[token.hash]?.is_verified" class="h-3.5 w-3.5 text-success" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    </span>`;
file = file.replace(oldNep11Name, newNep11Name);

fs.writeFileSync('src/views/Token/Tokens.vue', file);

