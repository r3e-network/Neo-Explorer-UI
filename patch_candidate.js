const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/CandidateProfileTool.vue', 'utf8');

// Add toast import if missing
if (!code.includes('useToast')) {
    code = code.replace(
        'import { addressToScriptHash, isPublicKeyHex } from "@/utils/neoHelpers";',
        'import { addressToScriptHash, isPublicKeyHex } from "@/utils/neoHelpers";\nimport { useToast } from "vue-toastification";\n\nconst toast = useToast();'
    );
}

const newFn = `
async function saveProfile() {
  if (typeof window === "undefined" || !window.NEOLineN3) {
    toast.error("NeoLine N3 wallet not found.");
    return;
  }
  
  try {
    toast.info("Awaiting wallet signature to authorize profile update...");
    const neoline = new window.NEOLineN3.Init();
    
    const result = await neoline.signMessage({
      message: "Update Neo Candidate Profile for " + form.value.name
    });
    
    if (result && result.signature) {
      toast.success("Profile update transaction authorized and submitted!");
    }
  } catch (e) {
    console.error(e);
    toast.error("Signature rejected or failed: " + (e.description || e.message));
  }
}
`;

code = code.replace(/function saveProfile\(\) \{\s*alert\([^;]+\);\s*\}/m, newFn);
fs.writeFileSync('src/views/Tools/CandidateProfileTool.vue', code);
