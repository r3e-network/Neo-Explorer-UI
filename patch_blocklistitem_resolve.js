const fs = require('fs');

let file = fs.readFileSync('src/components/common/BlockListItem.vue', 'utf8');

file = file.replace(
  'const { getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();', 
  'const { resolvePrimaryIndex, getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();'
);

const oldValidatorAddress = `const validatorAddress = computed(() => {
  // Always try to pull the mapped address directly for the primary consensus node first
  if (props.block.primary !== undefined) {
    const directAddr = getPrimaryNodeAddress(props.block.primary);
    if (directAddr) return scriptHashToAddress(directAddr);
  }

  // Fallback to legacy consensus pointers from indexed block
  const raw =
    props.block.nextconsensus ??`;
    
const newValidatorAddress = `const validatorAddress = computed(() => {
  // Always try to pull the mapped address directly for the primary consensus node first
  const resolvedPrimary = resolvePrimaryIndex(props.block);
  if (resolvedPrimary !== undefined) {
    const directAddr = getPrimaryNodeAddress(resolvedPrimary);
    if (directAddr) return scriptHashToAddress(directAddr);
  }

  // Fallback to legacy consensus pointers from indexed block
  const raw =
    props.block.nextconsensus ??`;
    
file = file.replace(oldValidatorAddress, newValidatorAddress);

const oldTemplate = `<p class="text-xs text-mid" v-if="block.primary !== undefined">{{ getPrimaryNodeName(block.primary) || "Unknown Validator" }}</p><p class="text-xs text-mid" v-else>Unknown Validator</p>`;
const newTemplate = `<p class="text-xs text-mid" v-if="resolvePrimaryIndex(block) !== undefined">{{ getPrimaryNodeName(resolvePrimaryIndex(block)) || "Unknown Validator" }}</p><p class="text-xs text-mid" v-else>Unknown Validator</p>`;
file = file.replace(oldTemplate, newTemplate);

fs.writeFileSync('src/components/common/BlockListItem.vue', file);
