const fs = require('fs');

let file = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

const newScript = `
  const getPrimaryNodeName = (primaryIndex) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    
    // Check if validators array exists and has elements
    if (!validators.value || validators.value.length === 0) return \`Validator #\${primaryIndex}\`;

    // The primary index corresponds to the validator's position in the active set
    const validator = validators.value[primaryIndex];
    if (!validator) return \`Validator #\${primaryIndex}\`;
    
    const meta = doraMetadata.value[validator.publickey];
    if (meta && meta.name) {
      return meta.name;
    }
    
    // Fallback if no name found
    return \`Validator #\${primaryIndex}\`;
  };`;

file = file.replace(/const getPrimaryNodeName = \(primaryIndex\) => \{[\s\S]*?return `Validator #\$\{primaryIndex\}`;\n  \};/, newScript.trim());

fs.writeFileSync('src/composables/useCommittee.js', file);
