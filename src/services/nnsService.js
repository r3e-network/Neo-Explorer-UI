import { safeRpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { getCurrentEnv, NET_ENV } from "../utils/env";
import { callWithRpcEndpointFallback } from "@/utils/rpcEndpoints";
import { supabaseService } from "@/services/supabaseService";
import { normalizeHash160 } from "@/utils/walletNormalization";
import { NNS_HASH } from "@/constants";
import { addressToScriptHash, reverseHex, scriptHashToAddress } from "@/utils/neoHelpers";

const NNS_CONTRACT_HASH = NNS_HASH; // Mainnet
const NNS_SUFFIX = ".neo";
const MATRIX_SUFFIX = ".matrix";
const loadSdk = () => import("@cityofzion/neon-js").then(m => m.rpc ? m : m.default);

const getMatrixContractHash = (env = getCurrentEnv()) =>
  env === NET_ENV.TestT5
    ? import.meta.env.VITE_MATRIX_CONTRACT_HASH_TESTNET || "0x89908093c5ccc463e2c5744d6bacb06108b60a75"
    : import.meta.env.VITE_MATRIX_CONTRACT_HASH_MAINNET || "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd";

const normalizeDomainName = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "";
  const half = raw.length / 2;
  if (Number.isInteger(half) && raw.slice(0, half) === raw.slice(half)) {
    return raw.slice(0, half);
  }
  return raw;
};

const normalizeHash160WithPrefix = (value) => {
  const normalized = String(normalizeHash160(value) || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "";
  if (/^0x[0-9a-f]{40}$/.test(normalized)) return normalized;
  if (/^[0-9a-f]{40}$/.test(normalized)) return `0x${normalized}`;
  return "";
};

const normalizeHashLookupValue = (value) => {
  const hash = normalizeHash160WithPrefix(value);
  if (hash) return hash;
  return String(value || "")
    .trim()
    .toLowerCase();
};

const extractResolvedTarget = (value) => {
  const text = String(value || "").trim();
  if (text.length === 34 && text.startsWith("N")) {
    return text;
  }

  const hash = normalizeHash160WithPrefix(value);
  if (hash) return hash;
  return null;
};

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

const decodeBooleanStackItem = (item) => {
  if (!item || typeof item !== "object") return false;
  if (item.type !== "Boolean") return false;
  return item.value === true || item.value === "true";
};

const decodeUtf8Base64 = (value) => {
  try {
    return atob(String(value || ""));
  } catch {
    return "";
  }
};

const decodeHash160Address = (value) => {
  try {
    const raw = atob(String(value || ""));
    if (!raw) return null;
    const hex = Array.from(raw)
      .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("");
    return scriptHashToAddress(reverseHex(hex));
  } catch {
    return null;
  }
};

const decodePropertiesMap = (stackItem) => {
  const entries = Array.isArray(stackItem?.value) ? stackItem.value : [];
  const out = {};
  for (const entry of entries) {
    const key = decodeUtf8Base64(entry?.key?.value);
    if (!key) continue;
    const value = entry?.value?.value;
    if (key === "admin") {
      out.admin = decodeHash160Address(value);
      continue;
    }
    out[key] = decodeUtf8Base64(value);
  }
  return out;
};

const invokeContract = async (env, contractHash, operation, args = []) => {
  return callWithRpcEndpointFallback(env, async (endpoint) => {
    const { RpcClient } = await loadSdk();
    const rpcClient = new RpcClient(endpoint);
    return rpcClient.invokeFunction({ contractHash, method: operation, args });
  });
};

const getDomainSuffix = (name) => {
  if (name.endsWith(MATRIX_SUFFIX)) return MATRIX_SUFFIX;
  if (name.endsWith(NNS_SUFFIX)) return NNS_SUFFIX;
  return "";
};

const toDomainCandidate = (name) => {
  const normalizedName = normalizeDomainName(name);
  const suffix = getDomainSuffix(normalizedName);
  if (!normalizedName || !suffix) return null;

  return {
    name: normalizedName,
    suffix,
    label: normalizedName.slice(0, normalizedName.length - suffix.length),
  };
};

const collectActiveDomains = (domains = [], suffix = NNS_SUFFIX) => {
  const now = Date.now();
  const candidates = [];

  for (const domain of domains) {
    const candidate = toDomainCandidate(domain?.name);
    if (!candidate || candidate.suffix !== suffix) continue;

    if (suffix === MATRIX_SUFFIX) {
      candidates.push(candidate);
    } else {
      const expirationMs = normalizeExpirationMs(domain);
      if (!Number.isFinite(expirationMs) || expirationMs <= now) continue;
      candidates.push(candidate);
    }
  }

  return candidates;
};

const compareDomainCandidates = (left, right) => {
  const labelLengthDiff = left.label.length - right.label.length;
  if (labelLengthDiff !== 0) return labelLengthDiff;

  const labelDiff = left.label.localeCompare(right.label);
  if (labelDiff !== 0) return labelDiff;

  const suffixPriority = left.suffix === right.suffix ? 0 : left.suffix === MATRIX_SUFFIX ? -1 : 1;
  if (suffixPriority !== 0) return suffixPriority;

  return left.name.localeCompare(right.name);
};

const pickPreferredDomain = (domains = []) => {
  const deduped = new Map();
  for (const domain of domains) {
    if (!domain?.name) continue;
    if (!deduped.has(domain.name)) {
      deduped.set(domain.name, domain);
    }
  }

  const candidates = Array.from(deduped.values());
  if (!candidates.length) return null;

  candidates.sort(compareDomainCandidates);
  return candidates[0];
};

const getActiveDomainFromMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") return null;
  const name = normalizeDomainName(metadata.nns_domain || metadata.nnsDomain);

  if (name.endsWith(MATRIX_SUFFIX)) return name;

  if (!name || !name.endsWith(NNS_SUFFIX)) return null;
  let expirationMs = Number(
    metadata.nns_expiration_ms ?? metadata.nnsExpirationMS ?? metadata.nns_expiration ?? metadata.nnsExpiration ?? 0,
  );
  if (Number.isFinite(expirationMs) && expirationMs > 0 && expirationMs < 1_000_000_000_000) {
    expirationMs *= 1000;
  }
  if (!Number.isFinite(expirationMs) || expirationMs <= Date.now()) return null;
  return name;
};

export const nnsService = {
  async getMatrixDomainProfile(domain) {
    const normalizedDomain = normalizeDomainName(domain);
    if (!normalizedDomain.endsWith(MATRIX_SUFFIX)) return null;

    const env = getCurrentEnv();
    const contractHash = getMatrixContractHash(env);

    const availability = await invokeContract(env, contractHash, "isAvailable", [
      { type: "String", value: normalizedDomain },
    ]);
    const available = decodeBooleanStackItem(availability?.stack?.[0]);
    if (available) {
      return {
        domain: normalizedDomain,
        available: true,
        owner: null,
        admin: null,
        resolvedAddress: null,
      };
    }

    const tokenId = btoa(normalizedDomain);
    const [ownerRes, propertiesRes, resolvedAddress] = await Promise.all([
      invokeContract(env, contractHash, "ownerOf", [{ type: "ByteArray", value: tokenId }]).catch(() => null),
      invokeContract(env, contractHash, "properties", [{ type: "ByteArray", value: tokenId }]).catch(() => null),
      this.resolveMatrixDomain(normalizedDomain),
    ]);

    const owner = decodeHash160Address(ownerRes?.stack?.[0]?.value);
    const properties = decodePropertiesMap(propertiesRes?.stack?.[0]);

    return {
      domain: normalizedDomain,
      available: false,
      owner,
      admin: properties.admin || null,
      resolvedAddress: resolvedAddress || null,
    };
  },

  /**
   * Resolve an address to a Name Service profile (NNS domain name)
   * @param {string} address The base58 NEO address
   * @returns {Promise<{ nns: string } | null>}
   */
  async resolveAddressToNNS(address) {
    if (!address) return null;
    const target = String(address || "").trim();
    if (!target) return null;
    const env = getCurrentEnv();
    const normalizedHash = normalizeHash160WithPrefix(target);
    const lookupTargets = [...new Set([target, normalizedHash].filter(Boolean))];

    const key = getCacheKey("nns_address_to_name", { address: target });
    return cachedRequest(
      key,
      async () => {
        const candidates = [];

        for (const lookupTarget of lookupTargets) {
          try {
            const metadata = await supabaseService.getAddressTag(lookupTarget, env);
            const cachedDomain = getActiveDomainFromMetadata(metadata);
            if (cachedDomain) {
              const metadataCandidate = toDomainCandidate(cachedDomain);
              if (metadataCandidate) candidates.push(metadataCandidate);
            }
          } catch (metadataErr) {
            if (import.meta.env.DEV) console.warn("[nnsService] metadata read failed:", metadataErr);
          }
        }

        if (env === NET_ENV.Mainnet) {
          for (const lookupTarget of lookupTargets) {
            try {
              const result = await safeRpc(
                "GetNNSNameByOwner",
                {
                  Asset: NNS_CONTRACT_HASH,
                  Owner: lookupTarget,
                },
                [],
              );

              if (Array.isArray(result) && result.length > 0) {
                candidates.push(...collectActiveDomains(result, NNS_SUFFIX));
              }
            } catch (e) {
              if (import.meta.env.DEV) console.warn("Failed to resolve NNS profile for address:", lookupTarget, e);
            }
          }

          if (normalizedHash) {
            try {
              const adminDomains = await safeRpc(
                "GetNNSNameByAdmin",
                {
                  Asset: NNS_CONTRACT_HASH,
                  Admin: normalizedHash,
                },
                [],
              );

              if (Array.isArray(adminDomains) && adminDomains.length > 0) {
                candidates.push(...collectActiveDomains(adminDomains, NNS_SUFFIX));
              }
            } catch (e) {
              if (import.meta.env.DEV) console.warn("Failed to resolve NNS profile by admin:", normalizedHash, e);
            }
          }
        }

        try {
          const scriptHash = normalizedHash || normalizeHashLookupValue(addressToScriptHash(target));
          if (!scriptHash) return null;
          const transfersRes = await safeRpc("GetNep11TransferByAddress", { Address: scriptHash, Limit: 100 }, null);

          if (transfersRes && Array.isArray(transfersRes.result)) {
            const matrixContractHash = String(getMatrixContractHash(env)).toLowerCase();
            const matrixTransfers = transfersRes.result.filter(
              (t) => String(t.contract || "").toLowerCase() === matrixContractHash,
            );

            const tokenBalances = {};
            for (const t of matrixTransfers) {
              if (!t.tokenId) continue;
              if (!tokenBalances[t.tokenId]) tokenBalances[t.tokenId] = 0;
              if (normalizeHashLookupValue(t.to) === scriptHash) tokenBalances[t.tokenId]++;
              if (normalizeHashLookupValue(t.from) === scriptHash) tokenBalances[t.tokenId]--;
            }

            const ownedTokens = Object.entries(tokenBalances)
              .filter(([_, bal]) => bal > 0)
              .map(([id]) => id);

            if (ownedTokens.length > 0) {
              const domains = [];
              for (const b64Id of ownedTokens) {
                try {
                  const decoded = atob(b64Id);
                  if (decoded.endsWith(MATRIX_SUFFIX)) domains.push({ name: decoded });
                } catch (e) {
                  // Invalid base64 or other decode error, skip
                }
              }

              candidates.push(...collectActiveDomains(domains, MATRIX_SUFFIX));
            }
          }
        } catch (matrixErr) {
          if (import.meta.env.DEV) console.warn("Matrix fallback failed:", matrixErr);
        }

        const preferredDomain = pickPreferredDomain(candidates);
        return preferredDomain?.name ? { nns: preferredDomain.name } : null;
      },
      CACHE_TTL.chart, // Cache for 5 mins
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
      }),
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
          const { RpcClient } = await loadSdk();
          const res = await callWithRpcEndpointFallback(NET_ENV.Mainnet, async (endpoint) => {
            const rpcClient = new RpcClient(endpoint);
            return rpcClient.invokeFunction({
              contractHash: NNS_CONTRACT_HASH,
              method: "resolve",
              args: [
                { type: "String", value: domain },
                { type: "Integer", value: 16 },
              ],
            });
          });

          if (res.state === "HALT" && res.stack && res.stack.length > 0) {
            const item = res.stack[0];
            if (item.type === "ByteString" && item.value) {
              const decoded = atob(item.value);
              const resolvedTarget = extractResolvedTarget(decoded);
              if (resolvedTarget) {
                return resolvedTarget;
              }
            }
          }
        } catch (e) {
          if (import.meta.env.DEV) console.warn("Failed to resolve NNS Domain via native RPC:", domain, e);
        }
        return null;
      },
      CACHE_TTL.chart, // Cache for 5 mins locally, backend handles long-term expiration caching
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

    const MATRIX_CONTRACT_HASH = getMatrixContractHash(env);

    const key = getCacheKey("matrix_domain_to_address", { domain });
    return cachedRequest(
      key,
      async () => {
        try {
          const res = await invokeContract(env, MATRIX_CONTRACT_HASH, "resolve", [
            { type: "String", value: domain },
            { type: "Integer", value: 16 },
          ]);

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
      CACHE_TTL.chart,
    );
  },
};

export default nnsService;
