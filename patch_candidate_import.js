const fs = require('fs');
let code = fs.readFileSync('src/views/Tools/CandidateProfileTool.vue', 'utf8');
code = code.replace(
    'import { connectedAccount } from "@/utils/wallet";',
    'import { connectedAccount } from "@/utils/wallet";\nimport { walletService } from "@/services/walletService";'
);
fs.writeFileSync('src/views/Tools/CandidateProfileTool.vue', code);
