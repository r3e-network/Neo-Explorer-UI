const fs = require('fs');

let file = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');

const oldFunc = `function getValueSummary(tx) {
  const summary = props.transferSummaryByHash[tx.hash];
  if (summary) return summary;

  const transferValue = Number(tx.value || 0);
  if (transferValue > 0) {
    return \`\${formatGas(transferValue)} GAS\`;
  }
  return "\\u2014";
}`;

const newFunc = `function getValueSummary(tx) {
  const summary = props.transferSummaryByHash[tx.hash];
  if (summary) {
    if (typeof summary === 'string') return summary;
    return summary.text || "\\u2014";
  }

  const transferValue = Number(tx.value || 0);
  if (transferValue > 0) {
    return \`\${formatGas(transferValue)} GAS\`;
  }
  return "\\u2014";
}`;

file = file.replace(oldFunc, newFunc);

fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', file);
