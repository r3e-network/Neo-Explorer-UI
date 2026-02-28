const fs = require('fs');

let file = fs.readFileSync('src/components/common/TxListItem.vue', 'utf8');

// Update imports
const addImport = `import { extractContractInvocation } from "@/utils/scriptDisassembler";
import { NATIVE_CONTRACTS } from "@/constants";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import { getTokenIcon } from "@/utils/getTokenIcon";
import { supabaseService } from "@/services/supabaseService";
import { ref, watch } from "vue";`;
file = file.replace(/import \{ extractContractInvocation \} from "@\/utils\/scriptDisassembler";[\s\S]*?import \{ KNOWN_CONTRACTS \} from "@\/constants\/knownContracts";/, addImport);

// Update props
const updateProps = `const props = defineProps({
  tx: { type: Object, default: () => ({}) },
  isComplex: { type: Boolean, default: false },
  transferSummary: { type: [String, Object], default: null },
});

const supabaseMeta = ref({});
watch(() => props.transferSummary, async (newSummary) => {
  if (newSummary && typeof newSummary === 'object' && newSummary.contract) {
    const meta = await supabaseService.getContractMetadata(newSummary.contract);
    if (meta) {
      supabaseMeta.value = meta;
    }
  }
}, { immediate: true });

const transferText = computed(() => {
  if (!props.transferSummary) return "";
  if (typeof props.transferSummary === 'string') return props.transferSummary;
  return props.transferSummary.text || "—";
});

const transferLogo = computed(() => {
  if (!props.transferSummary || typeof props.transferSummary === 'string' || !props.transferSummary.contract) return null;
  if (supabaseMeta.value?.logo_url) return supabaseMeta.value.logo_url;
  return getTokenIcon(props.transferSummary.contract, props.transferSummary.type);
});
`;

file = file.replace(/const props = defineProps\(\{[\s\S]*?\}\);/, updateProps);


// Fix template
const oldTemplate = `<div v-else-if="transferSummary && transferSummary !== '—'" class="min-w-0">
            <span class="text-sm text-high font-medium truncate" :title="transferSummary">
              {{ transferSummary }}
            </span>
          </div>`;
          
const newTemplate = `<div v-else-if="transferText && transferText !== '—'" class="flex items-center gap-1.5 min-w-0">
            <img v-if="transferLogo" :src="transferLogo" class="w-4 h-4 rounded-full flex-shrink-0 object-cover bg-white ring-1 ring-line-soft" />
            <span class="text-sm text-high font-medium truncate flex items-center gap-1" :title="transferText">
              {{ transferText }}
              <svg v-if="supabaseMeta?.is_verified" class="h-3 w-3 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            </span>
          </div>`;
          
file = file.replace(oldTemplate, newTemplate);

fs.writeFileSync('src/components/common/TxListItem.vue', file);
