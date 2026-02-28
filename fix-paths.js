const fs = require('fs');

let table = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');
table = table.replace(/\/img\/brand\/neo.png/g, '/img/brand/neo.png'); // Wait, vite interprets static assets starting with / as public directory if it's dynamic, but statically it might try to resolve it.
table = table.replace(/<img v-if="getValueSummary\(tx\)\.includes\('NEO'\)" src="\/img\/brand\/neo.png"/g, `<img v-if="getValueSummary(tx).includes('NEO')" src="/img/brand/neo.png"`);

// Let's use computed / bound attrs for standard static path to bypass Vite import resolver for unresolvable static assets from code.
table = table.replace(/src="\/img\/brand\/neo\.png"/g, `:src="'/img/brand/neo.png'"`);
table = table.replace(/src="\/img\/brand\/gas\.png"/g, `:src="'/img/brand/gas.png'"`);
fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', table);

let list = fs.readFileSync('src/components/common/TxListItem.vue', 'utf8');
list = list.replace(/src="\/img\/brand\/neo\.png"/g, `:src="'/img/brand/neo.png'"`);
list = list.replace(/src="\/img\/brand\/gas\.png"/g, `:src="'/img/brand/gas.png'"`);
fs.writeFileSync('src/components/common/TxListItem.vue', list);
