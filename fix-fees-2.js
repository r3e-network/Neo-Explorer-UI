const fs = require('fs');

let tableCode = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');

tableCode = tableCode.replace(/function formatTxFeeBreakdown\(tx\) \{\n  const net = Number\(tx\.netfee \?\? tx\.net_fee \?\? 0\);\n  const sys = Number\(tx\.sysfee \?\? tx\.sys_fee \?\? 0\);\n  if \(net === 0 && sys === 0\) return "N: 0 \/ S: 0";\n  return `N: \$\{formatGas\(net\)\} \/ S: \$\{formatGas\(sys\)\}`;/g, 
  `function formatTxFeeBreakdown(tx) {
  const net = Number(tx.netfee ?? tx.net_fee ?? 0);
  const sys = Number(tx.sysfee ?? tx.sys_fee ?? 0);
  if (net === 0 && sys === 0) return "N: 0 / S: 0";
  return \`N: \${formatGas(net, 5)} / S: \${formatGas(sys, 5)}\`;`);

fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', tableCode);
