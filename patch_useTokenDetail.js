const fs = require('fs');

let file = fs.readFileSync('src/composables/useTokenDetail.js', 'utf8');

const importReplacement = `import { invokeContractFunction } from "@/utils/contractInvocation";
import { supabaseService } from "@/services/supabaseService";`;

file = file.replace('import { invokeContractFunction } from "@/utils/contractInvocation";', importReplacement);

const newRefState = `const tokenId = ref("");
  const manifest = ref({});
  const manifestError = ref(null);
  const decimal = ref("");
  const activeName = ref(defaultTab);
  const updateCounter = ref(0);
  const copied = ref(false);
  const tokenMetadata = ref(null);`;
  
file = file.replace(/const tokenId = ref\(""\);\s*const manifest = ref\(\{\}\);\s*const manifestError = ref\(null\);\s*const decimal = ref\(""\);\s*const activeName = ref\(defaultTab\);\s*const updateCounter = ref\(0\);\s*const copied = ref\(false\);/, newRefState);


const newFetch = `  function loadAllData() {
    activeName.value = defaultTab;
    manifest.value = null;
    manifestError.value = null;
    updateCounter.value = 0;
    executeTokenFetch(tokenId.value);
    executeContractFetch(tokenId.value);
    
    // Supabase optional metadata fetch
    supabaseService.getContractMetadata(tokenId.value).then(meta => {
      if (meta) tokenMetadata.value = meta;
    }).catch(()=>{});
  }`;
  
file = file.replace(/function loadAllData\(\) \{[\s\S]*?executeContractFetch\(tokenId\.value\);\s*\}/, newFetch);


const newReturn = `// methods
    decode,
    onUpdateParam,
    onQuery,
    getContract,
    copyHash,
    reloadToken,
    loadAllData,
    tokenMetadata,
  };
}`;

file = file.replace(/\/\/\s*methods[\s\S]*?loadAllData,\s*\};\s*\}/, newReturn);

fs.writeFileSync('src/composables/useTokenDetail.js', file);

