import { ref, getCurrentInstance, onBeforeUnmount, onMounted } from "vue";
import { rpc } from "@/services/api";
import { getCurrentEnv, NET_ENV, NETWORK_CHANGE_EVENT } from "@/utils/env";
import { getCommittee as fetchDoraCommittee } from "@/services/doraService";
import { getKnownAddressName } from "@/constants/knownAddresses";
import { addressToScriptHash, publicKeyToAddress, scriptHashToAddress, isPublicKeyHex, isScriptHashHex } from "@/utils/neoHelpers";
import { supabaseService } from "@/services/supabaseService";
import { getDefaultCandidateLogoUrl, resolveCandidateLogoUrl } from "@/utils/logoOptimization";

// Shared reactive state to avoid redundant fetches across components
const validators = ref([]);
const doraMetadata = ref({});
const initialized = ref(false);

let committeeNetworkListener = null;
let committeeNetworkListenerConsumers = 0;
let latestLoadCommittee = null;

const normalizeMetaKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

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

const fallbackValidatorName = (primaryIndex, maybeAddress = null) => {
  const address = scriptHashToAddress(String(maybeAddress || ""));
  const knownName = getKnownAddressName(address || maybeAddress);
  if (knownName) {
    return knownName;
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
    if (!validatorsLoaded && doraResult?.topConsensusValidators?.length === CONSENSUS_VALIDATOR_COUNT) {
      // Only use metadata-derived ordering as fallback when RPC validator set is unavailable.
      // block.primary index must map to the RPC validator ordering for correct validator/logo display.
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
      }
    });
  }

  const resolvePrimaryIndex = (block) => {
    if (!block) return undefined;
    const primaryCandidates = [block.primary, block.primary_node, block.primaryNode];
    for (const rawPrimary of primaryCandidates) {
      if (rawPrimary === undefined || rawPrimary === null) continue;
      const numericPrimary = Number(rawPrimary);
      if (Number.isFinite(numericPrimary) && numericPrimary >= 0) {
        return numericPrimary;
      }
    }
    if (block.index !== undefined && block.index !== null) {
      const vCount = validators.value && validators.value.length > 0 ? validators.value.length : 7;
      return Number(block.index) % vCount;
    }
    return undefined;
  };

  const getPrimaryNodeName = (primaryIndex, fallbackAddress = null) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    if (!validators.value || validators.value.length === 0) {
      // Avoid permanent "Loading..." labels when endpoint metadata is temporarily unavailable.
      if (!initialized.value) {
        void loadCommittee();
      }
      return fallbackValidatorName(primaryIndex, fallbackAddress);
    }

    const numericIndex = Number(primaryIndex);
    const validator = validators.value[numericIndex];
    if (!validator) return fallbackValidatorName(numericIndex, fallbackAddress);

    const meta = getValidatorMetadata(validator);
    if (meta && meta.name) {
      return meta.name;
    }

    const address = meta?.scripthash || deriveValidatorAddress(validator);
    return fallbackValidatorName(numericIndex, address || fallbackAddress);
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
