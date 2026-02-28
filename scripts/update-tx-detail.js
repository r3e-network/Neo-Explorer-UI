const fs = require('fs');

const path = 'src/views/Transaction/TxDetail.vue';
let content = fs.readFileSync(path, 'utf8');

const oldFetch = `tokenService.getTransfersByTxHash(hash).catch(() => ({ result: [] })),
      tokenService.getNep11TransfersByTxHash(hash).catch(() => ({ result: [] })),`;

const newFetch = `tokenService.getTransfersByTxHash(hash, 500).catch(() => ({ result: [] })),
      tokenService.getNep11TransfersByTxHash(hash, 500).catch(() => ({ result: [] })),`;

content = content.replace(oldFetch, newFetch);
fs.writeFileSync(path, content);
console.log('Increased limit');
