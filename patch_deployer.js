const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/ContractDeployerTool.vue', 'utf8');

if (!code.includes('walletService')) {
   const importsStr = `import { formatBytes } from "@/utils/explorerFormat";
import { walletService } from "@/services/walletService";`;

   code = code.replace('import { formatBytes } from "@/utils/explorerFormat";', importsStr);
}

const targetFunc = `async function deployContract() {
  if (!connectedAccount.value) return;
  if (!isReadyToDeploy.value) return;
  
  if (typeof window === "undefined" || !window.NEOLineN3) {
    toast.error("NeoLine N3 wallet not found.");
    return;
  }

  isDeploying.value = true;
  txHash.value = "";
  
  try {
    toast.info("Please review the deployment in your wallet...");
    const neoline = new window.NEOLineN3.Init();
    
    // Convert string to hex properly for N3 payload or pass directly if wallet handles it.
    // neoline usually handles String typing implicitly, but let's be strict.
    
    const result = await neoline.invoke({
      scriptHash: "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd", // ContractManagement
      operation: "deploy",
      args: [
        { type: "ByteArray", value: nefHex.value },
        { type: "String", value: manifestString.value }
      ],
      signers: [
        { account: connectedAccount.value, scopes: 1 }
      ]
    });
    
    if (result && result.txid) {
      txHash.value = result.txid;
      toast.success("Contract successfully deployed to the network!");
    } else {
      throw new Error("No transaction ID returned.");
    }
  } catch (e) {
    console.error(e);
    toast.error("Deployment failed: " + (e.description || e.message || "User rejected"));
  } finally {
    isDeploying.value = false;
  }
}`;

const newFunc = `async function deployContract() {
  if (!connectedAccount.value) return;
  if (!isReadyToDeploy.value) return;
  
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first via the header.");
    return;
  }

  isDeploying.value = true;
  txHash.value = "";
  
  try {
    toast.info("Please review the deployment in your wallet...");
    
    const result = await walletService.invoke({
      scriptHash: "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd", // ContractManagement
      operation: "deploy",
      args: [
        { type: "ByteArray", value: nefHex.value },
        { type: "String", value: manifestString.value }
      ],
      scope: 1
    });
    
    if (result && result.txid) {
      txHash.value = result.txid;
      toast.success("Contract successfully deployed to the network!");
    } else {
      throw new Error("No transaction ID returned.");
    }
  } catch (e) {
    console.error(e);
    toast.error("Deployment failed: " + (e.description || e.message || "User rejected"));
  } finally {
    isDeploying.value = false;
  }
}`;

code = code.replace(targetFunc, newFunc);
fs.writeFileSync('src/views/Tools/ContractDeployerTool.vue', code);
