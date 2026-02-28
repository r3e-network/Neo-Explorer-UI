const fs = require('fs');
const path = 'src/views/Account/AddressDetail.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'import { accountService, transactionService, contractService, candidateService } from "@/services";',
  'import { accountService, transactionService, contractService, candidateService, tokenService } from "@/services";\nimport { NATIVE_CONTRACTS } from "@/constants";\nimport { KNOWN_CONTRACTS } from "@/constants/knownContracts";'
);

fs.writeFileSync(path, content);
console.log('Fixed imports');
