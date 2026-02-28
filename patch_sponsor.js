const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/SponsoredTool.vue', 'utf8');

// Replace the input box with a select dropdown
const newHtml = `
            <div v-if="operation === 'vote'" class="space-y-2 pt-2 animate-fade-in">
              <label class="block text-sm font-semibold text-high">Select Candidate</label>
              <select v-model="candidatePubKey" class="form-input w-full bg-surface text-high text-sm appearance-none cursor-pointer">
                <option value="" disabled selected>-- Select a consensus node candidate --</option>
                <option v-for="c in candidateList" :key="c.pubkey" :value="c.pubkey">
                  {{ c.name || c.pubkey.slice(0, 12) + '...' }} ({{ formatVotes(c.votes) }} votes)
                </option>
              </select>
              <div v-if="!candidateList.length" class="text-xs text-low flex items-center gap-2 mt-1">
                <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Loading candidates...
              </div>
            </div>
`;

code = code.replace(/<div v-if="operation === 'vote'" class="space-y-2 pt-2 animate-fade-in">[\s\S]*?<\/div>/, newHtml.trim());


const originalScriptImports = `import { ref, computed, watch, onMounted } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { connectedAccount } from '@/utils/wallet';
import { useToast } from "vue-toastification";
import { rpc, wallet } from "@cityofzion/neon-js";
import { getCurrentEnv } from "@/utils/env";`;

const newScriptImports = originalScriptImports + `\nimport { cachedRequest } from "@/services/cache";`;
code = code.replace(originalScriptImports, newScriptImports);


const originalDeclarations = `const toast = useToast();
const gasBalance = ref("0");
const operation = ref("claim");
const candidatePubKey = ref("");
const isProcessing = ref(false);
const txHash = ref("");`;

const newDeclarations = originalDeclarations + `\nconst candidateList = ref([]);\n\nfunction formatVotes(value) {\n  return Number(value || 0).toLocaleString();\n}`;

code = code.replace(originalDeclarations, newDeclarations);

const targetOnMounted = `onMounted(() => {
  fetchBalance();
});`;

const newOnMounted = `
async function loadCandidates() {
  try {
    const env = getCurrentEnv().toLowerCase();
    const networkMode = (env.includes("test") || env.includes("t5")) ? "testnet" : "mainnet";
    const doraUrl = \`https://dora.coz.io/api/v1/neo3/\${networkMode}/committee\`;
    
    const candidates = await cachedRequest(
      \`dora_committee_\${networkMode}\`,
      () => fetch(doraUrl).then(r => r.ok ? r.json() : []),
      300000
    );
    
    if (Array.isArray(candidates)) {
       candidateList.value = candidates.sort((a, b) => Number(b.votes || 0) - Number(a.votes || 0));
    }
  } catch (e) {
    console.warn("Failed to load candidates", e);
  }
}

onMounted(() => {
  fetchBalance();
  loadCandidates();
});`;

code = code.replace(targetOnMounted, newOnMounted.trim());

fs.writeFileSync('src/views/Tools/SponsoredTool.vue', code);
