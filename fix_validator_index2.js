const fs = require('fs');

let file = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

file = file.replace(/const getPrimaryNodeName = \(primaryIndex\) => \{[\s\S]*?\};/, `const getPrimaryNodeName = (primaryIndex) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    
    if (!validators.value || validators.value.length === 0) return \`Validator #\${primaryIndex}\`;

    const validator = validators.value[primaryIndex];
    if (!validator) return \`Validator #\${primaryIndex}\`;
    
    const meta = doraMetadata.value[validator.publickey];
    if (meta && meta.name) {
      return meta.name;
    }
    
    return \`Validator #\${primaryIndex}\`;
  };`);

fs.writeFileSync('src/composables/useCommittee.js', file);
