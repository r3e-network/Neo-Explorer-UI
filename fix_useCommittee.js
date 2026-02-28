const fs = require('fs');

let file = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

const oldMethod = `  const getPrimaryNodeAddress = (primaryIndex) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    
    if (!validators.value || validators.value.length === 0) return null;

    const validator = validators.value[primaryIndex];
    if (!validator) return null;
    
    const meta = doraMetadata.value[validator.publickey];
    if (meta && meta.scripthash) {
      return meta.scripthash;
    }
    
    return null;
  };`;
  
const newMethod = `  const getPrimaryNodeAddress = (primaryIndex) => {
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
           const { wallet } = require('@cityofzion/neon-js');
           const account = new wallet.Account(validator.publickey);
           return account.address;
       } catch(e) {
           return null;
       }
    }
    
    return null;
  };`;

file = file.replace(oldMethod, newMethod);
fs.writeFileSync('src/composables/useCommittee.js', file);
