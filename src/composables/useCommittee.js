import { ref } from "vue";
import { rpc } from "@/services/api";
import { cachedRequest } from "@/services/cache";
import { getCurrentEnv, NET_ENV, NETWORK_CHANGE_EVENT } from "@/utils/env";
import { KNOWN_ADDRESSES } from "@/constants/knownAddresses";
import { addressToScriptHash, scriptHashToAddress } from "@/utils/neoHelpers";
import { wallet } from "@cityofzion/neon-js";

// Shared reactive state to avoid redundant fetches across components
const validators = ref([]);
const doraMetadata = ref({});
const initialized = ref(false);

const normalizeMetaKey = (value) => String(value || "").trim().toLowerCase();

const normalizeScriptHashKey = (value) => normalizeMetaKey(value).replace(/^0x/, "");

const deriveValidatorAddress = (validator) => {
  if (!validator?.publickey) return null;
  try {
    return new wallet.Account(validator.publickey).address;
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
  if (!validator?.publickey) return null;
  const byPubkey = doraMetadata.value[normalizeMetaKey(validator.publickey)];
  if (byPubkey) return byPubkey;

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

export function useCommittee() {
  async function loadCommittee(force = false) {
    if (initialized.value && !force) return;
    initialized.value = true;
    let validatorsLoaded = false;
    
    try {
      // GetCommittee is supported by neo3fura and returns consensus committee members.
      const response = await rpc("GetCommittee", { Limit: 21, Skip: 0 });
      if (response && Array.isArray(response)) {
        validators.value = response;
      } else if (response && response.result && Array.isArray(response.result)) {
        validators.value = response.result;
      }

      validatorsLoaded = Array.isArray(validators.value) && validators.value.length > 0;
    } catch (e) {
      if (import.meta.env.DEV) console.warn("Failed to load validators", e);
    }

    if (!validatorsLoaded) {
      // Allow later calls to retry when RPC is temporarily unavailable.
      initialized.value = false;
      return;
    }
    
    // Load Dora metadata for names
    try {
      const env = getCurrentEnv().toLowerCase();
      const doraEnv = env.includes(NET_ENV.TestT5.toLowerCase()) ? "testnet" : "mainnet";
      const url = `https://dora.coz.io/api/v1/neo3/${doraEnv}/committee`;
      const data = await cachedRequest(
          `dora_metadata_${doraEnv}`,
          () => fetch(url).then(r => r.ok ? r.json() : []),
          300000 // 5 mins
      );
      
      const metaMap = {};
      const addMeta = (key, item) => {
        const normalized = normalizeMetaKey(key);
        if (normalized) {
          metaMap[normalized] = item;
        }
      };

      if (Array.isArray(data)) {
        data.forEach(item => {
          addMeta(item.pubkey, item);
          addMeta(item.scripthash, item);
          addMeta(normalizeScriptHashKey(item.scripthash), item);

          const itemAddress = deriveValidatorAddress({ publickey: item.pubkey });
          if (itemAddress) {
            addMeta(itemAddress, item);
            const scriptHash = addressToScriptHash(itemAddress);
            addMeta(scriptHash, item);
            addMeta(normalizeScriptHashKey(scriptHash), item);
          }
        });
      }
      doraMetadata.value = metaMap;
    } catch (e) {
      if (import.meta.env.DEV) console.warn("Failed to load Dora committee meta", e);
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

  const isCouncilMember = (address) => {
    if (!address || !validators.value) return false;
    for (const v of validators.value) {
      try {
        const acc = new wallet.Account(v.publickey);
        if (acc.address === address) return true;
      } catch (_e) {
        /* ignore */
      }
    }
    return false;
  };

  return { loadCommittee, resolvePrimaryIndex, getPrimaryNodeName, getPrimaryNodeAddress, isCouncilMember };
}
