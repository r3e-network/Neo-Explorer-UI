const fs = require('fs');

function patch(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('supabaseService')) {
     content = content.replace('import { NATIVE_CONTRACTS } from "@/constants";', 'import { NATIVE_CONTRACTS } from "@/constants";\nimport { supabaseService } from "@/services/supabaseService";');
     content = content.replace('import { GAS_DECIMALS } from "@/constants";', 'import { GAS_DECIMALS } from "@/constants";\nimport { supabaseService } from "@/services/supabaseService";');
  }

  const addWatch = `const supabaseMeta = ref({});
watch(() => Array.isArray(props.transfers) ? props.transfers : [], async (newTransfers) => {
  if (newTransfers && newTransfers.length) {
    const hashes = newTransfers.map(t => t.contract || t.contractHash).filter(Boolean);
    const meta = await supabaseService.getContractMetadataBatch(hashes);
    supabaseMeta.value = meta;
  } else {
    supabaseMeta.value = {};
  }
}, { immediate: true });`;

  // We need to inject this right after defineProps. Let's find defineProps
  content = content.replace(/const props = defineProps\(\{[\s\S]*?\}\);/, (match) => {
    return `${match}\n\n${addWatch}`;
  });

  // Now replace the image template logic
  // <img :src="getTokenLogo(t)"
  const oldImg = `<img :src="getTokenLogo(t)"`;
  const newImg = `<img v-if="supabaseMeta[(t.contract || t.contractHash)?.toLowerCase()]?.logo_url" :src="supabaseMeta[(t.contract || t.contractHash)?.toLowerCase()].logo_url" class="h-6 w-6 rounded-full ring-1 ring-line-soft bg-white object-cover" alt="" />
                <img v-else :src="getTokenLogo(t)"`;
  content = content.replace(oldImg, newImg);
  
  // replace symbol
  // {{ t.symbol || t.tokenname || "Unknown" }}
  const oldSymbol = `{{ t.symbol || t.tokenname || "Unknown" }}`;
  const newSymbol = `{{ supabaseMeta[(t.contract || t.contractHash)?.toLowerCase()]?.symbol || t.symbol || t.tokenname || "Unknown" }}`;
  content = content.replace(oldSymbol, newSymbol);
  
  // What about "flex items-center gap-2 max-w-[150px]" and injecting verified mark?
  const oldTextSpan = `<span class="truncate font-medium text-high">`;
  const newTextSpan = `<span class="truncate font-medium text-high flex items-center gap-1">`;
  content = content.replace(oldTextSpan, newTextSpan);
  
  // add the SVG right after the symbol
  const oldSpanClose = `{{ supabaseMeta[(t.contract || t.contractHash)?.toLowerCase()]?.symbol || t.symbol || t.tokenname || "Unknown" }}\n                </span>`;
  const newSpanClose = `{{ supabaseMeta[(t.contract || t.contractHash)?.toLowerCase()]?.symbol || t.symbol || t.tokenname || "Unknown" }}
                  <svg v-if="supabaseMeta[(t.contract || t.contractHash)?.toLowerCase()]?.is_verified" class="h-3.5 w-3.5 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </span>`;
  content = content.replace(oldSpanClose, newSpanClose);

  fs.writeFileSync(file, content);
}

patch('src/views/Transaction/components/TxTransfersTab.vue');
patch('src/views/Transaction/components/TxOverviewTab.vue');
