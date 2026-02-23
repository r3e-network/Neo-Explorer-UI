import { ref } from "vue";
import { sc } from "@cityofzion/neon-js";
import { useToast } from "vue-toastification";
import { getCurrentEnv, NET_ENV } from "@/utils/env";

export const connectedAccount = ref("");

export async function connectWallet() {
    const toast = useToast();
    if (typeof window !== "undefined" && window.NEOLineN3) {
        try {
            const neoline = new window.NEOLineN3.Init();
            
            // Check network matching
            const network = await neoline.getNetworks();
            const walletNet = (network?.defaultNetwork || "").toLowerCase();
            const explorerNet = getCurrentEnv().toLowerCase();
            
            const isMainnetMatch = walletNet === "mainnet" && explorerNet === NET_ENV.Mainnet.toLowerCase();
            const isTestnetMatch = walletNet === "testnet" && explorerNet === NET_ENV.TestT5.toLowerCase();
            
            if (!isMainnetMatch && !isTestnetMatch) {
                toast.error(`Network mismatch. Please switch your wallet to ${getCurrentEnv()} and try again.`);
                return null;
            }

            const account = await neoline.getAccount();
            connectedAccount.value = account.address;
            toast.success("Wallet connected: " + account.address.slice(0, 5) + "..." + account.address.slice(-4));
            return account.address;
        } catch (e) {
            toast.error("Failed to connect wallet: " + e.message);
            return null;
        }
    } else {
        toast.warning("Please install NeoLine N3 wallet extension.");
        return null;
    }
}

export async function disconnectWallet() {
    connectedAccount.value = "";
}

export async function voteForCandidate(candidatePubkey) {
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
}
