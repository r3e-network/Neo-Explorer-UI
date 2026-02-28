const fs = require('fs');
let code = fs.readFileSync('src/views/Home/HomePage.vue', 'utf8');

code = code.replace(/<LatestTransactions\n          :transactions="latestTransactions"\n          :loading="txsLoading"\n          :error="txsError"\n          @retry="forceRefresh"\n        \/>/g, `<LatestTransactions
          :transactions="latestTransactions"
          :loading="txsLoading"
          :error="txsError"
          :transfer-summary-by-hash="transferSummaryByHash"
          @retry="forceRefresh"
        />`);

fs.writeFileSync('src/views/Home/HomePage.vue', code);
