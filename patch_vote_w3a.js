const fs = require('fs');

let code = fs.readFileSync('src/utils/wallet.js', 'utf8');

// The internal `voteForCandidate` method in utils/wallet.js still uses pure NeoLine.
// Let's refactor it to use walletService so users can vote from the homepage Leaderboard using Web3Auth.

const importsTarget = `import { getCurrentEnv, NET_ENV } from "@/utils/env";`;
const importsNew = `import { getCurrentEnv, NET_ENV } from "@/utils/env";\nimport { walletService } from "@/services/walletService";`;

if (!code.includes('import { walletService }')) {
    code = code.replace(importsTarget, importsNew);
}

const targetFunc = `export async function voteForCandidate(candidatePubkey) {
    const toast = useToast();
    if (!connectedAccount.value) {
        await connectWallet();
    }
    if (!connectedAccount.value) return;

    if (typeof window !== "undefined" && window.NEOLineN3) {
        const neoline = new window.NEOLineN3.Init();
        try {
            // NEO Token Script Hash
            const neoScriptHash = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";

            const result = await neoline.invoke({
                scriptHash: neoScriptHash,
                operation: "vote",
                args: [
                    { type: "Hash160", value: sc.ContractParam.hash160(connectedAccount.value).value },
                    { type: "PublicKey", value: candidatePubkey }
                ],
                signers: [
                    {
                        account: sc.ContractParam.hash160(connectedAccount.value).value,
                        scopes: 1 // CalledByEntry
                    }
                ]
            });

            toast.success("Vote transaction submitted: " + result.txid);
            return result.txid;
        } catch (e) {
            console.error(e);
            toast.error("Failed to vote: " + (e.description || e.message || "Unknown error"));
        }
    } else {
        toast.error("NeoLine N3 not found. Please install the wallet extension.");
    }
}`;

const newFunc = `export async function voteForCandidate(candidatePubkey) {
    const toast = useToast();
    
    if (!walletService.isConnected) {
        toast.error("Please connect your wallet first via the header.");
        return;
    }

    try {
        const neoScriptHash = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";

        const result = await walletService.invoke({
            scriptHash: neoScriptHash,
            operation: "vote",
            args: [
                { type: "Hash160", value: connectedAccount.value },
                { type: "PublicKey", value: candidatePubkey }
            ],
            signers: [
                {
                    account: connectedAccount.value,
                    scopes: 1 // CalledByEntry
                }
            ]
        });

        toast.success("Vote transaction submitted: " + result.txid);
        return result.txid;
    } catch (e) {
        console.error(e);
        toast.error("Failed to vote: " + (e.description || e.message || "Unknown error"));
    }
}`;

code = code.replace(targetFunc, newFunc);
fs.writeFileSync('src/utils/wallet.js', code);
