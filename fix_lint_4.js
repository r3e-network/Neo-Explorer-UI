const fs = require('fs');

let file = fs.readFileSync('src/views/Token/Tokens.vue', 'utf8');

const newMeta = `const { debouncedFn: handleSearchDebounced, cancel: cancelSearch } = useDebounceFn(() => {
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

file = file.replace(/const \{ debouncedFn: handleSearchDebounced, cancel: cancelSearch \} = useDebounceFn\(\(\) => \{\n  router\.push\(`\/tokens\/\$\{activeTab\.value\}\/1`\)\.catch\(\(\) => \{\}\);\n\}, SEARCH_DEBOUNCE_MS\);/, newMeta);

fs.writeFileSync('src/views/Token/Tokens.vue', file);
