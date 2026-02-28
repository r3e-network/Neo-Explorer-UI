const fs = require('fs');
let code = fs.readFileSync('src/components/trace/TokenTransferFlow.vue', 'utf8');

code = code.replace(/import \{ formatTokenAmount \} from "@\/utils\/explorerFormat";/, `import { formatTokenAmount } from "@/utils/explorerFormat";\nimport { tokenService } from "@/services/tokenService";\nimport { NATIVE_CONTRACTS } from "@/constants";`);

const watchDecimals = `const tokenDecimalsMap = ref({});

watch(
  () => props.transfers,
  async (xfers) => {
    if (!xfers) return;
    const fetchPromises = [];
    
    for (const t of xfers) {
      if (t.tokenDecimals !== undefined && t.tokenDecimals !== null) continue;
      
      const hash = t.contract?.toLowerCase();
      if (!hash || NATIVE_CONTRACTS[hash]) continue;
      
      if (tokenDecimalsMap.value[hash] === undefined) {
         tokenDecimalsMap.value[hash] = 0;
         fetchPromises.push(
           tokenService.getByHash(hash).then(token => {
             if (token && typeof token.decimals !== 'undefined') {
               tokenDecimalsMap.value[hash] = Number(token.decimals);
             }
           }).catch(e => {})
         );
      }
    }
    
    await Promise.all(fetchPromises);
  },
  { immediate: true, deep: true }
);

function isNFT(transfer) {`;

code = code.replace(/function isNFT\(transfer\) \{/, watchDecimals);

code = code.replace(/function formatAmount\(transfer\) \{\n  return formatTokenAmount\(transfer\.amount, transfer\.tokenDecimals \?\? 0, 8\);\n\}/, `function formatAmount(transfer) {
  let dec = transfer.tokenDecimals;
  if (dec === undefined || dec === null) {
     const hash = transfer.contract?.toLowerCase();
     if (hash && NATIVE_CONTRACTS[hash]) {
       dec = NATIVE_CONTRACTS[hash].decimals;
     } else if (hash && tokenDecimalsMap.value[hash] !== undefined) {
       dec = tokenDecimalsMap.value[hash];
     } else {
       dec = 0;
     }
  }
  return formatTokenAmount(transfer.amount, dec, 8);
}`);

fs.writeFileSync('src/components/trace/TokenTransferFlow.vue', code);
