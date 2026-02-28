const fs = require('fs');

let file = fs.readFileSync('src/views/Block/Blocks.vue', 'utf8');

const importTarget = `const { getPrimaryNodeName } = useCommittee();`;
const importReplace = `const { getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();`;
file = file.replace(importTarget, importReplace);

const methodsTarget = `const { t } = useI18n();`;
const methodsReplace = `const { t } = useI18n();

function getActiveValidatorAddress(block) {
  if (block.primary !== undefined) {
    const directAddr = getPrimaryNodeAddress(block.primary);
    if (directAddr) return scriptHashToAddress(directAddr);
  }
  return block.nextconsensus ? scriptHashToAddress(block.nextconsensus) : null;
}`;
file = file.replace(methodsTarget, methodsReplace);


const templateTarget = `<HashLink v-if="block.nextconsensus" :hash="scriptHashToAddress(block.nextconsensus)" type="address" />`;
const templateReplace = `<HashLink v-if="getActiveValidatorAddress(block)" :hash="getActiveValidatorAddress(block)" type="address" />`;
file = file.replace(templateTarget, templateReplace);

fs.writeFileSync('src/views/Block/Blocks.vue', file);
