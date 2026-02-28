const fs = require('fs');

let code = fs.readFileSync('src/views/Home/HomePage.vue', 'utf8');
code = code.replace(/import \{ useAutoRefresh \} from "@\/composables\/useAutoRefresh";/, `import { useAutoRefresh } from "@/composables/useAutoRefresh";\nimport { useTransferSummary } from "@/composables/useTransferSummary";`);

code = code.replace(/const \{ isActive, lastRefresh, forceRefresh \} = useAutoRefresh\(loadData, 15000\);/, `const { isActive, lastRefresh, forceRefresh } = useAutoRefresh(loadData, 15000);\nconst { transferSummaryByHash, enrichTransactions } = useTransferSummary();`);

code = code.replace(/latestTransactions\.value = txsRes\.result \|\| \[\];/, `latestTransactions.value = txsRes.result || [];\n        enrichTransactions(latestTransactions.value);`);

fs.writeFileSync('src/views/Home/HomePage.vue', code);

let listCode = fs.readFileSync('src/views/Home/components/LatestTransactions.vue', 'utf8');
listCode = listCode.replace(/defineProps\(\{/, `defineProps({\n  transferSummaryByHash: { type: Object, default: () => ({}) },`);
listCode = listCode.replace(/:tx="tx"/, `:tx="tx" :transfer-summary="transferSummaryByHash[tx.hash]"`);
fs.writeFileSync('src/views/Home/components/LatestTransactions.vue', listCode);
