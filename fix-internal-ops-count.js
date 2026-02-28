const fs = require('fs');
let code = fs.readFileSync('src/views/Transaction/TxDetail.vue', 'utf8');

const regex = /return enrichedTrace\.value\.executions\.reduce\(\(sum, e\) => sum \+ \(e\.operations\?\.length \?\? 0\), 0\);/;

const replacement = `const opsCount = enrichedTrace.value.executions.reduce((sum, e) => sum + (e.operations?.length ?? 0), 0);
  const rawCallsCount = enrichedTrace.value.executions.reduce((sum, e) => sum + (e.contractCalls?.length ?? 0), 0);
  return Math.max(opsCount, rawCallsCount);`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/views/Transaction/TxDetail.vue', code);
