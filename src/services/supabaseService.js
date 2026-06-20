import { toNetworkMode } from "@/utils/rpcEndpoints";
import { optimizeLogoUrl, resolveCandidateLogoUrl } from "@/utils/logoOptimization";
import { addressToScriptHash, publicKeyToAddress } from "@/utils/neoHelpers";
import { decodeStackItem } from "@/utils/resultDecoder";
import { rpc } from "@/services/api";
import { sanitizeHttpUrl } from "@/utils/urlSafety";
import { buildMultisigMutationMessage } from "@/utils/multisigMutationAuth";

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

// Deprecated compatibility export. The browser no longer owns direct Supabase table access.
export const supabase = null;

// In-memory caches to avoid redundant requests during a session
const contractMetadataCache = new Map();
const addressTagCache = new Map();
const validatorMetadataCache = new Map();
// In-flight Promise per network so concurrent getValidatorMetadata()
// callers (e.g. 25 HashLink mounts on a list page) coalesce onto a
// single upstream fetch instead of fanning out and racing on the
// initial cache miss.
const validatorMetadataPending = new Map();

// In-flight request dedupe + micro-batching (prevents N+1 fetches from leaf components)
const contractMetadataPending = new Map(); // cacheKey -> Promise<metadata|null>
const addressTagPending = new Map(); // cacheKey -> Promise<metadata|null>
const contractMetadataBatchState = new Map(); // network -> { scheduled: boolean, requests: Map<string, Array<{resolve, reject}>> }
const addressTagBatchState = new Map(); // network -> { scheduled: boolean, requests: Map<string, Array<{resolve, reject}>> }

const scheduleMicrotask = (handler) => {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(handler);
    return;
  }
  Promise.resolve().then(handler);
};

const getOrCreateBatchState = (stateMap, network) => {
  const key = String(network || "").trim().toLowerCase();
  if (!key) return null;
  if (!stateMap.has(key)) {
    stateMap.set(key, { scheduled: false, requests: new Map() });
  }
  return stateMap.get(key);
};

const flushContractMetadataBatch = async (network) => {
  const state = contractMetadataBatchState.get(network);
  if (!state) return;

  const requests = state.requests;
  state.requests = new Map();
  state.scheduled = false;

  const hashes = [...requests.keys()];
  if (!hashes.length) return;

  try {
    await supabaseService.getContractMetadataBatch(hashes, network);
  } catch (_err) {
    // getContractMetadataBatch is expected to swallow errors; keep this as a last-resort guard.
  }

  hashes.forEach((hash) => {
    const cacheKey = `${network}:${hash}`;
    const resolvers = requests.get(hash) || [];
    const cached = contractMetadataCache.get(cacheKey);
    try {
      resolvers.forEach(({ resolve }) => resolve(cached ?? null));
    } catch { /* resolver threw — still clean up pending entry */ }
    contractMetadataPending.delete(cacheKey);
  });
};

const flushAddressTagBatch = async (network) => {
  const state = addressTagBatchState.get(network);
  if (!state) return;

  const requests = state.requests;
  state.requests = new Map();
  state.scheduled = false;

  const addresses = [...requests.keys()];
  if (!addresses.length) return;

  try {
    await supabaseService.getAddressTagsBatch(addresses, network);
  } catch (_err) {
    // getAddressTagsBatch is expected to swallow errors; keep this as a last-resort guard.
  }

  addresses.forEach((addr) => {
    const cacheKey = `${network}:${addr}`;
    const resolvers = requests.get(addr) || [];
    const cached = getAddressTagCacheEntry(network, addr);
    resolvers.forEach(({ resolve }) => resolve(cached ?? null));
    addressTagPending.delete(cacheKey);
  });
};

const INDEXER_METADATA_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_INDEXER_METADATA_BASE_URL || "");
const INDEXER_METADATA_FALLBACK_BASE_URLS = String(
  import.meta.env.VITE_INDEXER_METADATA_FALLBACK_BASE_URLS || "",
)
  .split(",")
  .map(normalizeBaseUrl)
  .filter(Boolean);
const DEFAULT_INDEXER_METADATA_PUBLIC_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_INDEXER_PROXY_TARGET || "https://api.n3index.dev",
);
const USE_PUBLIC_INDEXER_METADATA_BASE_BY_DEFAULT =
  Boolean(import.meta.env.PROD) &&
  String(import.meta.env.VITE_INDEXER_USE_SAME_ORIGIN || "").trim().toLowerCase() !== "true";
// Single server — no fallbacks needed.
const DEFAULT_INDEXER_METADATA_BASE_PATHS = Object.freeze(
  USE_PUBLIC_INDEXER_METADATA_BASE_BY_DEFAULT
    ? {
        mainnet: [`${DEFAULT_INDEXER_METADATA_PUBLIC_BASE_URL}/mainnet`],
        testnet: [`${DEFAULT_INDEXER_METADATA_PUBLIC_BASE_URL}/testnet`],
      }
    : {
        mainnet: ["/data/mainnet"],
        testnet: ["/data/testnet"],
      },
);
const METADATA_FETCH_TIMEOUT_MS = 7000;
const VALIDATOR_METADATA_TTL_MS = 30 * 60 * 1000;
const GOVERNANCE_CANDIDATE_INFO_CONTRACTS = Object.freeze({
  mainnet: "0xb776afb6ad0c11565e70f8ee1dd898da43e51be1",
  testnet: "0x6177bfcef0f51b5dd21b183ff89e301b9c66d71c",
});

const normalizeContractHash = (hash) => {
  const normalized = String(hash || "").trim().toLowerCase();
  if (!normalized) return "";
  // Strip an existing 0x prefix so we can validate the hex payload uniformly.
  const hex = normalized.startsWith("0x") ? normalized.slice(2) : normalized;
  // Only accept actual hex script-hash (20 bytes) or transaction-hash (32 bytes)
  // values. Inputs that look like Neo base58 addresses (34 chars containing
  // non-hex letters like n/y/t/k) used to slip through with a `0x` prefix
  // tacked on, which produced bogus URLs like
  // `?hashes=0xnldypxacypka...` to the contract metadata endpoint and
  // wasted bandwidth on guaranteed-empty lookups.
  if (hex.length !== 40 && hex.length !== 64) return "";
  if (!/^[0-9a-f]+$/.test(hex)) return "";
  return `0x${hex}`;
};

const normalizeAddressKey = (address) => String(address || "").trim();

const normalizeNnsDomain = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const half = raw.length / 2;
  if (Number.isInteger(half) && raw.slice(0, half) === raw.slice(half)) {
    return raw.slice(0, half);
  }
  return raw;
};

const normalizeCandidateLabel = (value) => String(value || "").trim();

const expandAddressLookupKeys = (address) => {
  const normalized = normalizeAddressKey(address);
  if (!normalized) return [];
  const keys = new Set([normalized]);
  const scriptHash = normalizeContractHash(addressToScriptHash(normalized));
  if (scriptHash) keys.add(scriptHash);
  return [...keys];
};

const getGovernanceCandidateContractHash = (networkMode) =>
  GOVERNANCE_CANDIDATE_INFO_CONTRACTS[getNetworkMode(networkMode)] || "";

const decodeGovernanceCandidateInfoRow = (entry = {}) => {
  const fields = Array.isArray(entry?.value) ? entry.value : [];
  if (fields.length < 10) return null;

  const addressValue = normalizeAddressKey(decodeStackItem(fields[0])?.value || "");
  if (!addressValue) return null;

  const displayName = normalizeCandidateLabel(decodeStackItem(fields[1])?.value || "");
  const iconValue = normalizeCandidateLabel(decodeStackItem(fields[9])?.value || "");
  const resolvedLogo = resolveCandidateLogoUrl(iconValue);

  return {
    address: addressValue,
    scripthash: normalizeContractHash(addressToScriptHash(addressValue)),
    display_name: displayName,
    name: displayName,
    logo_url: resolvedLogo,
    logo: resolvedLogo,
    logoUrl: resolvedLogo,
    location: normalizeCandidateLabel(decodeStackItem(fields[2])?.value || ""),
    website: normalizeCandidateLabel(decodeStackItem(fields[3])?.value || ""),
    email: normalizeCandidateLabel(decodeStackItem(fields[4])?.value || ""),
    github: normalizeCandidateLabel(decodeStackItem(fields[5])?.value || ""),
    telegram: normalizeCandidateLabel(decodeStackItem(fields[6])?.value || ""),
    twitter: normalizeCandidateLabel(decodeStackItem(fields[7])?.value || ""),
    description: normalizeCandidateLabel(decodeStackItem(fields[8])?.value || ""),
  };
};

const buildGovernanceCandidateMap = (rows = []) => {
  const map = new Map();

  for (const item of Array.isArray(rows) ? rows : []) {
    const address = normalizeAddressKey(item?.address || item?.scripthash);
    for (const key of expandAddressLookupKeys(address)) {
      map.set(key, item);
    }
  }

  return map;
};

const mergeValidatorMetadataWithGovernanceCandidates = (rows = [], governanceRows = []) => {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const governanceMap = buildGovernanceCandidateMap(governanceRows);
  const matchedGovernanceKeys = new Set();

  const mergedRows = normalizedRows.map((item) => {
    const lookupKeys = new Set([
      ...expandAddressLookupKeys(item?.address || item?.scripthash),
      ...expandAddressLookupKeys(publicKeyToAddress(item?.pubkey || item?.public_key || item?.publicKey || "")),
    ]);

    let governanceMatch = null;
    for (const key of lookupKeys) {
      governanceMatch = governanceMap.get(key) || null;
      if (governanceMatch) {
        matchedGovernanceKeys.add(normalizeAddressKey(governanceMatch.address || governanceMatch.scripthash));
        break;
      }
    }

    if (!governanceMatch) return item;

    const governanceLogo = String(
      governanceMatch.logo_url || governanceMatch.logoUrl || governanceMatch.logo || ""
    ).trim();
    const governanceName = normalizeCandidateLabel(
      governanceMatch.display_name || governanceMatch.name || ""
    );

    return {
      ...item,
      ...(governanceName && !normalizeCandidateLabel(item.display_name || item.name)
        ? {
            name: governanceName,
            display_name: governanceName,
          }
        : {}),
      ...(governanceLogo
        ? {
            logo: governanceLogo,
            logo_url: governanceLogo,
            logoUrl: governanceLogo,
          }
        : {}),
      ...(!item.location && governanceMatch.location ? { location: governanceMatch.location } : {}),
      ...(!item.description && governanceMatch.description ? { description: governanceMatch.description } : {}),
    };
  });

  const unmatchedGovernanceRows = governanceRows.filter((item) => {
    const key = normalizeAddressKey(item?.address || item?.scripthash);
    return key && !matchedGovernanceKeys.has(key);
  });

  return [...mergedRows, ...unmatchedGovernanceRows];
};

const fetchGovernanceCandidateMetadata = async (networkMode) => {
  const network = getNetworkMode(networkMode);
  const contractHash = getGovernanceCandidateContractHash(network);
  if (!contractHash) return [];

  try {
    const result = await rpc("invokefunction", [contractHash, "getAllInfo", []], { network });
    const rows = Array.isArray(result?.stack?.[0]?.value) ? result.stack[0].value : [];
    return rows.map((item) => decodeGovernanceCandidateInfoRow(item)).filter(Boolean);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Governance candidate metadata fetch failed:", err);
    return [];
  }
};

const getNetworkMode = (networkMode) => toNetworkMode(networkMode);

const getIndexerMetadataBaseUrls = (network) => {
  const configuredBaseUrls = [
    INDEXER_METADATA_BASE_URL ? `${INDEXER_METADATA_BASE_URL}/${network}` : "",
    ...INDEXER_METADATA_FALLBACK_BASE_URLS.map((baseUrl) => `${baseUrl}/${network}`),
  ].filter(Boolean);

  if (configuredBaseUrls.length > 0) {
    return configuredBaseUrls;
  }

  return DEFAULT_INDEXER_METADATA_BASE_PATHS[network] || DEFAULT_INDEXER_METADATA_BASE_PATHS.mainnet;
};

const buildIndexerMetadataUrls = (network, resource, query = "") => {
  return getIndexerMetadataBaseUrls(network).map(
    (baseUrl) => `${baseUrl}/metadata/${resource}${query}`
  );
};

const fetchJsonWithTimeout = async (url, timeoutMs = METADATA_FETCH_TIMEOUT_MS) => {
  if (typeof fetch !== "function") {
    throw new Error("fetch unavailable");
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new Error(`metadata fetch failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const fetchJsonWithTimeoutWithFallback = async (urls, timeoutMs = METADATA_FETCH_TIMEOUT_MS) => {
  let lastError = null;
  for (const url of urls.filter(Boolean)) {
    try {
      return await fetchJsonWithTimeout(url, timeoutMs);
    } catch (err) {
      lastError = err;
      // try next source
    }
  }
  if (lastError && isTransientIndexerMetadataError(lastError)) {
    throw lastError;
  }
  throw lastError || new Error("metadata fetch failed");
};

const normalizeContractMetadata = (item = {}) => {
  const contractHash = normalizeContractHash(item.contract_hash || item.contractHash || item.hash);
  if (!contractHash) return null;

  const displayName = String(item.display_name || item.name || "").trim();
  const symbol = String(item.symbol || "").trim();

  return {
    ...item,
    contract_hash: contractHash,
    display_name: displayName,
    name: displayName || symbol || contractHash,
    symbol,
    website: sanitizeHttpUrl(item.website || item.url || ""),
    logo_url: optimizeLogoUrl(item.logo_url || item.logo || "", { kind: "contract" }),
    is_verified: Boolean(item.is_verified),
  };
};

const normalizeAddressMetadata = (item = {}) => {
  const address = normalizeAddressKey(item.address);
  if (!address) return null;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const nnsDomain = normalizeNnsDomain(item.nns_domain || item.nnsDomain);
  let nnsExpirationMS = Number(
    item.nns_expiration_ms ?? item.nnsExpirationMS ?? item.nns_expiration ?? item.nnsExpiration ?? 0
  );
  if (Number.isFinite(nnsExpirationMS) && nnsExpirationMS > 0 && nnsExpirationMS < 1_000_000_000_000) {
    nnsExpirationMS *= 1000;
  }
  if (!Number.isFinite(nnsExpirationMS) || nnsExpirationMS <= 0) {
    nnsExpirationMS = 0;
  }
  // Matrix domains have expiration_ms=0 (permanent). Treat 0 as non-expiring.
  const hasActiveNNS = Boolean(nnsDomain) && (nnsExpirationMS === 0 || nnsExpirationMS > Date.now());

  return {
    ...item,
    address,
    label: item.label || item.display_name || address,
    display_name: item.display_name || item.label || address,
    category: item.category || tags[0] || item.source || null,
    tags,
    nns_domain: nnsDomain,
    nns_expiration_ms: nnsExpirationMS || null,
    has_active_nns: hasActiveNNS,
    logo_url: optimizeLogoUrl(item.logo_url || item.logo || "", { kind: "user" }),
  };
};

const setAddressTagCacheEntry = (network, address, value) => {
  const normalized = normalizeAddressKey(address);
  if (!normalized) return;
  const keys = new Set([normalized, normalized.toLowerCase()]);
  keys.forEach((key) => {
    addressTagCache.set(`${network}:${key}`, value);
  });
};

const getAddressTagCacheEntry = (network, address) => {
  const normalized = normalizeAddressKey(address);
  if (!normalized) return undefined;
  return (
    addressTagCache.get(`${network}:${normalized}`) ??
    addressTagCache.get(`${network}:${normalized.toLowerCase()}`)
  );
};

function isTransientIndexerMetadataError(error) {
  const details = [error?.name, error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return Boolean(
    details &&
      (details.includes("abort") ||
        details.includes("signal is aborted") ||
        details.includes("network changed") ||
        details.includes("err_network_changed") ||
        details.includes("err_canceled"))
  );
}

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hydrateRequestSignatures = (request) => {
  if (!isPlainObject(request)) return request;

  const signatureMetadata = isPlainObject(request?.params?.signature_metadata)
    ? request.params.signature_metadata
    : {};
  const signatures = Array.isArray(request.signatures) ? request.signatures : [];

  if (!signatures.length || !Object.keys(signatureMetadata).length) {
    return request;
  }

  const hydratedSignatures = signatures.map((signature) => {
    const signerAddress = String(signature?.signer_address || "").trim();
    const metadata = isPlainObject(signatureMetadata[signerAddress])
      ? signatureMetadata[signerAddress]
      : null;

    if (!metadata) return signature;

    return {
      ...signature,
      public_key: signature.public_key ?? metadata.public_key ?? null,
      invocation_script: signature.invocation_script ?? metadata.invocation_script,
      verification_script: signature.verification_script ?? metadata.verification_script,
      witness: signature.witness ?? metadata.witness,
    };
  });

  return {
    ...request,
    signatures: hydratedSignatures,
  };
};

const buildMultisigMutationMetadata = (extras = {}) => {
  const hasExplicitMetadata = extras.metadata !== undefined;
  const witness = extras.broadcast_witness ?? extras.params?.broadcast_witness;

  if (witness === undefined) {
    return hasExplicitMetadata ? extras.metadata : undefined;
  }

  const base = isPlainObject(extras.metadata) ? { ...extras.metadata } : {};
  return {
    ...base,
    broadcast_witness: witness,
  };
};

const buildMultisigMutationAuth = async ({
  requestId,
  status,
  signerAddress,
  network,
  broadcastTxHash,
  broadcastAt,
  metadata,
  extras = {},
}) => {
  if (extras.mutation_signature || extras.signature) {
    return {
      mutation_signature: extras.mutation_signature || extras.signature,
      ...(extras.mutation_public_key || extras.public_key
        ? { mutation_public_key: extras.mutation_public_key || extras.public_key }
        : {}),
    };
  }

  const normalizedSigner = String(signerAddress || "").trim();
  if (!normalizedSigner) return {};

  const mutationMessage = buildMultisigMutationMessage({
    requestId,
    network: getNetworkMode(network || extras.network || "mainnet"),
    status: status || "",
    broadcastTxHash: broadcastTxHash || "",
    broadcastAt: broadcastAt || "",
    metadata,
  });

  const { walletService } = await import("@/services/walletService");
  if (typeof walletService?.signMessage !== "function") {
    throw new Error("Connected wallet cannot sign multisig mutation messages.");
  }

  const signed = await walletService.signMessage(mutationMessage);
  const signature = signed?.signature || signed?.data || "";
  if (!signature) {
    throw new Error("Wallet did not return a mutation signature.");
  }

  let publicKey = signed?.publicKey || signed?.public_key || "";
  if (!publicKey && typeof walletService.getPublicKey === "function") {
    publicKey = await walletService.getPublicKey().catch(() => "");
  }

  return {
    mutation_signature: signature,
    ...(publicKey ? { mutation_public_key: publicKey } : {}),
  };
};

export const supabaseService = {
  async getContractMetadata(hash, networkMode) {
    if (!hash) return null;
    const normalizedHash = normalizeContractHash(hash);
    if (!normalizedHash) return null;
    const network = getNetworkMode(networkMode);
    const cacheKey = `${network}:${normalizedHash}`;

    if (contractMetadataCache.has(cacheKey)) {
      return contractMetadataCache.get(cacheKey);
    }

    if (contractMetadataPending.has(cacheKey)) {
      return contractMetadataPending.get(cacheKey);
    }

    const state = getOrCreateBatchState(contractMetadataBatchState, network);
    if (!state) return null;

    const promise = new Promise((resolve, reject) => {
      const existing = state.requests.get(normalizedHash) || [];
      existing.push({ resolve, reject });
      state.requests.set(normalizedHash, existing);
    });

    contractMetadataPending.set(cacheKey, promise);

    if (!state.scheduled) {
      state.scheduled = true;
      scheduleMicrotask(() => flushContractMetadataBatch(network));
    }

    return promise;
  },

  async getContractMetadataBatch(hashes, networkMode) {
    if (!hashes || !hashes.length) return {};
    const network = getNetworkMode(networkMode);
    const normalizedHashes = [
      ...new Set(hashes.map((h) => normalizeContractHash(h)).filter(Boolean)),
    ];
    const toFetch = normalizedHashes.filter((hash) => !contractMetadataCache.has(`${network}:${hash}`));

    if (toFetch.length > 0) {
      try {
        const query = `?hashes=${encodeURIComponent(toFetch.join(","))}&limit=${Math.min(
          Math.max(toFetch.length, 1),
          1000
        )}`;
        const payload = await fetchJsonWithTimeoutWithFallback(
          buildIndexerMetadataUrls(network, "contracts", query)
        );
        const rows = Array.isArray(payload?.data) ? payload.data : [];

        // Cache null only for hashes the indexer confirmed are missing — separating
        // "not in DB" (legitimate negative cache) from "fetch failed" (transient,
        // must not poison the cache) so a single network blip does not blank metadata.
        toFetch.forEach((hash) => contractMetadataCache.set(`${network}:${hash}`, null));
        rows.forEach((item) => {
          const normalized = normalizeContractMetadata(item);
          if (!normalized) return;
          contractMetadataCache.set(`${network}:${normalized.contract_hash}`, normalized);
        });
      } catch (err) {
        if (import.meta.env.DEV) console.warn("Indexer contract metadata fetch failed:", err);
      }
    }

    const result = {};
    normalizedHashes.forEach((hash) => {
      const cached = contractMetadataCache.get(`${network}:${hash}`);
      if (cached) {
        result[hash] = cached;
      }
    });

    return result;
  },

  async getAddressTag(address, networkMode) {
    if (!address) return null;
    const network = getNetworkMode(networkMode);
    const normalizedAddr = normalizeAddressKey(address);

    const cached = getAddressTagCacheEntry(network, normalizedAddr);
    if (cached !== undefined) {
      return cached;
    }

    const cacheKey = `${network}:${normalizedAddr}`;
    if (addressTagPending.has(cacheKey)) {
      return addressTagPending.get(cacheKey);
    }

    const state = getOrCreateBatchState(addressTagBatchState, network);
    if (!state) return null;

    const promise = new Promise((resolve, reject) => {
      const existing = state.requests.get(normalizedAddr) || [];
      existing.push({ resolve, reject });
      state.requests.set(normalizedAddr, existing);
    });

    addressTagPending.set(cacheKey, promise);

    if (!state.scheduled) {
      state.scheduled = true;
      scheduleMicrotask(() => flushAddressTagBatch(network));
    }

    return promise;
  },
  
  async getAddressTagsBatch(addresses, networkMode) {
    if (!addresses || !addresses.length) return {};
    const network = getNetworkMode(networkMode);
    const uniqueAddrs = [...new Set(addresses.map((a) => normalizeAddressKey(a)).filter(Boolean))];
    const requestedAliases = new Map();
    const expandedAddresses = [];
    for (const addr of uniqueAddrs) {
      const aliases = expandAddressLookupKeys(addr);
      for (const alias of aliases) {
        expandedAddresses.push(alias);
        const items = requestedAliases.get(alias) || [];
        items.push(addr);
        requestedAliases.set(alias, items);
      }
    }
    const queryAddresses = [...new Set(expandedAddresses)];
    const toFetch = queryAddresses.filter((addr) => getAddressTagCacheEntry(network, addr) === undefined);

    if (toFetch.length > 0) {
      try {
        const query = `?addresses=${encodeURIComponent(toFetch.join(","))}&limit=${Math.min(
          Math.max(toFetch.length, 1),
          1000
        )}`;
        const payload = await fetchJsonWithTimeoutWithFallback(
          buildIndexerMetadataUrls(network, "addresses", query)
        );
        const rows = Array.isArray(payload?.data) ? payload.data : [];

        toFetch.forEach((addr) => setAddressTagCacheEntry(network, addr, null));
        rows.forEach((item) => {
          const normalized = normalizeAddressMetadata(item);
          if (!normalized) return;
          setAddressTagCacheEntry(network, normalized.address, normalized);
          const aliases = requestedAliases.get(normalized.address) || [];
          aliases.forEach((alias) => setAddressTagCacheEntry(network, alias, normalized));
        });
      } catch (err) {
        // Do not poison the cache on transient fetch failures; only the success
        // branch above caches null for confirmed-missing addresses.
        if (import.meta.env.DEV) console.warn("Indexer address metadata fetch failed:", err);
      }
    }

    const result = {};
    uniqueAddrs.forEach((addr) => {
      const cached = getAddressTagCacheEntry(network, addr);
      if (cached) {
        result[addr] = cached;
      }
    });

    return result;
  },

  async getValidatorMetadata(networkMode) {
    const network = getNetworkMode(networkMode);
    const cached = validatorMetadataCache.get(network);
    if (cached && Date.now() - cached.timestamp < VALIDATOR_METADATA_TTL_MS) {
      return cached.data;
    }

    // Coalesce concurrent callers onto a single upstream fetch. Without
    // this, a 25-row list page where each HashLink mounts and calls
    // getValidatorMetadata produces 25 simultaneous fetches.
    const pending = validatorMetadataPending.get(network);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const [payload, governanceRows] = await Promise.all([
          fetchJsonWithTimeoutWithFallback(buildIndexerMetadataUrls(network, "validators")),
          fetchGovernanceCandidateMetadata(network),
        ]);
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        const normalized = rows
          .map((item) => {
            const pubkey = String(item.public_key || item.pubkey || item.publicKey || "").trim();
            if (!pubkey) return null;
            const logo = optimizeLogoUrl(item.logo_url || item.logo || "", { kind: "validator" });
            return {
              ...item,
              pubkey,
              public_key: pubkey,
              name: String(item.display_name || item.name || "").trim(),
              display_name: String(item.display_name || item.name || "").trim(),
              scripthash: String(item.address || item.scripthash || "").trim(),
              logo,
              logo_url: logo,
              logoUrl: logo,
            };
          })
          .filter(Boolean);

        const merged = mergeValidatorMetadataWithGovernanceCandidates(normalized, governanceRows);
        validatorMetadataCache.set(network, { timestamp: Date.now(), data: merged });
        return merged;
      } catch (err) {
        if (import.meta.env.DEV) console.warn("Indexer validator metadata fetch failed:", err);
        const governanceRows = await fetchGovernanceCandidateMetadata(network);
        validatorMetadataCache.set(network, { timestamp: Date.now(), data: governanceRows });
        return governanceRows;
      } finally {
        validatorMetadataPending.delete(network);
      }
    })();

    validatorMetadataPending.set(network, promise);
    return promise;
  },

  async getMultisigRequests(networkMode) {
    try {
      const network = getNetworkMode(networkMode);
      const url = new URL("/api/multisig/requests", window.location.origin);
      if (network) url.searchParams.set("network", network);
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return (rows || []).map((request) => hydrateRequestSignatures(request));
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[supabaseService] getMultisigRequests failed:", err);
      return [];
    }
  },

  async getMultisigRequestById(requestId, networkMode) {
    if (!requestId) return null;
    try {
      const network = getNetworkMode(networkMode);
      const url = new URL(`/api/multisig/requests/${requestId}`, window.location.origin);
      if (network) url.searchParams.set("network", network);
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(await res.text());
      }
      const data = await res.json();
      return data ? hydrateRequestSignatures(data) : null;
    } catch (_err) {
      return null;
    }
  },

  async createMultisigRequest(payload) {
    try {
      const res = await fetch("/api/multisig/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async addMultisigSignature(requestId, signerAddress, signature, options = {}) {
    try {
      const body = {
        request_id: requestId,
        signer_address: signerAddress,
        signature,
        overwrite: options.overwrite || false,
        ...(options.publicKey ? { public_key: options.publicKey } : {}),
        ...(options.witness ? { witness: options.witness } : {}),
        ...(options.invocationScript ? { invocation_script: options.invocationScript } : {}),
        ...(options.verificationScript ? { verification_script: options.verificationScript } : {}),
      };
      const res = await fetch("/api/multisig/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409) {
          return { success: false, error: "This council member has already signed the proposal.", isDuplicate: true };
        }
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return { success: true, data: [data] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async updateMultisigRequestStatus(requestId, status, extras = {}) {
    try {
      const txHash = extras.tx_hash || "";
      const broadcastAt = extras.executed_at || "";
      const metadata = buildMultisigMutationMetadata(extras);
      const body = {
        status,
        signer_address: extras.signer_address || "",
        ...(txHash ? { broadcast_tx_hash: txHash } : {}),
        ...(broadcastAt ? { broadcast_at: broadcastAt } : {}),
        ...(metadata !== undefined ? { metadata } : {}),
      };
      Object.assign(body, await buildMultisigMutationAuth({
        requestId,
        status,
        signerAddress: body.signer_address,
        network: extras.network,
        broadcastTxHash: txHash,
        broadcastAt,
        metadata,
        extras,
      }));
      const res = await fetch(`/api/multisig/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getMempoolTransactions(network, limit = 1000) {
    try {
      const params = new URLSearchParams({
        network: getNetworkMode(network),
        limit: String(Math.min(Math.max(Number(limit) || 1000, 1), 1000)),
      });
      const res = await fetch(`/api/mempool?${params.toString()}`);
      if (!res.ok) return [];
      const payload = await res.json().catch(() => ({}));
      return Array.isArray(payload.data) ? payload.data : [];
    } catch {
      return [];
    }
  },

  async saveNetworkAlert(alertData) {
    try {
      const res = await fetch("/api/network_alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertData || {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
