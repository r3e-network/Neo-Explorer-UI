const fs = require('fs');

function addImport(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import { getTokenIcon }')) {
     content = content.replace('import { computed', 'import { getTokenIcon } from "@/utils/getTokenIcon";\nimport { computed');
     fs.writeFileSync(file, content);
  }
}

function addImport2(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import { getTokenIcon }')) {
     content = content.replace('import { ref, computed', 'import { getTokenIcon } from "@/utils/getTokenIcon";\nimport { ref, computed');
     fs.writeFileSync(file, content);
  }
}

addImport('src/views/Transaction/components/TxOverviewTab.vue');
addImport2('src/views/Transaction/components/TxTransfersTab.vue');
