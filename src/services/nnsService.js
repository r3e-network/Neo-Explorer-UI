import { rpc, sc } from "@cityofzion/neon-js";
import { getRpcApiBasePath, getRpcClientUrl } from "../utils/env";

const NNS_CONTRACT_HASH = "0x50ac1c37690cc2cfc594472833cf57505d5f46de"; // Mainnet
// Note: testnet might be different. 
// For testnet, you can check import.meta.env.VITE_NETWORK or similar to switch.
const IS_TESTNET = import.meta.env.VITE_NETWORK === "testnet" || getRpcApiBasePath().includes("test");

// The Profile API URL is hardcoded in neo3fura megaoasis.
const PROFILE_API_BASE = IS_TESTNET
    ? "https://megaoasis.ngd.network:8889/profile/get?address="
    : "https://megaoasis.ngd.network:8893/profile/get?address=";

export const nnsService = {
    /**
     * Resolve an address to a Name Service profile (NNS domain name)
     * @param {string} address The base58 NEO address or script hash
     * @returns {Promise<{ nns: string, userName: string } | null>}
     */
    async resolveAddressToNNS(address) {
        if (!address) return null;
        try {
            // Using the same API that neo3fura uses for "GetNNSByAddress"
            const res = await fetch(`${PROFILE_API_BASE}${address}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (data && data.nns) {
                return {
                    nns: data.nns,
                    userName: data.username || "",
                };
            }
            return null;
        } catch (e) {
            if (import.meta.env.DEV) console.warn("Failed to resolve NNS profile for address:", address, e);
            return null;
        }
    },

    /**
     * Resolve NNS Domain to Address string
     * @param {string} domain 
     * @returns {Promise<string|null>} Address if resolved, null otherwise
     */
    async resolveDomain(domain) {
        if (!domain || !domain.endsWith(".neo")) return null;
        try {
            // Using node RPC 
            const rpcClient = new rpc.RPCClient(getRpcClientUrl());
            const res = await rpcClient.invokeFunction(
                NNS_CONTRACT_HASH,
                "resolve",
                [
                    sc.ContractParam.string(domain),
                    sc.ContractParam.integer(16) // TXT record for N3 NNS usually holds the address
                ]
            );
            if (res.state === "HALT" && res.stack && res.stack.length > 0) {
                const value = res.stack[0].value;
                if (value) {
                    return atob(value); // base64 decode if string returned
                }
            }
        } catch (e) {
            if (import.meta.env.DEV) console.warn("Failed to resolve NNS Domain:", domain, e);
        }
        return null;
    }
};

export default nnsService;
