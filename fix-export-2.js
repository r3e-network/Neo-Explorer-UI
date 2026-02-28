const fs = require('fs');
let code = fs.readFileSync('src/utils/explorerFormat.js', 'utf8');

code = code.replace(/  formatGas,\n  getTransactionTotalFee,\n  formatGas,\n/g, '  formatGas,\n  getTransactionTotalFee,\n');

fs.writeFileSync('src/utils/explorerFormat.js', code);
