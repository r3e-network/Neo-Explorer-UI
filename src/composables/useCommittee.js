import { ref, getCurrentInstance, onBeforeUnmount, onMounted } from "vue";
import { rpc } from "@/services/api";
import { getCurrentEnv, NET_ENV, NETWORK_CHANGE_EVENT } from "@/utils/env";
import { getCommittee as fetchDoraCommittee } from "@/services/doraService";
import { getKnownAddressName } from "@/constants/knownAddresses";
import { addressToScriptHash, publicKeyToAddress, scriptHashToAddress, isPublicKeyHex, isScriptHashHex } from "@/utils/neoHelpers";
import { supabaseService } from "@/services/supabaseService";
import { getDefaultCandidateLogoUrl, resolveCandidateLogoUrl, resolveCandidateLogoUrlFallbacks } from "@/utils/logoOptimization";

// Shared reactive state to avoid redundant fetches across components
const validators = ref([]);
const doraMetadata = ref({});
const initialized = ref(false);

let committeeNetworkListener = null;
let committeeNetworkListenerConsumers = 0;
let latestLoadCommittee = null;
let committeeLoadPromise = null;

const normalizeMetaKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeScriptHashKey = (value) => normalizeMetaKey(value).replace(/^0x/, "");
const NEOFS_LOGO_GATEWAYS = [
  "https://rest.fs.neo.org/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc",
  "https://filesend.ngd.network/gate/get/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc",
];
const NEOFS_LOGO_GATEWAY = NEOFS_LOGO_GATEWAYS[0];
const CONSENSUS_VALIDATOR_COUNT = 7;
const COMMITTEE_DEFERRED_LOAD_DELAY_MS = 2500;
let deferredCommitteeLoadTimer = null;

const clearDeferredCommitteeLoad = () => {
  if (!deferredCommitteeLoadTimer) return;
  const timerHost = typeof window !== "undefined" ? window : globalThis;
  timerHost.clearTimeout(deferredCommitteeLoadTimer);
  deferredCommitteeLoadTimer = null;
};

const scheduleDeferredCommitteeLoad = (loadFn, force = false) => {
  if (initialized.value && !force) return;
  if (deferredCommitteeLoadTimer) return;
  const timerHost = typeof window !== "undefined" ? window : globalThis;
  deferredCommitteeLoadTimer = timerHost.setTimeout(() => {
    deferredCommitteeLoadTimer = null;
    void loadFn(force);
  }, COMMITTEE_DEFERRED_LOAD_DELAY_MS);
};

const normalizeCandidateScriptHash = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  if (isScriptHashHex(normalized)) {
    return normalized.startsWith("0x") ? normalized.toLowerCase() : `0x${normalized.toLowerCase()}`;
  }

  const scriptHash = addressToScriptHash(normalized);
  return scriptHash ? scriptHash.toLowerCase() : null;
};

const resolveCandidateLogo = (logo) => {
  const normalized = String(logo || "").trim();
  if (!normalized) return null;

  if (normalized.startsWith("/api/logo?")) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return resolveCandidateLogoUrl(normalized);
  }

  return resolveCandidateLogoUrl(`${NEOFS_LOGO_GATEWAY}/${normalized}`);
};

const getValidatorPublicKey = (validator) => {
  if (!validator) return null;
  if (typeof validator === "string") {
    const normalized = String(validator).trim();
    if (!normalized) return null;
    if (isPublicKeyHex(normalized)) return normalized;
    if (normalizeCandidateScriptHash(normalized)) return null;
    return normalized;
  }

  const candidateKeys = [validator.publickey, validator.pubkey, validator.publicKey];
  for (const key of candidateKeys) {
    const normalized = String(key || "").trim();
    if (!normalized) continue;
    if (isPublicKeyHex(normalized)) return normalized;
    if (normalizeCandidateScriptHash(normalized)) continue;
    return normalized;
  }

  return null;
};

const getValidatorCandidateHash = (validator) => {
  if (!validator) return null;

  if (typeof validator === "string") {
    const asHash = normalizeCandidateScriptHash(validator);
    return asHash || null;
  }

  const candidate =
    validator.candidate ||
    validator.scripthash ||
    validator.scriptHash ||
    validator.address ||
    validator.validator ||
    null;

  return normalizeCandidateScriptHash(candidate);
};

const normalizeCommitteeEntry = (entry) => {
  const publickey = getValidatorPublicKey(entry);
  const candidate = getValidatorCandidateHash(entry);
  if (!publickey && !candidate) return null;

  if (typeof entry === "string") {
    if (publickey) return { publickey };
    return { candidate };
  }

  return {
    ...entry,
    ...(publickey ? { publickey } : {}),
    ...(candidate ? { candidate } : {}),
  };
};

const normalizeCommitteeList = (input) => {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeCommitteeEntry).filter(Boolean);
};

const toNumericVotes = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const buildTopConsensusValidatorsFromMetadata = (items) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items
    .filter((item) => getValidatorPublicKey(item))
    .sort((a, b) => {
      const votesDelta = toNumericVotes(b?.votes) - toNumericVotes(a?.votes);
      if (votesDelta !== 0) return votesDelta;
      return normalizeMetaKey(a?.pubkey).localeCompare(normalizeMetaKey(b?.pubkey));
    })
    .slice(0, CONSENSUS_VALIDATOR_COUNT)
    .map((item) => normalizeCommitteeEntry({ publickey: item.pubkey, candidate: item.scripthash }))
    .filter(Boolean);
};

const deriveValidatorAddress = (validator) => {
  const candidate = getValidatorCandidateHash(validator);
  if (candidate) {
    return scriptHashToAddress(candidate);
  }

  const publickey = getValidatorPublicKey(validator);
  if (!publickey) return null;
  const derived = publicKeyToAddress(publickey);
  return derived && derived !== publickey ? derived : null;
};

const tFallback = (key, params, fallback) => {
  const i18n = typeof globalThis !== "undefined" ? globalThis.__neoExplorerI18n__ : null;
  if (i18n?.global?.t) {
    const translated = i18n.global.t(key, params || {});
    if (translated && translated !== key) return translated;
  }
  return fallback;
};

const fallbackValidatorName = (primaryIndex, maybeAddress = null) => {
  const address = scriptHashToAddress(String(maybeAddress || ""));
  const knownName = getKnownAddressName(address || maybeAddress);
  if (knownName) {
    return knownName;
  }

  const numericIndex = Number(primaryIndex);
  if (Number.isFinite(numericIndex) && numericIndex >= 0) {
    return tFallback("validator.consensusNodeN", { n: numericIndex + 1 }, `Consensus Node ${numericIndex + 1}`);
  }

  return tFallback("validator.consensusNode", null, "Consensus Node");
};

/**
 * Check whether a validator display name is one of the generic
 * "Consensus Node" / "Consensus Node N" fallbacks (vs a real custom
 * name from metadata or knownAddresses). Locale-aware: compares
 * against the active translations as well as the English defaults.
 */
export const isFallbackValidatorName = (name) => {
  if (!name) return true;
  const trimmed = String(name).trim();
  if (!trimmed) return true;
  if (/^Consensus Node(?: \d+)?$/i.test(trimmed)) return true;
  // The indexer's metadata/validators endpoint hands back generic
  // "Validator 1" / "Validator 7" placeholders for nodes that don't
  // have a configured operator name. Treat those as a fallback so the
  // explorer falls through to the known-addresses table (NeoSPCC,
  // NEXT, AxLabs, …) instead of rendering the placeholder.
  if (/^Validator(?: \d+)?$/i.test(trimmed)) return true;

  const i18n = typeof globalThis !== "undefined" ? globalThis.__neoExplorerI18n__ : null;
  if (i18n?.global?.t) {
    const fallback = i18n.global.t("validator.consensusNode");
    if (fallback && trimmed === String(fallback).trim()) return true;
    for (let n = 1; n <= 30; n += 1) {
      const numbered = i18n.global.t("validator.consensusNodeN", { n });
      if (numbered && trimmed === String(numbered).trim()) return true;
    }
  }
  return false;
};

const getValidatorMetadata = (validator) => {
  const publickey = getValidatorPublicKey(validator);
  if (publickey) {
    const byPubkey = doraMetadata.value[normalizeMetaKey(publickey)];
    if (byPubkey) return byPubkey;
  }

  const candidate = getValidatorCandidateHash(validator);
  if (candidate) {
    const byCandidate =
      doraMetadata.value[normalizeMetaKey(candidate)] || doraMetadata.value[normalizeScriptHashKey(candidate)];
    if (byCandidate) return byCandidate;
  }

  const derivedAddress = deriveValidatorAddress(validator);
  if (derivedAddress) {
    const byAddress = doraMetadata.value[normalizeMetaKey(derivedAddress)];
    if (byAddress) return byAddress;

    const scriptHash = addressToScriptHash(derivedAddress);
    if (scriptHash) {
      const byScriptHash =
        doraMetadata.value[normalizeMetaKey(scriptHash)] || doraMetadata.value[normalizeScriptHashKey(scriptHash)];
      if (byScriptHash) return byScriptHash;
    }
  }

  return null;
};

const processCommitteeMetadata = (data) => {
  const metaMap = {};
  const addMeta = (key, item) => {
    const normalized = normalizeMetaKey(key);
    if (normalized) {
      metaMap[normalized] = item;
    }
  };

  let topConsensusValidators = [];
  if (Array.isArray(data)) {
    data.forEach((item) => {
      const rawLogo = item.logoUrl || item.logo_url || item.logo;
      const normalizedMeta = {
        ...item,
        pubkey: item.pubkey || item.public_key || item.publicKey,
        name: item.name || item.display_name || "",
        scripthash: item.scripthash || item.address || "",
        logo: item.logo || item.logo_url || "",
        logoUrl: resolveCandidateLogo(rawLogo),
        logoUrlFallbacks: resolveCandidateLogoUrlFallbacks(String(rawLogo || "").trim()),
      };

      addMeta(normalizedMeta.pubkey, normalizedMeta);
      addMeta(normalizedMeta.scripthash, normalizedMeta);
      addMeta(normalizeScriptHashKey(normalizedMeta.scripthash), normalizedMeta);

      const itemAddress = deriveValidatorAddress({ publickey: normalizedMeta.pubkey });
      if (itemAddress) {
        addMeta(itemAddress, normalizedMeta);
        const scriptHash = addressToScriptHash(itemAddress);
        addMeta(scriptHash, normalizedMeta);
        addMeta(normalizeScriptHashKey(scriptHash), normalizedMeta);
      }
    });

    topConsensusValidators = buildTopConsensusValidatorsFromMetadata(
      data.map((item) => ({
        ...item,
        pubkey: item.pubkey || item.public_key || item.publicKey,
        scripthash: item.scripthash || item.address || "",
      })),
    );
  }

  return { metaMap, topConsensusValidators, loaded: Array.isArray(data) && data.length > 0 };
};

const loadCommitteeMetadata = async () => {
  const env = getCurrentEnv().toLowerCase();
  const isTestnet = env.includes(NET_ENV.TestT5.toLowerCase()) || env.includes("test");

  let indexerData = [];
  try {
    indexerData = await supabaseService.getValidatorMetadata(getCurrentEnv());
  } catch (e) {
    if (import.meta.env.DEV) console.warn("Failed to load indexer committee metadata", e);
  }

  const indexerResult = processCommitteeMetadata(indexerData);
  if (indexerResult.loaded && indexerResult.topConsensusValidators.length > 0) {
    doraMetadata.value = { ...indexerResult.metaMap };
    return {
      loaded: true,
      topConsensusValidators: indexerResult.topConsensusValidators,
    };
  }

  let doraData = [];
  if (!isTestnet) {
    try {
      doraData = await fetchDoraCommittee(NET_ENV.Mainnet);
    } catch (e) {
      if (import.meta.env.DEV) console.warn("Failed to load Dora committee meta", e);
    }
  }

  const doraResult = processCommitteeMetadata(doraData);

  const mergedMap = { ...doraResult.metaMap };
  for (const key in indexerResult.metaMap) {
    mergedMap[key] = {
      ...mergedMap[key],
      ...indexerResult.metaMap[key],
      name: indexerResult.metaMap[key].name || mergedMap[key]?.name || "",
      logo: indexerResult.metaMap[key].logo || mergedMap[key]?.logo || "",
      logoUrl: indexerResult.metaMap[key].logoUrl || mergedMap[key]?.logoUrl || "",
    };
  }

  doraMetadata.value = mergedMap;

  return {
    loaded: doraResult.loaded || indexerResult.loaded,
    topConsensusValidators:
      indexerResult.topConsensusValidators.length > 0
        ? indexerResult.topConsensusValidators
        : doraResult.topConsensusValidators,
  };
};

export function useCommittee() {
  function loadCommittee(force = false) {
    clearDeferredCommitteeLoad();
    if (committeeLoadPromise && !force) return committeeLoadPromise;
    if (initialized.value && !force) return Promise.resolve();

    committeeLoadPromise = (async () => {
      initialized.value = true;
      let validatorsLoaded = false;
      // Start metadata fetch immediately so validator labels/logos are not blocked by slow RPC timeouts.
      const doraPromise = loadCommitteeMetadata();

      try {
        // primary index on blocks maps to the active consensus validators set.
        const response = await rpc("getnextblockvalidators", []);
        if (response && Array.isArray(response)) {
          validators.value = normalizeCommitteeList(response);
        } else if (response && response.result && Array.isArray(response.result)) {
          validators.value = normalizeCommitteeList(response.result);
        }

        validatorsLoaded = Array.isArray(validators.value) && validators.value.length > 0;
      } catch (e) {
        if (import.meta.env.DEV) console.warn("Failed to load next block validators", e);
      }

      if (!validatorsLoaded) {
        try {
          // Standard `getcommittee` returns the consensus committee
          // public-key list. Was previously calling PascalCase
          // GetCommittee which proxies through neo3fura_http and won't
          // exist post-Mongo cleanup. Standard works against any Neo
          // node.
          const response = await rpc("getcommittee", []);
          if (response && Array.isArray(response)) {
            validators.value = normalizeCommitteeList(response);
          } else if (response && response.result && Array.isArray(response.result)) {
            validators.value = normalizeCommitteeList(response.result);
          }

          validatorsLoaded = Array.isArray(validators.value) && validators.value.length > 0;
        } catch (e) {
          if (import.meta.env.DEV) console.warn("Failed to load committee fallback", e);
        }
      }

      const doraResult = await doraPromise;
      if (!validatorsLoaded && doraResult?.topConsensusValidators?.length === CONSENSUS_VALIDATOR_COUNT) {
        // Only use metadata-derived ordering as fallback when RPC validator set is unavailable.
        // block.primary index must map to the RPC validator ordering for correct validator/logo display.
        validators.value = doraResult.topConsensusValidators;
      }

      validatorsLoaded = Array.isArray(validators.value) && validators.value.length > 0;

      if (!validatorsLoaded) {
        // Allow later calls to retry when RPC and metadata are temporarily unavailable.
        initialized.value = false;
      }
    })().finally(() => {
      committeeLoadPromise = null;
    });

    return committeeLoadPromise;
  }

  latestLoadCommittee = loadCommittee;

  const instance = getCurrentInstance();
  if (instance) {
    onMounted(() => {
      if (typeof window === "undefined") return;
      committeeNetworkListenerConsumers += 1;
      if (!committeeNetworkListener) {
        committeeNetworkListener = () => {
          if (typeof latestLoadCommittee === "function") {
            latestLoadCommittee(true);
          }
        };
        window.addEventListener(NETWORK_CHANGE_EVENT, committeeNetworkListener);
      }
    });

    onBeforeUnmount(() => {
      if (typeof window === "undefined") return;
      committeeNetworkListenerConsumers = Math.max(0, committeeNetworkListenerConsumers - 1);
      if (committeeNetworkListenerConsumers === 0 && committeeNetworkListener) {
        window.removeEventListener(NETWORK_CHANGE_EVENT, committeeNetworkListener);
        committeeNetworkListener = null;
        latestLoadCommittee = null;
        clearDeferredCommitteeLoad();
      }
    });
  }

  const resolvePrimaryIndex = (block) => {
    if (!block) return undefined;
    // Authoritative source: the block header's `primary` field, served by
    // RPC getblock / the indexer's blocks endpoint. This is the chain's
    // record of which consensus node primary'd the block under dBFT
    // (including any view-change shifts), not a derived value. Always
    // prefer it; only fall through if a malformed block strips the field.
    const primaryCandidates = [block.primary, block.primary_node, block.primaryNode];
    for (const rawPrimary of primaryCandidates) {
      if (rawPrimary === undefined || rawPrimary === null) continue;
      const numericPrimary = Number(rawPrimary);
      if (Number.isFinite(numericPrimary) && numericPrimary >= 0) {
        return numericPrimary;
      }
    }
    // Last-resort heuristic — only fires when the block lacks `primary`
    // entirely. dBFT's normal-case primary follows `index % N`, but a
    // view change shifts it; this approximation is wrong for blocks
    // that took >1 view to consense. We accept the inaccuracy here
    // because (a) it's gated on missing-field input that shouldn't
    // happen in practice and (b) view changes are rare on Neo N3
    // mainnet.
    if (block.index !== undefined && block.index !== null) {
      const vCount = validators.value && validators.value.length > 0
        ? validators.value.length
        : CONSENSUS_VALIDATOR_COUNT;
      return Number(block.index) % vCount;
    }
    return undefined;
  };

  const getPrimaryNodeName = (primaryIndex, fallbackAddress = null) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    if (!validators.value || validators.value.length === 0) {
      // Avoid permanent "Loading..." labels when endpoint metadata is temporarily unavailable.
      if (!initialized.value) {
        scheduleDeferredCommitteeLoad(loadCommittee);
      }
      return fallbackValidatorName(primaryIndex, fallbackAddress);
    }

    const numericIndex = Number(primaryIndex);
    const validator = validators.value[numericIndex];
    if (!validator) return fallbackValidatorName(numericIndex, fallbackAddress);

    const meta = getValidatorMetadata(validator);
    // Trust meta.name only when it's a real operator name. The indexer
    // currently fills display_name with "Validator N" placeholders for
    // most nodes; passing those through hides better names that the
    // knownAddresses table holds (NeoSPCC, NEXT, AxLabs, …).
    if (meta && meta.name && !isFallbackValidatorName(meta.name)) {
      return meta.name;
    }

    const address = meta?.scripthash || deriveValidatorAddress(validator);
    return fallbackValidatorName(numericIndex, address || fallbackAddress);
  };

  const getPrimaryNodeAddress = (primaryIndex) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    if (!validators.value || validators.value.length === 0) {
      if (!initialized.value) {
        scheduleDeferredCommitteeLoad(loadCommittee);
      }
      return null;
    }

    const validator = validators.value[Number(primaryIndex)];
    if (!validator) return null;

    const meta = getValidatorMetadata(validator);
    if (meta && meta.scripthash) {
      return meta.scripthash;
    }

    return deriveValidatorAddress(validator);
  };

  const getPrimaryNodeLogo = (primaryIndex) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    if (!validators.value || validators.value.length === 0) return null;

    const validator = validators.value[Number(primaryIndex)];
    if (!validator) return null;

    const meta = getValidatorMetadata(validator);
    if (meta?.logoUrl) return meta.logoUrl;
    if (meta?.logo) {
      const resolved = resolveCandidateLogo(meta.logo);
      if (resolved) return resolved;
    }

    const publickey = getValidatorPublicKey(validator) || meta?.pubkey;
    return publickey ? getDefaultCandidateLogoUrl(publickey) || null : null;
  };

  const isCouncilMember = (address) => {
    if (!address || !validators.value) return false;
    for (const v of validators.value) {
      const publickey = getValidatorPublicKey(v);
      if (!publickey) continue;
      const derived = publicKeyToAddress(publickey);
      if (derived && derived === address) return true;
    }
    return false;
  };

  return {
    loadCommittee,
    resolvePrimaryIndex,
    getPrimaryNodeName,
    getPrimaryNodeAddress,
    getPrimaryNodeLogo,
    isCouncilMember,
  };
}
