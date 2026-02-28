const fs = require('fs');
let code = fs.readFileSync('tests/services/transactionService.spec.js', 'utf8');

code = code.replace(/vi\.clearAllMocks\(\);/, 'vi.clearAllMocks(); vi.resetAllMocks();');

fs.writeFileSync('tests/services/transactionService.spec.js', code);
