const fs = require('fs');

let code = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');
code = code.replace(/<span class="max-w-\[180px\] truncate font-medium text-high" :title="getValueSummary\(tx\)">/, `<div class="flex items-center gap-1.5 justify-end">
                <img v-if="getValueSummary(tx).includes('NEO')" src="/img/brand/neo.png" alt="NEO" class="w-3.5 h-3.5 rounded-full" />
                <img v-if="getValueSummary(tx).includes('GAS')" src="/img/brand/gas.png" alt="GAS" class="w-3.5 h-3.5 rounded-full" />
                <span class="max-w-[180px] truncate font-medium text-high" :title="getValueSummary(tx)">`);
code = code.replace(/{{ getValueSummary\(tx\) }}\n              <\/span>/, `{{ getValueSummary(tx) }}\n                </span>\n              </div>`);
fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', code);

let listCode = fs.readFileSync('src/views/Home/components/LatestTransactions.vue', 'utf8');
// wait, we need to modify TxListItem.vue not LatestTransactions
let listItem = fs.readFileSync('src/components/common/TxListItem.vue', 'utf8');
// We need to inject the transferSummary feature to TxListItem.
