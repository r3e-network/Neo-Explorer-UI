const fs = require('fs');

let file = fs.readFileSync('src/components/common/BlockListItem.vue', 'utf8');

file = file.replace('const { getPrimaryNodeName } = useCommittee();', 'const { getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();');

const oldValidatorAddress = `const validatorAddress = computed(() => {
  const raw =
    props.block.nextconsensus ??
    props.block.nextConsensus ??
    props.block.speaker ??
    props.block.validator ??
    "";

  if (!raw) return "";
  if (String(raw).startsWith("N")) return String(raw);
  return scriptHashToAddress(String(raw));
});`;

const newValidatorAddress = `const validatorAddress = computed(() => {
  // Always try to pull the mapped address directly for the primary consensus node first
  if (props.block.primary !== undefined) {
    const directAddr = getPrimaryNodeAddress(props.block.primary);
    if (directAddr) return scriptHashToAddress(directAddr);
  }

  // Fallback to legacy consensus pointers from indexed block
  const raw =
    props.block.nextconsensus ??
    props.block.nextConsensus ??
    props.block.speaker ??
    props.block.validator ??
    "";

  if (!raw) return "";
  if (String(raw).startsWith("N")) return String(raw);
  return scriptHashToAddress(String(raw));
});`;

file = file.replace(oldValidatorAddress, newValidatorAddress);

fs.writeFileSync('src/components/common/BlockListItem.vue', file);
