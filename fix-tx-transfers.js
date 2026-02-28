const fs = require('fs');
let code = fs.readFileSync('src/views/Transaction/components/TxTransfersTab.vue', 'utf8');

code = code.replace(/dec = GAS_DECIMALS;/g, `dec = 0;`);
fs.writeFileSync('src/views/Transaction/components/TxTransfersTab.vue', code);
