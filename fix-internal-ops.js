const fs = require('fs');
let code = fs.readFileSync('src/components/trace/InternalOperations.vue', 'utf8');

const regex = /function formatAmount\(op\) \{\n  return formatTokenAmount\(op\.amount, op\.tokenDecimals \?\? 0, 8\);\n\}/;

const replacement = `function formatAmount(op) {
  let dec = op.tokenDecimals;
  if (dec === undefined || dec === null) {
     const hash = op.contract?.toLowerCase();
     if (hash && NATIVE_CONTRACTS[hash]) {
       dec = NATIVE_CONTRACTS[hash].decimals;
     } else if (hash && tokenDecimalsMap.value[hash] !== undefined) {
       dec = tokenDecimalsMap.value[hash];
     } else {
       dec = 0;
     }
  }
  return formatTokenAmount(op.amount, dec, 8);
}`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/trace/InternalOperations.vue', code);
