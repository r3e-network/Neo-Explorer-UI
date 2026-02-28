const fs = require('fs');

let code = fs.readFileSync('src/views/Transaction/components/TxTransfersTab.vue', 'utf8');

code = code.replace(/import \{ scriptHashToAddress \} from "@\/utils\/neoHelpers";/, `import { scriptHashToAddress } from "@/utils/neoHelpers";\nimport { tokenService } from "@/services/tokenService";\nimport { NATIVE_CONTRACTS } from "@/constants";\nimport { formatTokenAmount } from "@/utils/explorerFormat";\nimport { ref, watch } from "vue";`);

const watchDecimals = `const tokenDecimalsMap = ref({});

watch(
  () => props.allTransfers,
  async (xfers) => {
    if (!xfers) return;
    const fetchPromises = [];
    
    for (const t of xfers) {
      if (t.decimals !== undefined && t.decimals !== null) continue;
      
      const hash = (t.contract || t.contractHash)?.toLowerCase();
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

const localImages`;

code = code.replace(/const localImages/, watchDecimals);

code = code.replace(/function formatTransferAmount\(t\) \{\n  const raw = Number\(t\.value \|\| t\.amount \|\| 0\);\n  const decimals = Number\(t\.decimals \?\? GAS_DECIMALS\);\n  if \(decimals === 0\) return String\(raw\);\n  return \(raw \/ Math\.pow\(10, decimals\)\)\.toFixed\(Math\.min\(decimals, 8\)\);\n\}/, `function formatTransferAmount(t) {
  const raw = t.value || t.amount || 0;
  let dec = t.decimals;
  
  if (dec === undefined || dec === null) {
     const hash = (t.contract || t.contractHash)?.toLowerCase();
     if (hash && NATIVE_CONTRACTS[hash]) {
       dec = NATIVE_CONTRACTS[hash].decimals;
     } else if (hash && tokenDecimalsMap.value[hash] !== undefined) {
       dec = tokenDecimalsMap.value[hash];
     } else {
       dec = GAS_DECIMALS;
     }
  }
  
  return formatTokenAmount(raw, dec, 8);
}`);

fs.writeFileSync('src/views/Transaction/components/TxTransfersTab.vue', code);
