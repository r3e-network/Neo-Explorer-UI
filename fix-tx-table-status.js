const fs = require('fs');

let code = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');

code = code.replace(/function getVmState\(tx\) \{\n  const value = tx\?\.vmstate \|\| tx\?\.VMState \|\| "";\n  return String\(value\)\.toUpperCase\(\);\n\}/, `function getVmState(tx) {
  const value = tx?.vmstate || tx?.VMState;
  if (!value) return "HALT";
  return String(value).toUpperCase();
}`);

fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', code);
