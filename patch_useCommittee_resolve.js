const fs = require('fs');

let file = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

const newMethods = `
  const resolvePrimaryIndex = (block) => {
    if (!block) return undefined;
    if (block.primary !== undefined && block.primary !== null) return Number(block.primary);
    if (block.index !== undefined && block.index !== null) {
      const vCount = validators.value && validators.value.length > 0 ? validators.value.length : 7;
      return Number(block.index) % vCount;
    }
    return undefined;
  };

  const getPrimaryNodeName = (primaryIndex) => {`;
  
file = file.replace('  const getPrimaryNodeName = (primaryIndex) => {', newMethods);

file = file.replace('return { loadCommittee, getPrimaryNodeName, getPrimaryNodeAddress };', 'return { loadCommittee, resolvePrimaryIndex, getPrimaryNodeName, getPrimaryNodeAddress };');

fs.writeFileSync('src/composables/useCommittee.js', file);
