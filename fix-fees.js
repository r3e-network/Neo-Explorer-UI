const fs = require('fs');

let txList = fs.readFileSync('src/components/common/TxListItem.vue', 'utf8');

txList = txList.replace(/const total = Number\(net\) \+ Number\(sys\);\n  if \(\!Number\.isFinite\(total\) \|\| total === 0\) return "0";\n  \/\/ formatGas already divides by 10\^8\. BUT if netfee is already a decimal \(e\.g\. from neotube\),\n  \/\/ we don't want to divide it again\. Wait, neotube API returns 'net_fee' as integer string like '37664'\.\n  \/\/ So formatGas\(total, 4\) is correct\. But maybe total is NOT > 0\? No, 253589 > 0\.\n  \/\/ If total is 253589, formatGas\(253589, 4\) -> \(253589 \/ 1e8\)\.toFixed\(4\) -> "0\.0025"\.\n  \/\/ Wait\! \(0\.00253589\)\.toFixed\(4\) is "0\.0025"\. This is not 0\.0000\!\n  \/\/ If the user says it shows 0\.0000 GAS, maybe they mean it's literally showing 0\.0000 because of precision\?\n  \/\/ No, 253589 \/ 10\^8 is 0\.0025\.\n  return formatGas\(total, 5\);/g, `const total = Number(net) + Number(sys);\n  if (!Number.isFinite(total) || total === 0) return "0";\n  return formatGas(total, 5);`);

fs.writeFileSync('src/components/common/TxListItem.vue', txList);

let txTable = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');

txTable = txTable.replace(/function formatTxGas\(tx\) \{\n  const net = Number\(tx\.netfee \?\? tx\.net_fee \?\? 0\);\n  const sys = Number\(tx\.sysfee \?\? tx\.sys_fee \?\? 0\);\n  const totalFee = net \+ sys;\n  if \(totalFee === 0\) return "0";\n  return formatGas\(totalFee\);\n\}/g, `function formatTxGas(tx) {\n  const net = Number(tx.netfee ?? tx.net_fee ?? 0);\n  const sys = Number(tx.sysfee ?? tx.sys_fee ?? 0);\n  const totalFee = net + sys;\n  if (totalFee === 0) return "0";\n  return formatGas(totalFee, 5);\n}`);

fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', txTable);
