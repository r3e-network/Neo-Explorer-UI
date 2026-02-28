const fs = require('fs');
let code = fs.readFileSync('src/components/common/HashLink.vue', 'utf8');

if (!code.includes('import contractService')) {
  code = code.replace(/import nnsService from "@\/services\/nnsService";/, `import nnsService from "@/services/nnsService";\nimport { contractService } from "@/services";`);
}

if (!code.includes('fetchedContractName')) {
  code = code.replace(/const nnsName = ref\(""\);/, `const nnsName = ref("");\nconst fetchedContractName = ref("");`);
}

code = code.replace(/const displayHash = computed\(\(\) => \{[\s\S]*?\}\);/, `const displayHash = computed(() => {
  if (!props.hash) return "";
  if (nnsName.value) return nnsName.value;
  if (fetchedContractName.value) return fetchedContractName.value;
  if (!shouldTruncate.value) return props.hash;
  return truncateHashValue(props.hash, 8, 6);
});`);

code = code.replace(/watch\([\s\S]*?\{ immediate: true \}\n\);/, `watch(
  () => [props.hash, props.type, props.resolveNns],
  async ([newHash, type, resolveNns]) => {
    nnsName.value = "";
    fetchedContractName.value = "";
    
    if (resolveNns && type === "address" && newHash && !knownName.value) {
      const res = await nnsService.resolveAddressToNNS(newHash);
      if (res && res.nns) {
        nnsName.value = res.nns;
      }
    }

    if ((type === "contract" || type === "token") && newHash && !knownName.value) {
      const hash = newHash.startsWith('0x') ? newHash.toLowerCase() : \`0x\${newHash.toLowerCase()}\`;
      try {
        const contract = await contractService.getByHash(hash);
        if (contract && contract.name) {
          fetchedContractName.value = contract.name;
        }
      } catch (e) {}
    }
  },
  { immediate: true }
);`);

fs.writeFileSync('src/components/common/HashLink.vue', code);
