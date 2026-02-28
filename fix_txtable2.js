const fs = require('fs');

let file = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');

const importReplacement = `import { extractContractInvocation } from "@/utils/scriptDisassembler";
import { NATIVE_CONTRACTS } from "@/constants";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import { supabaseService } from "@/services/supabaseService";
import { getTokenIcon } from "@/utils/getTokenIcon";
import { ref, watch, computed } from "vue";`;
file = file.replace(/import \{ extractContractInvocation \} from "@\/utils\/scriptDisassembler";[\s\S]*?import \{ KNOWN_CONTRACTS \} from "@\/constants\/knownContracts";/, importReplacement);

const newWatch = `const supabaseMeta = ref({});
watch(() => props.transferSummaryByHash, async (newSummaryMap) => {
  if (newSummaryMap) {
    const hashes = Object.values(newSummaryMap)
      .filter(s => s && typeof s === 'object' && s.contract)
      .map(s => s.contract);
    
    if (hashes.length) {
       const meta = await supabaseService.getContractMetadataBatch(hashes);
       supabaseMeta.value = meta;
    }
  }
}, { immediate: true, deep: true });

function getSummaryLogo(tx) {
  const summary = props.transferSummaryByHash[tx.hash];
  if (!summary || typeof summary === 'string' || !summary.contract) return null;
  
  if (supabaseMeta.value[summary.contract.toLowerCase()]?.logo_url) {
     return supabaseMeta.value[summary.contract.toLowerCase()].logo_url;
  }
  return getTokenIcon(summary.contract, summary.type);
}

function getSummaryName(tx) {
  const summary = props.transferSummaryByHash[tx.hash];
  if (!summary) return null;
  if (typeof summary === 'string') return summary;
  
  const text = summary.text;
  if (summary.contract && supabaseMeta.value[summary.contract.toLowerCase()]?.symbol) {
     // replace the old symbol in the text with the verified symbol?
     // Actually the text is pre-formatted as "1.00 FLM". It's easier to just use the text.
     // But wait, the previous component did this. Let's just return the text.
  }
  return text;
}`;

// inject newWatch after defineEmits
file = file.replace('defineEmits(["toggle-time"]);', `defineEmits(["toggle-time"]);\n\n${newWatch}`);

// update template
const oldTemplate = `<span class="max-w-[180px] truncate font-medium text-high" :title="getValueSummary(tx)">
                {{ getValueSummary(tx) }}
              </span>`;
              
const newTemplate = `<div class="flex items-center gap-1.5 max-w-[180px]">
                <img v-if="getSummaryLogo(tx)" :src="getSummaryLogo(tx)" class="w-4 h-4 rounded-full ring-1 ring-line-soft bg-white object-cover" />
                <span class="truncate font-medium text-high flex items-center gap-1" :title="getValueSummary(tx)">
                  {{ getValueSummary(tx) }}
                  <svg v-if="transferSummaryByHash[tx.hash]?.contract && supabaseMeta[transferSummaryByHash[tx.hash].contract.toLowerCase()]?.is_verified" class="h-3.5 w-3.5 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </span>
              </div>`;
              
file = file.replace(oldTemplate, newTemplate);

fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', file);

