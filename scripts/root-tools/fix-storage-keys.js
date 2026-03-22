const fs = require('fs');
const path = require('path');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/adminsMap\.Put\(accountId,/g, 'adminsMap.Put(GetStorageKey(accountId),');
  content = content.replace(/tMap\.Put\(accountId,/g, 'tMap.Put(GetStorageKey(accountId),');
  content = content.replace(/mMap\.Put\(accountId,/g, 'mMap.Put(GetStorageKey(accountId),');
  content = content.replace(/map\.Put\(accountId,/g, 'map.Put(GetStorageKey(accountId),');
  content = content.replace(/adminsMap\.Get\(accountId\)/g, 'adminsMap.Get(GetStorageKey(accountId))');
  content = content.replace(/tMap\.Get\(accountId\)/g, 'tMap.Get(GetStorageKey(accountId))');
  content = content.replace(/mMap\.Get\(accountId\)/g, 'mMap.Get(GetStorageKey(accountId))');
  content = content.replace(/map\.Get\(accountId\)/g, 'map.Get(GetStorageKey(accountId))');
  content = content.replace(/map\.Delete\(accountId\)/g, 'map.Delete(GetStorageKey(accountId))');
  
  content = content.replace(/Helper\.Concat\(BlacklistPrefix, accountId\)/g, 'Helper.Concat(BlacklistPrefix, GetStorageKey(accountId))');
  content = content.replace(/Helper\.Concat\(WhitelistPrefix, accountId\)/g, 'Helper.Concat(WhitelistPrefix, GetStorageKey(accountId))');
  content = content.replace(/Helper\.Concat\(MaxTransferPrefix, accountId\)/g, 'Helper.Concat(MaxTransferPrefix, GetStorageKey(accountId))');
  content = content.replace(/Helper\.Concat\(NoncePrefix, accountId\)/g, 'Helper.Concat(NoncePrefix, GetStorageKey(accountId))');
  content = content.replace(/Helper\.Concat\(VerifyContextPrefix, accountId\)/g, 'Helper.Concat(VerifyContextPrefix, GetStorageKey(accountId))');
  content = content.replace(/Helper\.Concat\(MetaTxContextPrefix, accountId\)/g, 'Helper.Concat(MetaTxContextPrefix, GetStorageKey(accountId))');
  
  fs.writeFileSync(file, content);
}

const repoRoot = path.resolve(__dirname, '..', '..');
const contractsDir = path.join(repoRoot, 'contracts', 'AbstractAccount');
const files = fs.readdirSync(contractsDir).filter((file) => file.endsWith('.cs')).map((file) => path.join(contractsDir, file));
for (const file of files) fix(file);
console.log('Fixed storage keys');
