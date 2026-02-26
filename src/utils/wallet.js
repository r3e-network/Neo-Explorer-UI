import { ref } from "vue";
import { sc } from "@cityofzion/neon-js";
import { useToast } from "vue-toastification";
import { getCurrentEnv, NET_ENV } from "@/utils/env";

export const connectedAccount = ref(typeof window !== "undefined" ? localStorage.getItem("connectedWallet") || "" : "");


let _neoLineListenersSetup = false;
function setupNeoLineEventListeners() {
    if (typeof window === "undefined" || _neoLineListenersSetup) return;
    _neoLineListenersSetup = true;

    const handleAccountChange = (data) => {
        if (data && data.detail && data.detail.address) {
            connectedAccount.value = data.detail.address;
            localStorage.setItem("connectedWallet", data.detail.address);
        } else {
            connectedAccount.value = "";
            localStorage.removeItem("connectedWallet");
        }
    };

    window.addEventListener('NEOLine.NEO.EVENT.ACCOUNT_CHANGED', handleAccountChange);
    window.addEventListener('NEOLine.N3.EVENT.ACCOUNT_CHANGED', handleAccountChange);
    
    // Fallback: Some NeoLine versions trigger an event without detail, so we do a passive refresh on browser focus
    window.addEventListener('focus', async () => {
        if (connectedAccount.value && window.NEOLineN3) {
            try {
                const neoline = new window.NEOLineN3.Init();
                const account = await neoline.getAccount();
                if (account && account.address && account.address !== connectedAccount.value) {
                    connectedAccount.value = account.address;
                    localStorage.setItem("connectedWallet", account.address);
                }
            } catch(e) {
                // Ignore silent errors on focus
            }
        }
    });
}

export async function initWallet() {
    if (typeof window === "undefined") return;
    
    // Attempt generic reconnect if we had an active session stored
    const provider = localStorage.getItem("walletProvider");
    
    if (connectedAccount.value && provider === "NeoLine") {
        const hasNeoLine = await waitForNeoLineN3(1000);
        if (hasNeoLine) {
            try {
                const neoline = new window.NEOLineN3.Init();
                setupNeoLineEventListeners();
                const account = await neoline.getAccount();
                if (account && account.address) {
                    connectedAccount.value = account.address;
                    localStorage.setItem("connectedWallet", account.address);
                } else {
                    connectedAccount.value = "";
                    localStorage.removeItem("connectedWallet");
                }
            } catch (e) {
                connectedAccount.value = "";
                localStorage.removeItem("connectedWallet");
            }
        }
    } else if (connectedAccount.value && provider === "O3") {
       if (window.neo3Dapi) {
           try {
              const account = await window.neo3Dapi.getAccount();
              if (account && account.address) {
                  connectedAccount.value = account.address;
              }
           } catch(e) { /* ignore */ }
       }
    } else if (connectedAccount.value && provider === "WalletConnect") {
       // Ideally we'd restore WC session, but this is handled by the walletService if called.
       // Let's assume the walletService handles session persistence.
    }
}

function waitForNeoLineN3(timeout = 3000) {
    return new Promise((resolve) => {
        if (typeof window === "undefined") {
            resolve(false);
            return;
        }

        if (window.NEOLineN3) {
            resolve(true);
            return;
        }

        const onReady = () => {
            cleanup();
            resolve(Boolean(window.NEOLineN3));
        };

        const cleanup = () => {
            window.removeEventListener("NEOLine.NEO.EVENT.READY", onReady);
            clearTimeout(timer);
        };

        window.addEventListener("NEOLine.NEO.EVENT.READY", onReady);

        const timer = setTimeout(() => {
            cleanup();
            resolve(Boolean(window.NEOLineN3));
        }, timeout);
    });
}

export async function connectWallet() {
    const toast = useToast();
    const hasNeoLine = await waitForNeoLineN3();
    if (hasNeoLine) {
        try {
            const neoline = new window.NEOLineN3.Init();
            setupNeoLineEventListeners();
            
            // Check network matching
            const network = await neoline.getNetworks();
            const walletNet = (network?.defaultNetwork || "").toLowerCase();
            const explorerNet = getCurrentEnv().toLowerCase();
            
            // Improved network matching logic
            const isMainnetMatch = (walletNet.includes("main") || walletNet === "mainnet") && 
                                   (explorerNet.includes("main") || explorerNet === NET_ENV.Mainnet.toLowerCase());
            const isTestnetMatch = (walletNet.includes("test") || walletNet.includes("t5") || walletNet === "testnet") && 
                                   (explorerNet.includes("test") || explorerNet.includes("t5") || explorerNet === NET_ENV.TestT5.toLowerCase());
            
            if (!isMainnetMatch && !isTestnetMatch) {
                toast.error(`Network mismatch. Please switch your NeoLine wallet to ${getCurrentEnv()} and try again.`);
                return null;
            }

            const account = await neoline.getAccount();
            if (!account || !account.address) {
                toast.warning("No account found in NeoLine.");
                return null;
            }
            
            connectedAccount.value = account.address;
            toast.success("Wallet connected: " + account.address.slice(0, 5) + "..." + account.address.slice(-4));
            return account.address;
        } catch (e) {
            console.error("Wallet connection failed", e);
            toast.error("Failed to connect wallet: " + (e.message || "Unknown error"));
            return null;
        }
    } else {
        toast.warning("NeoLine N3 wallet not found. Please install the extension.");
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

export async function invokeContract(scriptHash, operation, args, signers) {
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
}
