const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/SponsoredTool.vue', 'utf8');

// I need to import walletService
if (!code.includes('import { walletService } from "@/services/walletService";')) {
  code = code.replace(
    'import { connectedAccount } from \'@/utils/wallet\';',
    'import { connectedAccount } from \'@/utils/wallet\';\nimport { walletService } from "@/services/walletService";'
  );
}

// Replace NeoLine invoke
code = code.replace(
  'const neoline = new window.NEOLineN3.Init();',
  '// Ensure wallet connected via service\n    if (!walletService.isConnected) {\n      toast.error("Please connect your wallet first via the header.");\n      isProcessing.value = false;\n      return;\n    }'
);

const targetReplace1 = `neolineSignRes = await neoline.invoke({
                scriptHash: neoHash,
                operation: 'transfer',
                args: [
                    { type: "Hash160", value: userScriptHash },
                    { type: "Hash160", value: userScriptHash },
                    { type: "Integer", value: "0" },
                    { type: "Any", value: null }
                ],
                signers: [
                    { account: sponsorScriptHash, scopes: 0 },
                    { account: userScriptHash, scopes: 1 }
                ],
                broadcastOverride: true
            });`;
const newReplace1 = `neolineSignRes = await walletService.invoke({
                scriptHash: neoHash,
                operation: 'transfer',
                args: [
                    { type: "Hash160", value: userScriptHash },
                    { type: "Hash160", value: userScriptHash },
                    { type: "Integer", value: "0" },
                    { type: "Any", value: null }
                ],
                signers: [
                    { account: sponsorScriptHash, scopes: 0 },
                    { account: userScriptHash, scopes: 1 }
                ],
                broadcastOverride: true
            });`;

const targetReplace2 = `neolineSignRes = await neoline.invoke({
                scriptHash: neoHash,
                operation: 'vote',
                args: [
                    { type: "Hash160", value: userScriptHash },
                    { type: "PublicKey", value: candidatePubKey.value.trim() }
                ],
                signers: [
                    { account: sponsorScriptHash, scopes: 0 },
                    { account: userScriptHash, scopes: 1 }
                ],
                broadcastOverride: true
            });`;
            
const newReplace2 = `neolineSignRes = await walletService.invoke({
                scriptHash: neoHash,
                operation: 'vote',
                args: [
                    { type: "Hash160", value: userScriptHash },
                    { type: "PublicKey", value: candidatePubKey.value.trim() }
                ],
                signers: [
                    { account: sponsorScriptHash, scopes: 0 },
                    { account: userScriptHash, scopes: 1 }
                ],
                broadcastOverride: true
            });`;

code = code.replace(targetReplace1, newReplace1);
code = code.replace(targetReplace2, newReplace2);

fs.writeFileSync('src/views/Tools/SponsoredTool.vue', code);
