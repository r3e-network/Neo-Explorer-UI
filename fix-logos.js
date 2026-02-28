const fs = require('fs');

let txList = fs.readFileSync('src/components/common/TxListItem.vue', 'utf8');
txList = txList.replace(/v-if="transferSummary\.includes\('NEO'\)"/g, `v-if="/neo/i.test(transferSummary)"`);
txList = txList.replace(/v-if="transferSummary\.includes\('GAS'\)"/g, `v-if="/gas/i.test(transferSummary)"`);
fs.writeFileSync('src/components/common/TxListItem.vue', txList);

let txTable = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');
txTable = txTable.replace(/v-if="getValueSummary\(tx\)\.includes\('NEO'\)"/g, `v-if="/neo/i.test(getValueSummary(tx))"`);
txTable = txTable.replace(/v-if="getValueSummary\(tx\)\.includes\('GAS'\)"/g, `v-if="/gas/i.test(getValueSummary(tx))"`);
fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', txTable);

