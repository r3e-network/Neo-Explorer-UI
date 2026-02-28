const fs = require('fs');
let code = fs.readFileSync('src/services/transactionService.js', 'utf8');

// The factory might be generating `_getList` when it should be renaming `getList` to `_getList`
code = code.replace(/    getList: \{/, `    _getList: {`);
fs.writeFileSync('src/services/transactionService.js', code);
