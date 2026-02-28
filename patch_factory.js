const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/ContractFactoryTool.vue', 'utf8');

if (!code.includes('walletService')) {
   const importsStr = `import { useToast } from "vue-toastification";
import { walletService } from "@/services/walletService";
import { rpc, wallet, sc } from "@cityofzion/neon-js";
import { getCurrentEnv } from "@/utils/env";`;

   code = code.replace('import { useToast } from "vue-toastification";', importsStr);
}

const targetFunc = `async function deployFactoryContract() {
  if (!connectedAccount.value || !isFormValid.value) return;
  
  if (typeof window === "undefined" || !window.NEOLineN3) {
    toast.error("NeoLine N3 wallet not found.");
    return;
  }

  isDeploying.value = true;
  txHash.value = "";
  
  try {
    toast.info("Compiling template parameters...");
    // Simulate compilation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.info("Please review the deployment in your wallet...");
    const neoline = new window.NEOLineN3.Init();
    
    // In a real factory, we would invoke the Factory Contract with our parameters.
    // For this demonstration, we simulate the factory deployment signature payload.
    // Let's do a self-transfer with a remark containing the template instructions to simulate deployment on-chain.
    
    const result = await neoline.invoke({
        scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf', // GAS
        operation: 'transfer',
        args: [
            { type: "Hash160", value: new window.NEOLineN3.utils.Account(connectedAccount.value).scriptHash },
            { type: "Hash160", value: new window.NEOLineN3.utils.Account(connectedAccount.value).scriptHash },
            { type: "Integer", value: "0" },
            { type: "String", value: "FactoryDeploy:" + selectedTemplate.value }
        ],
        signers: [
            { account: connectedAccount.value, scopes: 1 }
        ]
    });
    
    if (result && result.txid) {
      txHash.value = result.txid;
      toast.success(activeTemplate.value.name + " deployed successfully!");
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

const newFunc = `async function deployFactoryContract() {
  if (!connectedAccount.value || !isFormValid.value) return;
  
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first via the header.");
    return;
  }

  isDeploying.value = true;
  txHash.value = "";
  
  try {
    toast.info("Compiling template parameters...");
    // Simulate compilation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.info("Please review the deployment in your wallet...");
    
    // In a real factory, we would invoke the Factory Contract with our parameters.
    // For this demonstration, we simulate the factory deployment signature payload.
    // Let's do a self-transfer with a remark containing the template instructions to simulate deployment on-chain.
    
    const userScriptHash = new wallet.Account(connectedAccount.value).scriptHash;
    
    const result = await walletService.invoke({
        scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf', // GAS
        operation: 'transfer',
        args: [
            { type: "Hash160", value: userScriptHash },
            { type: "Hash160", value: userScriptHash },
            { type: "Integer", value: "0" },
            { type: "String", value: "FactoryDeploy:" + selectedTemplate.value }
        ],
        scope: 1
    });
    
    if (result && result.txid) {
      txHash.value = result.txid;
      toast.success(activeTemplate.value.name + " deployed successfully!");
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

const targetUpload = `async function uploadLogoToNeoFS(e, fieldId) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (typeof window === "undefined" || !window.NEOLineN3) {
    toast.error("NeoLine N3 wallet required to sign NeoFS upload.");
    return;
  }
  
  isUploadingLogo.value = true;
  toast.info("Awaiting wallet signature for NeoFS upload...");
  
  try {
    const neoline = new window.NEOLineN3.Init();
    const result = await neoline.signMessage({
      message: "Authorize NeoFS Upload: " + file.name
    });
    
    if (result && result.signature) {
      // Mock successful upload by generating a NeoFS OID
      const mockOid = Array.from({length: 44}, () => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join('');
      formData.value[fieldId] = \`neofs:\${mockOid}\`;
      toast.success("Logo uploaded to NeoFS successfully!");
    }
  } catch (err) {
    console.error(err);
    toast.error("Upload rejected or failed.");
  } finally {
    isUploadingLogo.value = false;
    e.target.value = null; // reset input
  }
}`;

const newUpload = `async function uploadLogoToNeoFS(e, fieldId) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first via the header.");
    return;
  }
  
  // NOTE: signMessage is tricky across different wallets (O3 vs NeoLine vs WC).
  // Some wallets only support invoke securely via standard interface.
  // For this mock demo, we will bypass strict signature requirements if not NeoLine
  // or we can just mock it for now since we are just filling a string.
  
  isUploadingLogo.value = true;
  toast.info("Preparing NeoFS upload payload...");
  
  try {
    // Mock successful upload by generating a NeoFS OID after a small delay
    await new Promise(resolve => setTimeout(resolve, 800));
    const mockOid = Array.from({length: 44}, () => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join('');
    formData.value[fieldId] = \`neofs:\${mockOid}\`;
    toast.success("Logo uploaded to NeoFS successfully!");
  } catch (err) {
    console.error(err);
    toast.error("Upload rejected or failed.");
  } finally {
    isUploadingLogo.value = false;
    e.target.value = null; // reset input
  }
}`;

code = code.replace(targetUpload, newUpload);

fs.writeFileSync('src/views/Tools/ContractFactoryTool.vue', code);
