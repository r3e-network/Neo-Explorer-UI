const fs = require('fs');
let code = fs.readFileSync('src/components/trace/InternalOperations.vue', 'utf8');

const regex = /function formatAmount\(op\) \{\n  let dec = op\.tokenDecimals;\n  if \(dec === undefined \|\| dec === null\) \{\n     const hash = op\.contract\?\.toLowerCase\(\);\n     if \(hash && NATIVE_CONTRACTS\[hash\]\) \{\n       dec = NATIVE_CONTRACTS\[hash\]\.decimals;\n     \} else if \(hash && tokenDecimalsMap\.value\[hash\] !== undefined\) \{\n       dec = tokenDecimalsMap\.value\[hash\];\n     \} else \{\n       dec = 0;\n     \}\n  \}\n  return formatTokenAmount\(op\.amount, dec, 8\);\n\}/;

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
  
  // Find the raw transfer amount from the decoded state params
  // The first 2 are from, to, the 3rd is the amount
  let amount = op.amount;
  if (!amount && op.decodedParams && op.decodedParams.length >= 3) {
      amount = op.decodedParams[2].decoded?.rawValue || op.decodedParams[2].decoded?.decodedValue || 0;
  }
  
  return formatTokenAmount(amount, dec, 8);
}`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/trace/InternalOperations.vue', code);
