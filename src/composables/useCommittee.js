import { ref } from "vue";
import { rpc } from "@/services/api";
import { cachedRequest } from "@/services/cache";
import { getCurrentEnv, NET_ENV, NETWORK_CHANGE_EVENT } from "@/utils/env";
import { KNOWN_ADDRESSES } from "@/constants/knownAddresses";
import { addressToScriptHash, scriptHashToAddress, isPublicKeyHex, isScriptHashHex } from "@/utils/neoHelpers";
import { wallet } from "@cityofzion/neon-js";
import { supabaseService } from "@/services/supabaseService";

// Shared reactive state to avoid redundant fetches across components
const validators = ref([]);
const doraMetadata = ref({});
const initialized = ref(false);

const normalizeMetaKey = (value) => String(value || "").trim().toLowerCase();

const normalizeScriptHashKey = (value) => normalizeMetaKey(value).replace(/^0x/, "");
const NEOFS_LOGO_GATEWAY = "https://filesend.ngd.network/gate/get/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc";
const CONSENSUS_VALIDATOR_COUNT = 7;

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

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return `${NEOFS_LOGO_GATEWAY}/${normalized}`;
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
  try {
    return new wallet.Account(publickey).address;
  } catch {
    return null;
  }
};

const fallbackValidatorName = (primaryIndex, maybeAddress = null) => {
  const address = scriptHashToAddress(String(maybeAddress || ""));
  if (address && KNOWN_ADDRESSES[address]) {
    return KNOWN_ADDRESSES[address];
  }

  const numericIndex = Number(primaryIndex);
  if (Number.isFinite(numericIndex) && numericIndex >= 0) {
    return `Consensus Node ${numericIndex + 1}`;
  }

  return "Consensus Node";
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

const applyCommitteeMetadata = (data) => {
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
      const normalizedMeta = {
        ...item,
        pubkey: item.pubkey || item.public_key || item.publicKey,
        name: item.name || item.display_name || "",
        scripthash: item.scripthash || item.address || "",
        logo: item.logo || item.logo_url || "",
        logoUrl: resolveCandidateLogo(item.logoUrl || item.logo_url || item.logo),
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
      }))
    );
    if (topConsensusValidators.length === CONSENSUS_VALIDATOR_COUNT) {
      validators.value = topConsensusValidators;
    }
  }

  doraMetadata.value = metaMap;
  return { loaded: Array.isArray(data) && data.length > 0, topConsensusValidators };
};

const loadIndexerCommitteeMetadata = async () => {
  try {
    const data = await supabaseService.getValidatorMetadata(getCurrentEnv());
    return applyCommitteeMetadata(data);
  } catch (e) {
    if (import.meta.env.DEV) console.warn("Failed to load indexer committee metadata", e);
    return { loaded: false, topConsensusValidators: [] };
  }
};

const loadDoraCommitteeMetadata = async () => {
  try {
    const env = getCurrentEnv().toLowerCase();
    const isTestnet = env.includes(NET_ENV.TestT5.toLowerCase()) || env.includes("test");
    if (isTestnet) {
      return { loaded: false, topConsensusValidators: [] };
    }

    const url = `https://dora.coz.io/api/v2/neo3/mainnet/committee`;
    const data = await cachedRequest(
      `dora_metadata_mainnet`,
      () => fetch(url).then(r => r.ok ? r.json() : []),
      300000 // 5 mins
    );

    return applyCommitteeMetadata(data);
  } catch (e) {
    if (import.meta.env.DEV) console.warn("Failed to load Dora committee meta", e);
    return { loaded: false, topConsensusValidators: [] };
  }
};

const loadCommitteeMetadata = async () => {
  const indexerResult = await loadIndexerCommitteeMetadata();
  if (indexerResult.loaded) {
    return indexerResult;
  }
  return loadDoraCommitteeMetadata();
};

export function useCommittee() {
  async function loadCommittee(force = false) {
    if (initialized.value && !force) return;
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
        // Fallback: committee list still gives candidate metadata keys when validator RPC is unavailable.
        const response = await rpc("GetCommittee", { Limit: 21, Skip: 0 });
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
    if (doraResult?.topConsensusValidators?.length === CONSENSUS_VALIDATOR_COUNT) {
      validators.value = doraResult.topConsensusValidators;
    }

    validatorsLoaded = Array.isArray(validators.value) && validators.value.length > 0;

    if (!validatorsLoaded) {
      // Allow later calls to retry when RPC and metadata are temporarily unavailable.
      initialized.value = false;
      return;
    }
  }

  // Kickoff load immediately if not done
  loadCommittee();

  if (typeof window !== "undefined" && !window.__committee_listener_added__) {
    window.__committee_listener_added__ = true;
    window.addEventListener(NETWORK_CHANGE_EVENT, () => {
      loadCommittee(true);
    });
  }


  const resolvePrimaryIndex = (block) => {
    if (!block) return undefined;
    if (block.primary !== undefined && block.primary !== null) return Number(block.primary);
    if (block.index !== undefined && block.index !== null) {
      const vCount = validators.value && validators.value.length > 0 ? validators.value.length : 7;
      return Number(block.index) % vCount;
    }
    return undefined;
  };

  const getPrimaryNodeName = (primaryIndex) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    if (!validators.value || validators.value.length === 0) {
      // Avoid permanent "Loading..." labels when endpoint metadata is temporarily unavailable.
      if (!initialized.value) {
        void loadCommittee();
      }
      return fallbackValidatorName(primaryIndex);
    }

    const numericIndex = Number(primaryIndex);
    const validator = validators.value[numericIndex];
    if (!validator) return fallbackValidatorName(numericIndex);

    const meta = getValidatorMetadata(validator);
    if (meta && meta.name) {
      return meta.name;
    }

    const address = meta?.scripthash || deriveValidatorAddress(validator);
    return fallbackValidatorName(numericIndex, address);
  };

  const getPrimaryNodeAddress = (primaryIndex) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    if (!validators.value || validators.value.length === 0) {
      if (!initialized.value) {
        void loadCommittee();
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
    const env = getCurrentEnv().toLowerCase();
    const isTestnet = env.includes(NET_ENV.TestT5.toLowerCase()) || env.includes("test");
    if (!isTestnet && publickey) {
      return `https://governance.neo.org/logo/${publickey}.png`;
    }

    return null;
  };

  const isCouncilMember = (address) => {
    if (!address || !validators.value) return false;
    for (const v of validators.value) {
      const publickey = getValidatorPublicKey(v);
      if (!publickey) continue;
      try {
        const acc = new wallet.Account(publickey);
        if (acc.address === address) return true;
      } catch (_e) {
        /* ignore */
      }
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
