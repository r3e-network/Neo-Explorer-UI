const fs = require('fs');

let file = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

// Also expose `validators` to easily check if address belongs.
const exportTarget = `  return { loadCommittee, resolvePrimaryIndex, getPrimaryNodeName, getPrimaryNodeAddress };`;
const exportReplacement = `  const isCouncilMember = (address) => {
    if (!address || !validators.value) return false;
    for (const v of validators.value) {
       try {
           const acc = new wallet.Account(v.publickey);
           if (acc.address === address) return true;
       } catch (e) {}
    }
    return false;
  };

  return { loadCommittee, resolvePrimaryIndex, getPrimaryNodeName, getPrimaryNodeAddress, isCouncilMember };`;

file = file.replace(exportTarget, exportReplacement);

fs.writeFileSync('src/composables/useCommittee.js', file);
