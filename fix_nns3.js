const fs = require('fs');

let content = fs.readFileSync('src/views/NNS/NNS.vue', 'utf8');

const oldCheck = `    const props = await safeRpc("GetNep11PropertiesByContractHashTokenId", {
      ContractHash: NNS_CONTRACT_HASH,
      TokenIds: [tokenBase64]
    }, null);`;

const newCheck = `    const props = await safeRpc("GetNep11PropertiesByContractHashTokenId", {
      ContractHash: NNS_CONTRACT_HASH,
      TokenIds: [tokenBase64]
    }, null);
    
    // Fallback if the token ID is actually required as hex or another format
    // some backends might not wrap TokenIds in base64 properly.
    const fallbackProps = props && props.result ? props : await safeRpc("GetNep11PropertiesByContractHashTokenId", {
      ContractHash: NNS_CONTRACT_HASH,
      TokenId: btoa(query)
    }, null);`;

content = content.replace(oldCheck, newCheck);

const oldCheck2 = `      if (props && Array.isArray(props.result) && props.result.length > 0) {
        propData = props.result[0];
      } else if (Array.isArray(props) && props.length > 0) {
        propData = props[0];
      } else if (props && !Array.isArray(props) && !props.result) {
        propData = props;
      }`;

const newCheck2 = `      const activeProps = fallbackProps || props;
      if (activeProps && Array.isArray(activeProps.result) && activeProps.result.length > 0) {
        propData = activeProps.result[0];
      } else if (Array.isArray(activeProps) && activeProps.length > 0) {
        propData = activeProps[0];
      } else if (activeProps && !Array.isArray(activeProps) && !activeProps.result) {
        propData = activeProps;
      }`;
      
content = content.replace(oldCheck2, newCheck2);

// Fix owner
const oldOwnerCheck = `    if (!props) {`;
const newOwnerCheck = `    if (!fallbackProps && !props) {`;
content = content.replace(oldOwnerCheck, newOwnerCheck);

// Let's get the owner from token owner API as well
const getOwner = `    let ownerAddressFromNNS = null;
    try {
        const ownerRes = await safeRpc("GetNep11TransferByContractHashTokenId", {
            ContractHash: NNS_CONTRACT_HASH,
            TokenId: btoa(query)
        }, null);
        if (ownerRes && Array.isArray(ownerRes) && ownerRes.length > 0) {
             ownerAddressFromNNS = ownerRes[0].to;
        } else if (ownerRes && ownerRes.result && Array.isArray(ownerRes.result) && ownerRes.result.length > 0) {
             ownerAddressFromNNS = ownerRes.result[0].to;
        }
    } catch(e) {}
`;

content = content.replace('let ownerAddr = resolvedAddress;', `${getOwner}
      let ownerAddr = resolvedAddress || ownerAddressFromNNS;`);


fs.writeFileSync('src/views/NNS/NNS.vue', content);
