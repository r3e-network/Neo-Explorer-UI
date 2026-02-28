const fs = require('fs');

let code = fs.readFileSync('src/services/transactionService.js', 'utf8');
code = code.replace(/if \(full && full\.vmstate\) tx\.vmstate = full\.vmstate;/g, `if (full) tx.vmstate = full.vmstate || "HALT";`);
fs.writeFileSync('src/services/transactionService.js', code);

