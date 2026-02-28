const fs = require('fs');

let code = fs.readFileSync('src/utils/wallet.js', 'utf8');

if (!code.includes('import { walletService }')) {
    code = code.replace(
        'import { getCurrentEnv, NET_ENV } from "@/utils/env";',
        'import { getCurrentEnv, NET_ENV } from "@/utils/env";\nimport { walletService } from "@/services/walletService";'
    );
}

const oldVoteFunc = `export async function voteForCandidate(candidatePubkey) {
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
            return result;
        } catch (e) {
            toast.error("Voting failed: " + (e.message || e.description || JSON.stringify(e)));
            throw e;
        }
    } else {
        toast.error("NeoLine N3 wallet not found.");
    }
}`;

const newVoteFunc = `export async function voteForCandidate(candidatePubkey) {
    const toast = useToast();
    if (!connectedAccount.value) {
        await connectWallet();
    }
    if (!connectedAccount.value) return;

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
            scope: 1
        });

        toast.success("Vote transaction submitted: " + result.txid);
        return result.txid;
    } catch (e) {
        console.error(e);
        toast.error("Voting failed: " + (e.message || e.description || "Unknown error"));
        throw e;
    }
}`;

code = code.replace(oldVoteFunc, newVoteFunc);

const oldInvokeFunc = `export async function invokeContract(scriptHash, operation, args, signers) {
    if (typeof window !== 'undefined' && window.NEOLineN3) {
        const neoline = new window.NEOLineN3.Init();
        const result = await neoline.invoke({
            scriptHash,
            operation,
            args,
            signers
        });
        return result.txid;
    } else {
        throw new Error('NeoLine N3 wallet not found.');
    }
}`;

const newInvokeFunc = `export async function invokeContract(scriptHash, operation, args, signers) {
    if (!walletService.isConnected) {
        throw new Error("Wallet not connected");
    }

    const result = await walletService.invoke({
        scriptHash,
        operation,
        args,
        signers
    });
    return result.txid;
}`;

code = code.replace(oldInvokeFunc, newInvokeFunc);

fs.writeFileSync('src/utils/wallet.js', code);
