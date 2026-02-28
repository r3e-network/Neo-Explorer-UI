const fs = require('fs');
let file = fs.readFileSync('src/views/Block/Blocks.vue', 'utf8');

file = file.replace(
  'const { getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();',
  'const { resolvePrimaryIndex, getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();'
);

const oldFunc = `function getActiveValidatorAddress(block) {
  if (block.primary !== undefined) {
    const directAddr = getPrimaryNodeAddress(block.primary);
    if (directAddr) return scriptHashToAddress(directAddr);
  }
  return block.nextconsensus ? scriptHashToAddress(block.nextconsensus) : null;
}`;

const newFunc = `function getActiveValidatorAddress(block) {
  const resolvedPrimary = resolvePrimaryIndex(block);
  if (resolvedPrimary !== undefined) {
    const directAddr = getPrimaryNodeAddress(resolvedPrimary);
    if (directAddr) return scriptHashToAddress(directAddr);
  }
  return block.nextconsensus ? scriptHashToAddress(block.nextconsensus) : null;
}`;

file = file.replace(oldFunc, newFunc);

const oldTemplate = `<span v-if="block.primary !== undefined" class="text-sm font-semibold text-high">
                       {{ getPrimaryNodeName(block.primary) || "Unknown Validator" }}
                    </span>`;
                    
const newTemplate = `<span v-if="resolvePrimaryIndex(block) !== undefined" class="text-sm font-semibold text-high">
                       {{ getPrimaryNodeName(resolvePrimaryIndex(block)) || "Unknown Validator" }}
                    </span>`;

file = file.replace(oldTemplate, newTemplate);

fs.writeFileSync('src/views/Block/Blocks.vue', file);
