const fs = require('fs');
let file = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

// The issue might be returning scriptHash instead of address when doing the wallet conversion. Let's return address so it maps perfectly.
const fixAddr = `  const getPrimaryNodeAddress = (primaryIndex) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    if (!validators.value || validators.value.length === 0) return null;
    
    const validator = validators.value[primaryIndex];
    if (!validator) return null;
    
    const meta = doraMetadata.value[validator.publickey];
    if (meta && meta.scripthash) {
      return meta.scripthash;
    }
    
    if (validator.publickey) {
       try {
           const account = new wallet.Account(validator.publickey);
           return account.address;
       } catch(e) {
           return null;
       }
    }
    
    return null;
  };`;
  
file = file.replace(/const getPrimaryNodeAddress = \(primaryIndex\) => \{[\s\S]*?return null;\n  \};/, fixAddr);
fs.writeFileSync('src/composables/useCommittee.js', file);
