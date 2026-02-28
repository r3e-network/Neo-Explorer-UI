const fs = require('fs');

let gov = fs.readFileSync('src/views/Tools/GovernanceTool.vue', 'utf8');
gov = gov.replace(`import { ref, onMounted, computed } from 'vue';`, `import { ref, onMounted, computed, watch } from 'vue';`);
fs.writeFileSync('src/views/Tools/GovernanceTool.vue', gov);


let multi = fs.readFileSync('src/views/Tools/MultiSigTool.vue', 'utf8');
multi = multi.replace(`import { ref, onMounted, computed } from 'vue';`, `import { ref, onMounted } from 'vue';`);
multi = multi.replace(`import { connectedAccount, connectWallet, disconnectWallet } from '@/utils/wallet';`, `import { connectedAccount, connectWallet } from '@/utils/wallet';`);
fs.writeFileSync('src/views/Tools/MultiSigTool.vue', multi);

