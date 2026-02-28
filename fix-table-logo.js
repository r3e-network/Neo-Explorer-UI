const fs = require('fs');

let tableCode = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');

tableCode = tableCode.replace(/<img v-if="getRecipient\(tx\)\.hash === '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5'" :src="'\/img\/brand\/neo\.png'" class="w-4 h-4 rounded-full flex-shrink-0" \/>/g, 
  `<img v-if="getRecipient(tx) && getRecipient(tx).hash === '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5'" :src="'/img/brand/neo.png'" class="w-4 h-4 rounded-full flex-shrink-0" />`);
  
tableCode = tableCode.replace(/<img v-else-if="getRecipient\(tx\)\.hash === '0xd2a4cff31913016155e38e474a2c06d08be276cf'" :src="'\/img\/brand\/gas\.png'" class="w-4 h-4 rounded-full flex-shrink-0" \/>/g,
  `<img v-else-if="getRecipient(tx) && getRecipient(tx).hash === '0xd2a4cff31913016155e38e474a2c06d08be276cf'" :src="'/img/brand/gas.png'" class="w-4 h-4 rounded-full flex-shrink-0" />`);

tableCode = tableCode.replace(/<img v-if="\/neo\/i\.test\(getMethodName\(tx\)\) \|\| getRecipient\(tx\)\?\.hash === '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5'" :src="'\/img\/brand\/neo\.png'" alt="NEO" class="w-3\.5 h-3\.5 rounded-full flex-shrink-0" \/>/,
  `<img v-if="/neo/i.test(getMethodName(tx)) || getRecipient(tx)?.hash === '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5'" :src="'/img/brand/neo.png'" alt="NEO" class="w-3.5 h-3.5 rounded-full flex-shrink-0" />`);
  
fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', tableCode);
