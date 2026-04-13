import { createClient } from '@supabase/supabase-js'
import { toNetworkMode } from "@/utils/rpcEndpoints";
import { optimizeLogoUrl, resolveCandidateLogoUrl } from "@/utils/logoOptimization";
import { addressToScriptHash, publicKeyToAddress } from "@/utils/neoHelpers";
import { decodeStackItem } from "@/utils/resultDecoder";
import { rpc } from "@/services/api";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a single supabase client for interacting with your database
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// In-memory caches to avoid redundant requests during a session
const contractMetadataCache = new Map();
const addressTagCache = new Map();
const validatorMetadataCache = new Map();

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

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

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
    resolvers.forEach(({ resolve }) => resolve(cached ?? null));
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
// Single server — no fallbacks needed.
const DEFAULT_INDEXER_METADATA_BASE_PATHS = Object.freeze({
  mainnet: ["/data/mainnet"],
  testnet: ["/data/testnet"],
});
const METADATA_FETCH_TIMEOUT_MS = 7000;
const VALIDATOR_METADATA_TTL_MS = 30 * 60 * 1000;
const GOVERNANCE_CANDIDATE_INFO_CONTRACTS = Object.freeze({
  mainnet: "0xb776afb6ad0c11565e70f8ee1dd898da43e51be1",
  testnet: "0x6177bfcef0f51b5dd21b183ff89e301b9c66d71c",
});

const normalizeContractHash = (hash) => {
  const normalized = String(hash || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.startsWith("0x")) return normalized;
  if (normalized.length === 40 || normalized.length === 64) return `0x${normalized}`;
  return normalized;
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
  const contractHash = getGovernanceCandidateContractHash(networkMode);
  if (!contractHash) return [];

  try {
    const result = await rpc("invokefunction", [contractHash, "getAllInfo", []]);
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

const isMissingSupabaseColumnError = (error, column) => {
  const normalizedColumn = String(column || "").trim().toLowerCase();
  if (!normalizedColumn) return false;

  const details = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return Boolean(
    details &&
      details.includes(normalizedColumn) &&
      (details.includes("column") || details.includes("schema") || details.includes("does not exist"))
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

const normalizeSignatureMetadataPayload = (options = {}) => {
  const payload = {};

  if (typeof options.publicKey === "string" && options.publicKey.trim()) {
    payload.public_key = options.publicKey.trim();
  }
  if (typeof options.invocationScript === "string" && options.invocationScript.trim()) {
    payload.invocation_script = options.invocationScript.trim();
  }
  if (typeof options.verificationScript === "string" && options.verificationScript.trim()) {
    payload.verification_script = options.verificationScript.trim();
  }
  if (isPlainObject(options.witness)) {
    payload.witness = options.witness;
  }

  return Object.keys(payload).length > 0 ? payload : null;
};

const mergeRequestSignatureMetadata = (request = {}, signerAddress, metadata) => {
  if (!signerAddress || !metadata) return request?.params || {};

  const currentParams = isPlainObject(request?.params) ? request.params : {};
  const currentSignatureMetadata = isPlainObject(currentParams.signature_metadata)
    ? currentParams.signature_metadata
    : {};
  const existingEntry = isPlainObject(currentSignatureMetadata[signerAddress])
    ? currentSignatureMetadata[signerAddress]
    : {};

  return {
    ...currentParams,
    signature_metadata: {
      ...currentSignatureMetadata,
      [signerAddress]: {
        ...existingEntry,
        ...metadata,
      },
    },
  };
};

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

const attachMultisigSignatures = async (requests = []) => {
  if (!supabase || !Array.isArray(requests) || requests.length === 0) {
    return Array.isArray(requests) ? requests : [];
  }

  const hydratedRequests = await Promise.all(
    requests.map(async (request) => {
      const requestId = Number(request?.id || 0);
      if (!Number.isFinite(requestId) || requestId <= 0) {
        return hydrateRequestSignatures({ ...request, signatures: [] });
      }

      const { data, error } = await supabase
        .from("multisig_signatures")
        .select("*")
        .eq("request_id", requestId);

      if (error) throw error;

      return hydrateRequestSignatures({
        ...request,
        signatures: Array.isArray(data) ? data : [],
      });
    }),
  );

  return hydratedRequests;
};

const fetchMultisigRequestsPlain = async (network, column = "") => {
  let query = supabase.from("multisig_requests").select("*");
  if (column) {
    query = query.eq(column, network);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return attachMultisigSignatures(data || []);
};

const fetchMultisigRequestByIdPlain = async (requestId, network, column = "") => {
  let query = supabase.from("multisig_requests").select("*").eq("id", requestId);
  if (column) {
    query = query.eq(column, network);
  }
  const { data, error } = await query.single();
  if (error) throw error;
  const [hydrated] = await attachMultisigSignatures(data ? [data] : []);
  return hydrated || null;
};

const fetchSupabaseRowsForNetwork = async (queryFactory, network) => {
  for (const column of ["network", "network_mode"]) {
    try {
      const { data, error } = await queryFactory().eq(column, network);
      if (error) throw error;
      return data || [];
    } catch (error) {
      if (!isMissingSupabaseColumnError(error, column)) {
        throw error;
      }
    }
  }

  const { data, error } = await queryFactory();
  if (error) throw error;
  return data || [];
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
      let loadedFromIndexer = false;
      let indexerError = null;
      try {
        const query = `?hashes=${encodeURIComponent(toFetch.join(","))}&limit=${Math.min(
          Math.max(toFetch.length, 1),
          1000
        )}`;
        const payload = await fetchJsonWithTimeoutWithFallback(
          buildIndexerMetadataUrls(network, "contracts", query)
        );
        const rows = Array.isArray(payload?.data) ? payload.data : [];

        toFetch.forEach((hash) => contractMetadataCache.set(`${network}:${hash}`, null));
        rows.forEach((item) => {
          const normalized = normalizeContractMetadata(item);
          if (!normalized) return;
          contractMetadataCache.set(`${network}:${normalized.contract_hash}`, normalized);
        });
        loadedFromIndexer = true;
      } catch (err) {
        indexerError = err;
        if (import.meta.env.DEV) console.warn("Indexer contract metadata fetch failed:", err);
      }

      if (!loadedFromIndexer && supabase && !isTransientIndexerMetadataError(indexerError)) {
        try {
          const data = await fetchSupabaseRowsForNetwork(
            () => supabase
              .from("contract_metadata")
              .select("*")
              .in("contract_hash", toFetch),
            network
          );

          toFetch.forEach((hash) => contractMetadataCache.set(`${network}:${hash}`, null));
          if (data) {
            data.forEach((item) => {
              const normalized = normalizeContractMetadata(item);
              if (!normalized) return;
              contractMetadataCache.set(`${network}:${normalized.contract_hash}`, normalized);
            });
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error("Supabase batch fetch error:", err);
        }
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
      let loadedFromIndexer = false;
      let indexerError = null;
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
        loadedFromIndexer = true;
      } catch (err) {
        indexerError = err;
        if (import.meta.env.DEV) console.warn("Indexer address metadata fetch failed:", err);
      }

      if (!loadedFromIndexer && supabase && !isTransientIndexerMetadataError(indexerError)) {
        try {
          const data = await fetchSupabaseRowsForNetwork(
            () => supabase
              .from("address_tags")
              .select("address, label, category")
              .in("address", toFetch),
            network
          );

          toFetch.forEach((addr) => setAddressTagCacheEntry(network, addr, null));

          if (data) {
            data.forEach((item) => {
              const normalized = normalizeAddressMetadata(item);
              if (!normalized) return;
              setAddressTagCacheEntry(network, normalized.address, normalized);
              const aliases = requestedAliases.get(normalized.address) || [];
              aliases.forEach((alias) => setAddressTagCacheEntry(network, alias, normalized));
            });
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error("Supabase batch tag fetch error:", err);
        }
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
    }
  },

  async getMultisigRequests(networkMode) {
    if (!supabase) return [];
    try {
      const network = getNetworkMode(networkMode);
      return await (async () => {
        for (const column of ["network", "network_mode"]) {
          try {
            const { data, error } = await supabase
              .from('multisig_requests')
              .select('*, signatures:multisig_signatures(*)')
              .eq(column, network)
              .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []).map((request) => hydrateRequestSignatures(request));
          } catch (error) {
            try {
              return await fetchMultisigRequestsPlain(network, column);
            } catch (fallbackError) {
              if (
                isMissingSupabaseColumnError(error, column) ||
                isMissingSupabaseColumnError(fallbackError, column)
              ) {
                continue;
              }
              throw fallbackError;
            }
          }
        }

        try {
          const { data, error } = await supabase
            .from('multisig_requests')
            .select('*, signatures:multisig_signatures(*)')
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data || []).map((request) => hydrateRequestSignatures(request));
        } catch (error) {
          return await fetchMultisigRequestsPlain(network);
        }
      })();
    } catch (err) {
      return [];
    }
  },

  async getMultisigRequestById(requestId, networkMode) {
    if (!supabase || !requestId) return null;
    try {
      const network = getNetworkMode(networkMode);
      return await (async () => {
        for (const column of ["network", "network_mode"]) {
          try {
            const { data, error } = await supabase
              .from("multisig_requests")
              .select("*, signatures:multisig_signatures(*)")
              .eq("id", requestId)
              .eq(column, network)
              .single();
            if (error) throw error;
            return data ? hydrateRequestSignatures(data) : null;
          } catch (error) {
            try {
              return await fetchMultisigRequestByIdPlain(requestId, network, column);
            } catch (fallbackError) {
              if (
                isMissingSupabaseColumnError(error, column) ||
                isMissingSupabaseColumnError(fallbackError, column)
              ) {
                continue;
              }
              throw fallbackError;
            }
          }
        }

        try {
          const { data, error } = await supabase
            .from("multisig_requests")
            .select("*, signatures:multisig_signatures(*)")
            .eq("id", requestId)
            .single();
          if (error) throw error;
          return data ? hydrateRequestSignatures(data) : null;
        } catch (error) {
          return await fetchMultisigRequestByIdPlain(requestId, network);
        }
      })();
    } catch (_err) {
      return null;
    }
  },

  async createMultisigRequest(payload) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const optionalColumns = ["type", "eligible_signers"];
      let currentPayload = { ...payload };

      for (;;) {
        const { data, error } = await supabase
          .from('multisig_requests')
          .insert([currentPayload])
          .select()
          .single();

        if (!error) {
          return { success: true, data };
        }

        const removableColumn = optionalColumns.find((column) =>
          column in currentPayload && isMissingSupabaseColumnError(error, column)
        );

        if (!removableColumn) {
          throw error;
        }

        const nextPayload = { ...currentPayload };
        delete nextPayload[removableColumn];
        currentPayload = nextPayload;
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async addMultisigSignature(requestId, signerAddress, signature, options = {}) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const duplicateQuery = supabase
        .from("multisig_signatures")
        .select("id, signer_address")
        .eq("request_id", requestId)
        .eq("signer_address", signerAddress);

      const duplicateReader =
        typeof duplicateQuery.maybeSingle === "function"
          ? duplicateQuery.maybeSingle.bind(duplicateQuery)
          : duplicateQuery.single?.bind(duplicateQuery);

      if (duplicateReader) {
        const { data: existing, error } = await duplicateReader();
        if (error && !String(error.message || "").toLowerCase().includes("no rows")) {
          throw error;
        }
        if (existing) {
          return { success: false, error: "This council member has already signed the proposal." };
        }
      }

      const basePayload = {
        request_id: requestId,
        signer_address: signerAddress,
        signature,
      };

      const extendedPayload = {
        ...basePayload,
        ...(options.publicKey ? { public_key: options.publicKey } : {}),
        ...(options.witness ? { witness: options.witness } : {}),
        ...(options.invocationScript ? { invocation_script: options.invocationScript } : {}),
        ...(options.verificationScript ? { verification_script: options.verificationScript } : {}),
      };

      const payloads = [extendedPayload, basePayload].filter(
        (payload, index, arr) => index === 0 || JSON.stringify(payload) !== JSON.stringify(arr[0])
      );
      const signatureMetadata = normalizeSignatureMetadataPayload(options);

      let lastError = null;
      for (const payload of payloads) {
        const { data, error } = await supabase
          .from("multisig_signatures")
          .insert([payload])
          .select();

        if (!error) {
          if (signatureMetadata) {
            const { data: requestData, error: requestError } = await supabase
              .from("multisig_requests")
              .select("id, params")
              .eq("id", requestId)
              .single();
            if (requestError) throw requestError;

            const mergedParams = mergeRequestSignatureMetadata(requestData, signerAddress, signatureMetadata);
            const { error: updateError } = await supabase
              .from("multisig_requests")
              .update({ params: mergedParams })
              .eq("id", requestId)
              .select();
            if (updateError) throw updateError;
          }
          return { success: true, data };
        }

        lastError = error;
        const optionalColumns = ["public_key", "witness", "invocation_script", "verification_script"];
        const missingOptionalColumn = optionalColumns.some((column) =>
          isMissingSupabaseColumnError(error, column)
        );
        if (!missingOptionalColumn) {
          throw error;
        }
      }

      throw lastError || new Error("Failed to save signature.");
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async updateMultisigRequestStatus(requestId, status, extras = {}) {
    if (!supabase) return { success: false, error: "Supabase not configured" };
    try {
      const basePayload = {
        status,
        ...(extras.tx_hash ? { tx_hash: extras.tx_hash } : {}),
      };

      const extendedPayload = {
        ...basePayload,
        ...(extras.executed_at ? { executed_at: extras.executed_at } : {}),
        ...(extras.params ? { params: extras.params } : {}),
      };

      const payloads = [extendedPayload, basePayload].filter(
        (payload, index, arr) => index === 0 || JSON.stringify(payload) !== JSON.stringify(arr[0])
      );

      let lastError = null;
      for (const payload of payloads) {
        const { data, error } = await supabase
          .from("multisig_requests")
          .update(payload)
          .eq("id", requestId)
          .select()
          .single();

        if (!error) {
          return { success: true, data };
        }

        lastError = error;
        const optionalColumns = ["executed_at", "params"];
        const missingOptionalColumn = optionalColumns.some((column) =>
          isMissingSupabaseColumnError(error, column)
        );
        if (!missingOptionalColumn) {
          throw error;
        }
      }

      throw lastError || new Error("Failed to update request status.");
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getMempoolTransactions(network, limit = 1000) {
    if (!supabase) return [];
    try {
      const { data } = await supabase
        .from('mempool_transactions')
        .select('*')
        .eq('network', network)
        .order('timestamp', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (err) {
      return [];
    }
  },

  async saveNetworkAlert(alertData) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const { data, error } = await supabase
        .from('network_alerts')
        .insert([alertData]);
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
