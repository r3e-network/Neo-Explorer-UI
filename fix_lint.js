const fs = require('fs');

let file = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');

file = file.replace('import { ref, watch, computed } from "vue";', 'import { ref, watch } from "vue";');

file = file.replace(/function getSummaryName\(tx\) \{[\s\S]*?return text;\n\}/, '');

fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', file);
