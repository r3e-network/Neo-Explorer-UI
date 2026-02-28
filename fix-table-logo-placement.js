const fs = require('fs');

// The user states: "in transaction list, the logo should be shown aside the contract name, not the value/gas"
// In `TransactionTable.vue`, the logo is in the "Value / Gas" column. 
// "Value / Gas" shows things like "500 NEO" or "3.5 GAS".
// "Method" column shows "Transfer" or "GasToken: transfer". 
// Let's modify `TransactionTable.vue` to move the logo to the "To" column or "Method" column?
// "logo should be shown aside the contract name" -> The contract name is either in the "To" column (e.g. NeoToken) or the "Method" column (e.g. NeoToken: transfer).

let tableCode = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');

tableCode = tableCode.replace(/<div class="flex items-center gap-1.5 justify-end">\s*<img v-if="\/neo\/i.test\(getValueSummary\(tx\)\)" :src="'\/img\/brand\/neo.png'" alt="NEO" class="w-3.5 h-3.5 rounded-full" \/>\s*<img v-if="\/gas\/i.test\(getValueSummary\(tx\)\)" :src="'\/img\/brand\/gas.png'" alt="GAS" class="w-3.5 h-3.5 rounded-full" \/>\s*<span class="max-w-\[180px\] truncate font-medium text-high" :title="getValueSummary\(tx\)">\s*\{\{ getValueSummary\(tx\) \}\}\s*<\/span>\s*<\/div>/g, `<span class="max-w-[180px] truncate font-medium text-high" :title="getValueSummary(tx)">
                {{ getValueSummary(tx) }}
              </span>`);

tableCode = tableCode.replace(/<span\s*class="badge-soft inline-flex max-w-\[120px\] truncate"\s*:title="getMethodName\(tx\)"\s*>\s*\{\{ getMethodName\(tx\) \}\}\s*<\/span>/g, `<span
              class="badge-soft inline-flex items-center gap-1.5 max-w-[150px] truncate"
              :title="getMethodName(tx)"
            >
              <img v-if="/neo/i.test(getMethodName(tx)) || /neo/i.test(getRecipient(tx)?.hash || '')" :src="'/img/brand/neo.png'" alt="NEO" class="w-3.5 h-3.5 rounded-full flex-shrink-0" />
              <img v-if="/gas/i.test(getMethodName(tx)) || /gas/i.test(getRecipient(tx)?.hash || '')" :src="'/img/brand/gas.png'" alt="GAS" class="w-3.5 h-3.5 rounded-full flex-shrink-0" />
              <span class="truncate">{{ getMethodName(tx) }}</span>
            </span>`);

fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', tableCode);

// Same for TxListItem
let listCode = fs.readFileSync('src/components/common/TxListItem.vue', 'utf8');

listCode = listCode.replace(/<div v-else-if="transferSummary && transferSummary !== '\u2014'" class="flex items-center gap-1.5 min-w-0">\s*<span class="text-sm text-high font-medium truncate" :title="transferSummary">\s*\{\{ transferSummary \}\}\s*<\/span>\s*<img v-if="\/neo\/i.test\(transferSummary\)" :src="'\/img\/brand\/neo.png'" alt="NEO" class="w-3.5 h-3.5 rounded-full flex-shrink-0" \/>\s*<img v-if="\/gas\/i.test\(transferSummary\)" :src="'\/img\/brand\/gas.png'" alt="GAS" class="w-3.5 h-3.5 rounded-full flex-shrink-0" \/>\s*<\/div>/g, `<div v-else-if="transferSummary && transferSummary !== '\u2014'" class="min-w-0">
            <span class="text-sm text-high font-medium truncate" :title="transferSummary">
              {{ transferSummary }}
            </span>
          </div>`);

listCode = listCode.replace(/<span v-else-if="methodName" class="text-sm text-high font-medium">\{\{ methodName \}\}<\/span>/g, `<div v-else-if="methodName" class="flex items-center gap-1.5 min-w-0">
            <img v-if="/neo/i.test(methodName) || /neo/i.test(recipient?.hash || '')" :src="'/img/brand/neo.png'" alt="NEO" class="w-4 h-4 rounded-full flex-shrink-0" />
            <img v-if="/gas/i.test(methodName) || /gas/i.test(recipient?.hash || '')" :src="'/img/brand/gas.png'" alt="GAS" class="w-4 h-4 rounded-full flex-shrink-0" />
            <span class="text-sm text-high font-medium truncate">{{ methodName }}</span>
          </div>`);
          
fs.writeFileSync('src/components/common/TxListItem.vue', listCode);
