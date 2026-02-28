const fs = require('fs');

let file = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

const fixRpcCall = `      const response = await rpc("getnextblockvalidators");
      if (response && Array.isArray(response)) {
        validators.value = response;
      } else if (response && response.result && Array.isArray(response.result)) {
        validators.value = response.result;
      }`;
      
file = file.replace(/const response = await rpc\("getnextblockvalidators"\);\n\s*if \(response && Array\.isArray\(response\)\) \{\n\s*validators\.value = response;\n\s*\}/, fixRpcCall);


// Ensure Address conversion is completely foolproof
const fixAddress = `  const getPrimaryNodeAddress = (primaryIndex) => {
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
           return account.scriptHash; // Returning scriptHash so it maps identically to everything else (HashLink auto-resolves scriptHash to N-address if needed, or if we need N-address directly we can use account.address)
       } catch(e) {
           return null;
       }
    }
    
    return null;
  };`;

file = file.replace(/const getPrimaryNodeAddress = \(primaryIndex\) => \{[\s\S]*?return null;\n  \};/, fixAddress);


fs.writeFileSync('src/composables/useCommittee.js', file);
