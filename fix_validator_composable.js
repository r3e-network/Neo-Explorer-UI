const fs = require('fs');
let file = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

const newMethod = `
  const getPrimaryNodeAddress = (primaryIndex) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    
    if (!validators.value || validators.value.length === 0) return null;

    const validator = validators.value[primaryIndex];
    if (!validator) return null;
    
    const meta = doraMetadata.value[validator.publickey];
    if (meta && meta.scripthash) {
      return meta.scripthash;
    }
    
    return null;
  };

  return { loadCommittee, getPrimaryNodeName, getPrimaryNodeAddress };
`;

file = file.replace(/return \{ loadCommittee, getPrimaryNodeName \};\n\}/, newMethod.trim() + "\n}");
fs.writeFileSync('src/composables/useCommittee.js', file);
