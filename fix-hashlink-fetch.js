const fs = require('fs');
let code = fs.readFileSync('src/components/common/HashLink.vue', 'utf8');

const regex = /try \{\s*const contract = await contractService\.getByHash\(hash\);\s*if \(contract && contract\.name\) \{\s*fetchedContractName\.value = contract\.name;\s*\}\s*\} catch \(e\) \{ \/\* ignore \*\/ \}/;

const replacement = `try {
        let contract = await contractService.getByHash(hash);
        if (!contract || !contract.name) {
          // Try reversing the hash (endianness fallback)
          const cleanHash = hash.replace(/^0x/i, '');
          const reversed = '0x' + (cleanHash.match(/.{2}/g) || []).reverse().join('');
          contract = await contractService.getByHash(reversed);
        }
        if (contract && contract.name) {
          fetchedContractName.value = contract.name;
        }
      } catch (e) { /* ignore */ }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/common/HashLink.vue', code);
