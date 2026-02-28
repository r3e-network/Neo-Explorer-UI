const fs = require('fs');

function patch(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  const importReplacement = `import { formatGas, getTransactionTotalFee } from "@/utils/gasFormat";
import { getTokenIcon } from "@/utils/getTokenIcon";`;
  content = content.replace('import { formatGas, getTransactionTotalFee } from "@/utils/gasFormat";', importReplacement);

  const importReplacement2 = `import { truncateHash } from "@/utils/explorerFormat";
import { getTokenIcon } from "@/utils/getTokenIcon";`;
  content = content.replace('import { truncateHash } from "@/utils/explorerFormat";', importReplacement2);

  const logoFunc = `function getTokenLogo(t) {
  const hash = (t.contract || t.contractHash || "").toLowerCase();
  const isNep11 = t._standard && t._standard.toUpperCase().includes("NEP-11");
  return getTokenIcon(hash, isNep11 ? 'NEP11' : 'NEP17');
}`;
  content = content.replace(/const localImages = import\.meta\.glob\('@\/assets\/gui\/\*\.png', \{ eager: true, import: 'default' \}\);\s*function getTokenLogo\(t\) \{[\s\S]*?return localImages\[fallbackPath\] \|\| "";\s*\}/, logoFunc);

  fs.writeFileSync(file, content);
}

patch('src/views/Transaction/components/TxOverviewTab.vue');
patch('src/views/Transaction/components/TxTransfersTab.vue');
