const fs = require('fs');
let code = fs.readFileSync('src/components/common/HashLink.vue', 'utf8');
code = code.replace(/    nnsName\.value = "";\n    if \(resolveNns && type === "address" && newHash && !knownName\.value\) \{/, `    nnsName.value = "";
    fetchedContractName.value = "";
    if (resolveNns && type === "address" && newHash && !knownName.value) {`);
    
code = code.replace(/    if \(resolveNns && type === "address" && newHash && !knownName\.value\) \{\n      const res = await nnsService\.resolveAddressToNNS\(newHash\);\n      if \(res && res\.nns\) \{\n        nnsName\.value = res\.nns;\n      \}\n    \}\n  \},\n  \{ immediate: true \}/, `    if (resolveNns && type === "address" && newHash && !knownName.value) {
      const res = await nnsService.resolveAddressToNNS(newHash);
      if (res && res.nns) {
        nnsName.value = res.nns;
      }
    }

    if ((type === "contract" || type === "token") && newHash && !knownName.value) {
      const hash = newHash.startsWith('0x') ? newHash.toLowerCase() : \`0x\${newHash.toLowerCase()}\`;
      contractService.getByHash(hash).then(contract => {
        if (contract && contract.name) {
          fetchedContractName.value = contract.name;
        }
      }).catch(e => {});
    }
  },
  { immediate: true }`);
fs.writeFileSync('src/components/common/HashLink.vue', code);
