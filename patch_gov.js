const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/GovernanceTool.vue', 'utf8');

const newFn = `
async function handleCreateProposal() {
  if (typeof window === "undefined" || !window.NEOLineN3) {
    toast.error("NeoLine N3 wallet not found.");
    return;
  }
  
  try {
    toast.info("Awaiting wallet signature...");
    const neoline = new window.NEOLineN3.Init();
    
    const result = await neoline.signMessage({
      message: "Authorize creation of new Governance Proposal: " + selectedMethod.value
    });
    
    if (result && result.signature) {
      toast.success("Governance proposal authorized successfully!");
      showCreateModal.value = false;
    }
  } catch (e) {
    console.error(e);
    toast.error("Signature rejected or failed: " + (e.description || e.message));
  }
}
`;

code = code.replace(/function handleCreateProposal\(\) \{\s*toast\.success\([^;]+\);\s*showCreateModal\.value = false;\s*\}/m, newFn);
fs.writeFileSync('src/views/Tools/GovernanceTool.vue', code);
