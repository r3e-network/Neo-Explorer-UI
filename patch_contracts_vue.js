const fs = require('fs');
let file = fs.readFileSync('src/views/Contract/Contracts.vue', 'utf8');

const importTarget = `import { useRoute, useRouter } from "vue-router";`;
const importReplace = `import { useRoute, useRouter } from "vue-router";
import { supabaseService } from "@/services/supabaseService";`;
file = file.replace(importTarget, importReplace);

const refsTarget = `const searchQuery = ref("");`;
const refsReplace = `const searchQuery = ref("");
const supabaseMeta = ref({});

watch(() => contracts.value, async (newContracts) => {
  if (newContracts && newContracts.length) {
    const hashes = newContracts.map(c => c.hash).filter(Boolean);
    const meta = await supabaseService.getContractMetadataBatch(hashes);
    supabaseMeta.value = meta;
  } else {
    supabaseMeta.value = {};
  }
}, { immediate: true });`;
file = file.replace(refsTarget, refsReplace);


const templateTarget = `<router-link
                    :to="\`/contract-info/\${contract.hash}\`"
                    class="font-medium text-high hover:text-primary-500 transition-colors"
                  >
                    {{ contract.name || "Unknown Contract" }}
                  </router-link>`;

const templateReplace = `<router-link
                    :to="\`/contract-info/\${contract.hash}\`"
                    class="font-medium text-high hover:text-primary-500 transition-colors flex items-center gap-1.5"
                  >
                    {{ supabaseMeta[contract.hash]?.name || contract.name || "Unknown Contract" }}
                    <svg v-if="supabaseMeta[contract.hash]?.is_verified" class="h-3.5 w-3.5 text-success" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  </router-link>`;
file = file.replace(templateTarget, templateReplace);

fs.writeFileSync('src/views/Contract/Contracts.vue', file);
