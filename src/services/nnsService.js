import axios from "axios";
import { rpc, safeRpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { getCurrentEnv, getRpcApiBasePath, NET_ENV } from "../utils/env";
import { rpc as neonRpc, sc } from "@cityofzion/neon-js";
import { callWithRpcEndpointFallback } from "@/utils/rpcEndpoints";
import { supabaseService } from "@/services/supabaseService";

const NNS_CONTRACT_HASH = "0x50ac1c37690cc2cfc594472833cf57505d5f46de"; // Mainnet
const INVALID_REQUEST_CODE = "-32600";
const NNS_SUFFIX = ".neo";
const MATRIX_SUFFIX = ".matrix";

const isInvalidRequestError = (error) => {
    const message = String(error?.message || "");
    return message.includes(INVALID_REQUEST_CODE) || message.includes("Invalid request");
};

const shouldRetryResolveAgainstPrimary = (env) => {
    if (env !== NET_ENV.Mainnet) return false;
    return String(getRpcApiBasePath() || "").endsWith("/api/mainnet/fallback");
};

const resolveDomainViaPrimary = async (domain) => {
    try {
        const response = await axios.post(
            "/api/mainnet/primary",
            {
                jsonrpc: "2.0",
                id: 1,
                method: "GetNNSResolve",
                params: { Domain: domain },
            },
            { timeout: 8000 }
        );
        return response?.data?.result?.address || null;
    } catch (_error) {
        return null;
    }
};

const normalizeDomainName = (value) => String(value || "").trim().toLowerCase();

const normalizeExpirationMs = (raw) => {
    const candidates = [
        raw?.expiration,
        raw?.expire,
        raw?.expires,
        raw?.expiredAt,
        raw?.expiresAt,
        raw?.expirationTime,
        raw?.expiration_time,
    ];

    for (const item of candidates) {
        const numeric = Number(item);
        if (!Number.isFinite(numeric) || numeric <= 0) continue;
        return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    }

    return 0;
};

const pickActiveDomain = (domains = []) => {
    const now = Date.now();
    const normalized = [];

    for (const domain of domains) {
        const name = normalizeDomainName(domain?.name);
        if (!name || !name.endsWith(NNS_SUFFIX)) continue;

        const expirationMs = normalizeExpirationMs(domain);
        if (!Number.isFinite(expirationMs) || expirationMs <= now) continue;

        normalized.push({
            name,
            expirationMs,
        });
    }

    if (!normalized.length) return null;

    // Prefer domain that remains valid the longest.
    normalized.sort((a, b) => b.expirationMs - a.expirationMs);
    return normalized[0];
};

const getActiveDomainFromMetadata = (metadata) => {
    if (!metadata || typeof metadata !== "object") return null;
    const name = normalizeDomainName(metadata.nns_domain || metadata.nnsDomain);
    if (!name || !name.endsWith(NNS_SUFFIX)) return null;
    let expirationMs = Number(
        metadata.nns_expiration_ms ??
        metadata.nnsExpirationMS ??
        metadata.nns_expiration ??
        metadata.nnsExpiration ??
        0
    );
    if (Number.isFinite(expirationMs) && expirationMs > 0 && expirationMs < 1_000_000_000_000) {
        expirationMs *= 1000;
    }
    if (!Number.isFinite(expirationMs) || expirationMs <= Date.now()) return null;
    return name;
};

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
                    const metadata = await supabaseService.getAddressTag(address, env);
                    const cachedDomain = getActiveDomainFromMetadata(metadata);
                    if (cachedDomain) {
                        return { nns: cachedDomain };
                    }
                } catch (_metadataErr) {
                    // Ignore metadata read errors and continue to RPC fallback.
                }

                try {
                    const result = await safeRpc("GetNNSNameByOwner", {
                        Asset: NNS_CONTRACT_HASH,
                        Owner: address
                    }, []);

                    if (Array.isArray(result) && result.length > 0) {
                        const activeDomain = pickActiveDomain(result);
                        if (activeDomain?.name) {
                            return { nns: activeDomain.name };
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
     * Resolve many addresses and return alias map.
     * Known callsites can use this for list prefetching.
     * @param {string[]} addresses
     * @returns {Promise<Record<string, string>>}
     */
    async resolveAddressesToNNS(addresses = []) {
        if (!Array.isArray(addresses) || addresses.length === 0) return {};
        const unique = [...new Set(addresses.map((a) => String(a || "").trim()).filter(Boolean))];
        if (!unique.length) return {};

        const pairs = await Promise.all(
            unique.map(async (address) => {
                const resolved = await this.resolveAddressToNNS(address);
                return [address, resolved?.nns || null];
            })
        );

        const out = {};
        for (const [address, domain] of pairs) {
            if (domain) out[address] = domain;
        }
        return out;
    },

    /**
     * Resolve NNS Domain to Address string
     * @param {string} domain 
     * @returns {Promise<string|null>} Address if resolved, null otherwise
     */
    async resolveDomain(domain) {
        if (!domain) return null;
        if (domain.endsWith(MATRIX_SUFFIX)) return this.resolveMatrixDomain(domain);
        if (!domain.endsWith(NNS_SUFFIX)) return null;
        const env = getCurrentEnv();
        if (env !== NET_ENV.Mainnet) return null;

        const key = getCacheKey("nns_domain_to_address", { domain });
        return cachedRequest(
            key,
            async () => {
                try {
                    const resolveResult = await rpc("GetNNSResolve", { Domain: domain });
                    const resolvedAddress =
                        (typeof resolveResult === "string" ? resolveResult : null) ||
                        resolveResult?.address ||
                        resolveResult?.result?.address ||
                        null;

                    if (resolvedAddress) {
                        return resolvedAddress;
                    }
                } catch (e) {
                    if (isInvalidRequestError(e) && shouldRetryResolveAgainstPrimary(env)) {
                        const primaryResolved = await resolveDomainViaPrimary(domain);
                        if (primaryResolved) return primaryResolved;
                    }

                    if (import.meta.env.DEV) {
                        console.warn("Failed to resolve NNS Domain via RPC bridge:", domain, e);
                    }
                }

                try {
                    const res = await callWithRpcEndpointFallback(NET_ENV.Mainnet, async (endpoint) => {
                        const rpcClient = new neonRpc.RPCClient(endpoint);
                        return rpcClient.invokeFunction(
                            NNS_CONTRACT_HASH,
                            "resolve",
                            [sc.ContractParam.string(domain), sc.ContractParam.integer(16)]
                        );
                    });
                    
                    if (res.state === "HALT" && res.stack && res.stack.length > 0) {
                      const item = res.stack[0];
                      if (item.type === "ByteString" && item.value) {
                         const decoded = atob(item.value);
                         if (decoded && decoded.length === 34 && decoded.startsWith("N")) {
                            return decoded;
                         }
                      }
                    }
                } catch (e) {
                    if (import.meta.env.DEV) console.warn("Failed to resolve NNS Domain directly via RPC:", domain, e);
                }
                return null;
            },
            CACHE_TTL.chart // Cache for 5 mins locally, backend handles long-term expiration caching
        );
    },

    /**
     * Resolve Matrix Domain to Address string
     * @param {string} domain 
     * @returns {Promise<string|null>} Address if resolved, null otherwise
     */
    async resolveMatrixDomain(domain) {
        if (!domain || !domain.endsWith(MATRIX_SUFFIX)) return null;
        const env = getCurrentEnv();

        const MATRIX_CONTRACT_HASH = env === NET_ENV.TestT5
          ? (import.meta.env.VITE_MATRIX_CONTRACT_HASH_TESTNET || "0x89908093c5ccc463e2c5744d6bacb06108b60a75")
          : (import.meta.env.VITE_MATRIX_CONTRACT_HASH_MAINNET || "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd");

        const key = getCacheKey("matrix_domain_to_address", { domain });
        return cachedRequest(
            key,
            async () => {
                try {
                    const res = await callWithRpcEndpointFallback(env, async (endpoint) => {
                        const rpcClient = new neonRpc.RPCClient(endpoint);
                        return rpcClient.invokeFunction(
                            MATRIX_CONTRACT_HASH,
                            "resolve",
                            [sc.ContractParam.string(domain), sc.ContractParam.integer(16)]
                        );
                    });
                    
                    if (res.state === "HALT" && res.stack && res.stack.length > 0) {
                      const item = res.stack[0];
                      if (item.type === "ByteString" && item.value) {
                         const decoded = atob(item.value);
                         if (decoded && decoded.length === 34 && decoded.startsWith("N")) {
                            return decoded;
                         }
                      }
                    }
                } catch (e) {
                    if (import.meta.env.DEV) console.warn("Failed to resolve Matrix Domain directly via RPC:", domain, e);
                }
                return null;
            },
            CACHE_TTL.chart
        );
    }
};

export default nnsService;
