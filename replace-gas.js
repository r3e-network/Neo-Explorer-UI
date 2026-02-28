const fs = require('fs');

const filesToUpdate = [
  'src/components/trace/ExecutionTraceView.vue',
  'src/components/trace/StateChangeSummary.vue',
  'src/components/trace/GasBreakdown.vue',
  'src/components/trace/ContractCallMap.vue',
  'src/views/Transaction/components/TxLogsTab.vue',
  'src/utils/explorerFormat.js'
];

filesToUpdate.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/formatGasDecimal/g, 'formatGas');
  fs.writeFileSync(file, content);
});

let gasFormat = fs.readFileSync('src/utils/gasFormat.js', 'utf8');
gasFormat = gasFormat.replace(/export function formatGasDecimal[\s\S]*?\}\n/, '');
fs.writeFileSync('src/utils/gasFormat.js', gasFormat);

let testFile = fs.readFileSync('tests/utils/gasFormat.spec.js', 'utf8');
testFile = testFile.replace(/describe\("formatGasDecimal"[\s\S]*?\}\);\n/, '');
fs.writeFileSync('tests/utils/gasFormat.spec.js', testFile);

