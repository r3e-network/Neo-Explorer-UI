const fs = require('fs');

let io = fs.readFileSync('src/components/trace/InternalOperations.vue', 'utf8');

const regex2 = /\/\/ Find the raw transfer amount from the decoded state params[\s\S]*?return formatTokenAmount\(amount, dec, 8\);\n\}/;

const replace2 = `let amount = op.amount;
  if (!amount && op.decodedParams && op.decodedParams.length >= 3) {
      amount = op.decodedParams[2].decoded?.rawValue || op.decodedParams[2].decoded?.decodedValue || op.decodedParams[2].decoded?.displayValue || "0";
  }
  
  return formatTokenAmount(amount, dec, 8);
}`;

io = io.replace(regex2, replace2);

fs.writeFileSync('src/components/trace/InternalOperations.vue', io);

