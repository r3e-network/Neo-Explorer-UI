const fs = require('fs');

let file = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

// Use getters that resolve even if async loading is pending.
const newResolver = `  const resolvePrimaryIndex = (block) => {
    if (!block) return undefined;
    if (block.primary !== undefined && block.primary !== null) return Number(block.primary);
    if (block.index !== undefined && block.index !== null) {
      const vCount = validators.value && validators.value.length > 0 ? validators.value.length : 7;
      return Number(block.index) % vCount;
    }
    return undefined;
  };

  const getPrimaryNodeName = (primaryIndex) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    if (!validators.value || validators.value.length === 0) {
       // if we don't have validators loaded yet, but we are asked, wait or just return fallback
       return "Loading...";
    }

    const validator = validators.value[primaryIndex];
    if (!validator) return "Unknown Validator";
    
    const meta = doraMetadata.value[validator.publickey];
    if (meta && meta.name) {
      return meta.name;
    }
    
    return "Unknown Validator";
  };`;

file = file.replace(/const resolvePrimaryIndex = \(block\) => \{[\s\S]*?return "Unknown Validator";\n  \};/, newResolver);

// Ensure the UI re-evaluates when validators load by making the component use the exported ref, OR we just trust Vue's reactivity because validators/doraMetadata are reactive refs OUTSIDE the function! So if they change, computed props using getPrimaryNodeName will re-evaluate. 

fs.writeFileSync('src/composables/useCommittee.js', file);
