const fs = require('fs');
let code = fs.readFileSync('src/utils/explorerFormat.js', 'utf8');

code = code.replace(/  formatGas,\n  formatGas,\n/g, '  formatGas,\n');
code = code.replace(/  formatGas,\n/g, '  formatGas,\n');

fs.writeFileSync('src/utils/explorerFormat.js', code);
