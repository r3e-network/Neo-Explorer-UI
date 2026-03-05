import { createClient } from '@supabase/supabase-js'
import { toNetworkMode } from "@/utils/rpcEndpoints";
import { optimizeLogoUrl } from "@/utils/logoOptimization";

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

const INDEXER_METADATA_PREFIX = "/indexer";
const METADATA_FETCH_TIMEOUT_MS = 7000;
const VALIDATOR_METADATA_TTL_MS = 30 * 60 * 1000;

const normalizeContractHash = (hash) => {
  const normalized = String(hash || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.startsWith("0x")) return normalized;
  if (normalized.length === 40 || normalized.length === 64) return `0x${normalized}`;
  return normalized;
};

const normalizeAddressKey = (address) => String(address || "").trim();

const getNetworkMode = (networkMode) => toNetworkMode(networkMode);

const buildIndexerMetadataUrl = (network, resource, query = "") => {
  const path = `${INDEXER_METADATA_PREFIX}/${network}/metadata/${resource}${query}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }
  // Fallback for node testing environments
  return `http://localhost${path}`;
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
  const nnsDomain = String(item.nns_domain || item.nnsDomain || "").trim().toLowerCase();
  let nnsExpirationMS = Number(
    item.nns_expiration_ms ?? item.nnsExpirationMS ?? item.nns_expiration ?? item.nnsExpiration ?? 0
  );
  if (Number.isFinite(nnsExpirationMS) && nnsExpirationMS > 0 && nnsExpirationMS < 1_000_000_000_000) {
    nnsExpirationMS *= 1000;
  }
  if (!Number.isFinite(nnsExpirationMS) || nnsExpirationMS <= 0) {
    nnsExpirationMS = 0;
  }
  const hasActiveNNS = Boolean(nnsDomain) && nnsExpirationMS > Date.now();

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

    const result = await this.getContractMetadataBatch([normalizedHash], network);
    return result[normalizedHash] || null;
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
      try {
        const query = `?hashes=${encodeURIComponent(toFetch.join(","))}&limit=${Math.min(
          Math.max(toFetch.length, 1),
          1000
        )}`;
        const payload = await fetchJsonWithTimeout(
          buildIndexerMetadataUrl(network, "contracts", query)
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
        if (import.meta.env.DEV) console.warn("Indexer contract metadata fetch failed:", err);
      }

      if (!loadedFromIndexer && supabase) {
        try {
          const { data, error } = await supabase
            .from("contract_metadata")
            .select("*")
            .in("contract_hash", toFetch);

          if (error) throw error;

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

    const result = await this.getAddressTagsBatch([normalizedAddr], network);
    return result[normalizedAddr] || result[normalizedAddr.toLowerCase()] || null;
  },
  
  async getAddressTagsBatch(addresses, networkMode) {
    if (!addresses || !addresses.length) return {};
    const network = getNetworkMode(networkMode);
    const uniqueAddrs = [...new Set(addresses.map((a) => normalizeAddressKey(a)).filter(Boolean))];
    const toFetch = uniqueAddrs.filter((addr) => getAddressTagCacheEntry(network, addr) === undefined);

    if (toFetch.length > 0) {
      let loadedFromIndexer = false;
      try {
        const query = `?addresses=${encodeURIComponent(toFetch.join(","))}&limit=${Math.min(
          Math.max(toFetch.length, 1),
          1000
        )}`;
        const payload = await fetchJsonWithTimeout(
          buildIndexerMetadataUrl(network, "addresses", query)
        );
        const rows = Array.isArray(payload?.data) ? payload.data : [];

        toFetch.forEach((addr) => setAddressTagCacheEntry(network, addr, null));
        rows.forEach((item) => {
          const normalized = normalizeAddressMetadata(item);
          if (!normalized) return;
          setAddressTagCacheEntry(network, normalized.address, normalized);
        });
        loadedFromIndexer = true;
      } catch (err) {
        if (import.meta.env.DEV) console.warn("Indexer address metadata fetch failed:", err);
      }

      if (!loadedFromIndexer && supabase) {
        try {
          const { data, error } = await supabase
            .from("address_tags")
            .select("address, label, category")
            .in("address", toFetch);

          if (error) throw error;

          toFetch.forEach((addr) => setAddressTagCacheEntry(network, addr, null));

          if (data) {
            data.forEach((item) => {
              const normalized = normalizeAddressMetadata(item);
              if (!normalized) return;
              setAddressTagCacheEntry(network, normalized.address, normalized);
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
      const payload = await fetchJsonWithTimeout(buildIndexerMetadataUrl(network, "validators"));
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

      validatorMetadataCache.set(network, { timestamp: Date.now(), data: normalized });
      return normalized;
    } catch (err) {
      if (import.meta.env.DEV) console.warn("Indexer validator metadata fetch failed:", err);
      validatorMetadataCache.set(network, { timestamp: Date.now(), data: [] });
      return [];
    }
  },

  async getMultisigRequests() {
    if (!supabase) return [];
    try {
      const { data } = await supabase
        .from('multisig_requests')
        .select('*, signatures:multisig_signatures(*)')
        .order('created_at', { ascending: false });
      return data || [];
    } catch (err) {
      return [];
    }
  },

  async createMultisigRequest(payload) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const { data, error } = await supabase
        .from('multisig_requests')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async addMultisigSignature(requestId, signerAddress, signature) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const { data, error } = await supabase
        .from('multisig_signatures')
        .insert([{ request_id: requestId, signer_address: signerAddress, signature }]);
      if (error) throw error;
      return { success: true, data };
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
