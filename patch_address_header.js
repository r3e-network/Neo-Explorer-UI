const fs = require('fs');
let file = fs.readFileSync('src/views/Account/components/AddressHeader.vue', 'utf8');

const scriptImport = `import { pickBestCandidateVotes } from "@/utils/addressDetail";
import { supabaseService } from "@/services/supabaseService";`;

file = file.replace('import { pickBestCandidateVotes } from "@/utils/addressDetail";', scriptImport);

const propsDef = `const props = defineProps({`;
const propInject = `const publicTag = ref(null);
watch(() => props.address, async (newAddr) => {
  if (newAddr) {
    const tagData = await supabaseService.getAddressTag(newAddr);
    if (tagData) {
      publicTag.value = tagData.label;
    } else {
      publicTag.value = null;
    }
  }
}, { immediate: true });

const props = defineProps({`;

file = file.replace(propsDef, propInject);


const htmlTag = `<div class="flex items-center gap-2 flex-wrap">`;
const htmlTagInject = `<div class="flex items-center gap-2 flex-wrap">
          <span v-if="publicTag" class="rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
            {{ publicTag }}
          </span>`;

file = file.replace(htmlTag, htmlTagInject);

fs.writeFileSync('src/views/Account/components/AddressHeader.vue', file);
