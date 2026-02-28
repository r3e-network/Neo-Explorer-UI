const fs = require('fs');

let file = fs.readFileSync('src/views/Contract/ContractDetail.vue', 'utf8');

file = file.replace('import { contractService } from "@/services";', 'import { contractService } from "@/services";\nimport { supabaseService } from "@/services/supabaseService";');

file = file.replace('const isLoading = ref(true);', 'const isLoading = ref(true);\nconst contractMetadata = ref(null);');

const oldFetch = `    const data = await contractService.getByHash(route.params.hash);
    
    if (fetchId !== currentFetchId) return;

    if (data) {`;

const newFetch = `    const data = await contractService.getByHash(route.params.hash);
    
    if (fetchId !== currentFetchId) return;

    try {
        const meta = await supabaseService.getContractMetadata(route.params.hash);
        if (meta && fetchId === currentFetchId) {
            contractMetadata.value = meta;
        }
    } catch(e) {}

    if (data) {`;

file = file.replace(oldFetch, newFetch);

const oldReset = `  contract.value = {};
  manifest.value = {};`;
const newReset = `  contract.value = {};
  manifest.value = {};
  contractMetadata.value = null;`;
file = file.replace(oldReset, newReset);

file = file.replace(':contract="contract"', ':contract="contract" :metadata="contractMetadata"');

fs.writeFileSync('src/views/Contract/ContractDetail.vue', file);
