const fs = require('fs');
let code = fs.readFileSync('tests/services/transactionService.spec.js', 'utf8');

code = code.replace(/hash: "0x1"/g, 'hash: "0xTest"'); // Change the first one, or rather, just change the one in getByAddress

code = code.replace(/const mockData = \{ result: \[\{ hash: "0xTest" \}\], totalCount: 1 \};/g, 'const mockData = { result: [{ hash: "0xAnother" }], totalCount: 1 };');
code = code.replace(/api\.safeRpc\.mockResolvedValueOnce\(\{ hash: "0xTest", vmstate: "HALT" \}\);/g, 'api.safeRpc.mockResolvedValueOnce({ hash: "0xAnother", vmstate: "HALT" });');

fs.writeFileSync('tests/services/transactionService.spec.js', code);
