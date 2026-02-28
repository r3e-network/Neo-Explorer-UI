const fs = require('fs');

let content = fs.readFileSync('src/views/NNS/NNS.vue', 'utf8');

const oldSearch = `    const tokenIdHex = Array.from(query).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    
    const props = await safeRpc("GetNep11PropertiesByContractHashTokenId", {
      ContractHash: NNS_CONTRACT_HASH,
      TokenId: tokenIdHex
    }, null);`;

const newSearch = `    const tokenBase64 = btoa(query);
    
    const props = await safeRpc("GetNep11PropertiesByContractHashTokenId", {
      ContractHash: NNS_CONTRACT_HASH,
      TokenIds: [tokenBase64]
    }, null);`;

content = content.replace(oldSearch, newSearch);

fs.writeFileSync('src/views/NNS/NNS.vue', content);
