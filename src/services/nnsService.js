import { safeRpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { getCurrentEnv, NET_ENV } from "../utils/env";

const NNS_CONTRACT_HASH = "0x50ac1c37690cc2cfc594472833cf57505d5f46de"; // Mainnet

export const nnsService = {
    /**
     * Resolve an address to a Name Service profile (NNS domain name)
     * @param {string} address The base58 NEO address
     * @returns {Promise<{ nns: string } | null>}
     */
    async resolveAddressToNNS(address) {
        if (!address) return null;
        const env = getCurrentEnv();
        if (env !== NET_ENV.Mainnet) return null;

        const key = getCacheKey("nns_address_to_name", { address });
        return cachedRequest(
            key,
            async () => {
                try {
                    const result = await safeRpc("GetNNSNameByOwner", {
                        Asset: NNS_CONTRACT_HASH,
                        Owner: address
                    }, []);

                    if (Array.isArray(result) && result.length > 0) {
                        const now = Date.now();
                        // Find first valid, unexpired domain
                        const validDomains = result.filter(domain => {
                            if (domain.name && domain.expiration) {
                                // expiration from neo3fura can be in seconds or ms.
                                // NNS usually stores expiration in milliseconds.
                                let exp = Number(domain.expiration);
                                if (exp < 1000000000000) {
                                    exp = exp * 1000;
                                }
                                return exp > now;
                            }
                            return false;
                        });

                        if (validDomains.length > 0) {
                            return { nns: validDomains[0].name };
                        }
                    }
                    return null;
                } catch (e) {
                    if (import.meta.env.DEV) console.warn("Failed to resolve NNS profile for address:", address, e);
                    return null;
                }
            },
            CACHE_TTL.chart // Cache for 5 mins
        );
    },

    /**
     * Resolve NNS Domain to Address string
     * @param {string} domain 
     * @returns {Promise<string|null>} Address if resolved, null otherwise
     */
    async resolveDomain(domain) {
        if (!domain || !domain.endsWith(".neo")) return null;
        const env = getCurrentEnv();
        if (env !== NET_ENV.Mainnet) return null;

        const key = getCacheKey("nns_domain_to_address", { domain });
        return cachedRequest(
            key,
            async () => {
                try {
                    const res = await safeRpc("GetNNSResolve", { Domain: domain }, null);
                    if (res && res.address) {
                        return res.address;
                    }
                } catch (e) {
                    if (import.meta.env.DEV) console.warn("Failed to resolve NNS Domain:", domain, e);
                }
                return null;
            },
            CACHE_TTL.chart // Cache for 5 mins locally, backend handles long-term expiration caching
        );
    }
};

export default nnsService;
