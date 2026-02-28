const fs = require('fs');

let hashLink = fs.readFileSync('src/components/common/HashLink.vue', 'utf8');
hashLink = hashLink.replace(/catch \(e\) \{\}/g, 'catch (e) { /* ignore */ }');
fs.writeFileSync('src/components/common/HashLink.vue', hashLink);

let txService = fs.readFileSync('src/services/transactionService.js', 'utf8');
txService = txService.replace(/catch \(e\) \{\}/g, 'catch (e) { /* ignore */ }');
fs.writeFileSync('src/services/transactionService.js', txService);
