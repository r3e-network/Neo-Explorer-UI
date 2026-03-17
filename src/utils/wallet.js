import { ref } from "vue";

import { useToast } from "vue-toastification";
import { getCurrentEnv, NET_ENV } from "@/utils/env";
import { walletService } from "@/services/walletService";
import { isHash160Hex, normalizeHash160 } from "@/utils/walletNormalization";


function getStoredWalletAddress() {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("connectedWallet") || localStorage.getItem("connectedWallet") || "";
}

export const connectedAccount = ref("");

function clearStoredWalletState() {
    connectedAccount.value = "";
    if (typeof window === "undefined") return;
    localStorage.removeItem("connectedWallet");
    localStorage.removeItem("walletProvider");
    sessionStorage.removeItem("connectedWallet");
    sessionStorage.removeItem("walletProvider");
    sessionStorage.removeItem("devTestWif");
}

function setStoredWalletAddress(provider, address) {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("walletProvider") === provider) {
        sessionStorage.setItem("connectedWallet", address);
        return;
    }
    localStorage.setItem("connectedWallet", address);
}

function getStoredWalletProvider() {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("walletProvider") || localStorage.getItem("walletProvider");
}

function isNeoLineSessionActive() {
    return getStoredWalletProvider() === walletService.PROVIDERS.NEOLINE;
}

let _neoLineListenersSetup = false;
function setupNeoLineEventListeners() {
    if (typeof window === "undefined" || _neoLineListenersSetup) return;
    _neoLineListenersSetup = true;

    const handleAccountChange = (data) => {
        if (!isNeoLineSessionActive()) return;

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
}

export async function initWallet() {
    if (typeof window === "undefined") return;

    const storedAddress = getStoredWalletAddress();
    const provider = getStoredWalletProvider();
    if (!storedAddress || !provider) {
        clearStoredWalletState();
        return;
    }

    // Passive restore only. Do not call interactive wallet APIs during app boot.
    connectedAccount.value = "";

    if (provider === "NeoLine") {
        const hasNeoLine = await waitForNeoLineN3(1000);
        if (!hasNeoLine) {
            clearStoredWalletState();
            return;
        }

        try {
            setupNeoLineEventListeners();
            connectedAccount.value = storedAddress;
            setStoredWalletAddress(walletService.PROVIDERS.NEOLINE, storedAddress);
            walletService.hydrateSession(walletService.PROVIDERS.NEOLINE, {
                address: storedAddress,
                label: walletService.PROVIDERS.NEOLINE,
            });
        } catch (e) {
            clearStoredWalletState();
        }
    } else if (provider === "O3") {
        if (!window.neo3Dapi) {
            clearStoredWalletState();
            return;
        }

        try {
            connectedAccount.value = storedAddress;
            setStoredWalletAddress(walletService.PROVIDERS.O3, storedAddress);
            walletService.hydrateSession(walletService.PROVIDERS.O3, {
                address: storedAddress,
                label: walletService.PROVIDERS.O3,
            });
        } catch (e) {
            clearStoredWalletState();
        }
    } else if (provider === walletService.PROVIDERS.ONEGATE) {
        if (!window.OneGate && !window.neo) {
            clearStoredWalletState();
            return;
        }

        try {
            connectedAccount.value = storedAddress;
            setStoredWalletAddress(walletService.PROVIDERS.ONEGATE, storedAddress);
            walletService.hydrateSession(walletService.PROVIDERS.ONEGATE, {
                address: storedAddress,
                label: walletService.PROVIDERS.ONEGATE,
            });
        } catch (e) {
            clearStoredWalletState();
        }
    } else if (provider === walletService.PROVIDERS.WALLETCONNECT) {
        clearStoredWalletState();
    } else if (provider === walletService.PROVIDERS.TESTNET_WIF) {
        try {
            const wif = sessionStorage.getItem("devTestWif") || "";
            const account = await walletService.restoreSession(walletService.PROVIDERS.TESTNET_WIF, { wif });
            if (account && account.address) {
                connectedAccount.value = account.address;
                sessionStorage.setItem("connectedWallet", account.address);
            } else {
                clearStoredWalletState();
            }
        } catch (e) {
            clearStoredWalletState();
        }
    } else if (provider === walletService.PROVIDERS.NEON) {
        try {
            const account = await walletService.restoreSession(walletService.PROVIDERS.NEON);
            if (account && account.address) {
                connectedAccount.value = account.address;
                localStorage.setItem("connectedWallet", account.address);
            } else {
                clearStoredWalletState();
            }
        } catch (e) {
            clearStoredWalletState();
        }
    } else if (provider === walletService.PROVIDERS.WEB3AUTH) {
        try {
            const account = await walletService.restoreSession(walletService.PROVIDERS.WEB3AUTH);
            if (account && account.address) {
                connectedAccount.value = account.address;
                setStoredWalletAddress(walletService.PROVIDERS.WEB3AUTH, account.address);
            } else {
                clearStoredWalletState();
            }
        } catch (e) {
            clearStoredWalletState();
        }
    } else {
        clearStoredWalletState();
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
            window.removeEventListener("NEOLine.N3.EVENT.READY", onReady);
            clearTimeout(timer);
        };

        window.addEventListener("NEOLine.NEO.EVENT.READY", onReady);
        window.addEventListener("NEOLine.N3.EVENT.READY", onReady);

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
            localStorage.setItem("walletProvider", walletService.PROVIDERS.NEOLINE);
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
    clearStoredWalletState();
}

export async function voteForCandidate(candidatePubkey) {
    const toast = useToast();
    if (!walletService.isConnected) {
        toast.error("Please connect your wallet first via the header.");
        return;
    }

    const voterAddress = connectedAccount.value || walletService.account?.address;
    if (!voterAddress) {
        toast.error("Connected wallet address unavailable. Please reconnect from the header.");
        return;
    }

    const voterHash160 = normalizeHash160(voterAddress);
    if (!isHash160Hex(voterHash160)) {
        toast.error("Connected wallet address is invalid for voting. Please reconnect.");
        return;
    }

    try {
        const neoScriptHash = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";

        const result = await walletService.invoke({
            scriptHash: neoScriptHash,
            operation: "vote",
            args: [
                { type: "Hash160", value: voterHash160 },
                { type: "PublicKey", value: candidatePubkey }
            ],
            signers: [{ account: voterHash160, scopes: 1 }],
            scope: 1
        });

        toast.success("Vote transaction submitted: " + result.txid);
        return result.txid;
    } catch (e) {
        console.error(e);
        toast.error("Voting failed: " + (e.message || e.description || "Unknown error"));
        throw e;
    }
}

export async function invokeContract(scriptHash, operation, args, signers) {
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
}
