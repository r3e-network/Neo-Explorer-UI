const fs = require('fs');

let file = fs.readFileSync('src/components/common/BlockListItem.vue', 'utf8');

const importReplacement = `import HashLink from "./HashLink.vue";
import { useCommittee } from "@/composables/useCommittee";

const { getPrimaryNodeName } = useCommittee();`;
file = file.replace('import HashLink from "./HashLink.vue";', importReplacement);


const oldTag = `<p class="text-xs text-mid">Validator <span v-if="block.primary !== undefined" class="text-xs ml-1">(Primary: {{ block.primary }})</span></p>`;
const newTag = `<p class="text-xs text-mid" v-if="block.primary !== undefined">{{ getPrimaryNodeName(block.primary) || "Validator" }}</p><p class="text-xs text-mid" v-else>Validator</p>`;
file = file.replace(oldTag, newTag);

fs.writeFileSync('src/components/common/BlockListItem.vue', file);
