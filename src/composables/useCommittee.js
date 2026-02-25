import { ref } from "vue";
import { rpc } from "@/services/api";
import { cachedRequest } from "@/services/cache";
import { getCurrentEnv, NET_ENV } from "@/utils/env";
import { wallet } from "@cityofzion/neon-js";

// Shared reactive state to avoid redundant fetches across components
const validators = ref([]);
const doraMetadata = ref({});
const initialized = ref(false);

export function useCommittee() {
  async function loadCommittee() {
    if (initialized.value) return;
    initialized.value = true;
    
    try {
      // getnextblockvalidators returns exactly the 7 consensus nodes whose index matches the 'primary' field in a block
            const response = await rpc("getnextblockvalidators");
      if (response && Array.isArray(response)) {
        validators.value = response;
      } else if (response && response.result && Array.isArray(response.result)) {
        validators.value = response.result;
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn("Failed to load validators", e);
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
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.pubkey) metaMap[item.pubkey] = item;
          if (item.scripthash) metaMap[item.scripthash] = item;
        });
      }
      doraMetadata.value = metaMap;
    } catch (e) {
      if (import.meta.env.DEV) console.warn("Failed to load Dora committee meta", e);
    }
  }

  // Kickoff load immediately if not done
  loadCommittee();


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
       // if we don't have validators loaded yet, but we are asked, wait or just return fallback
       return "Loading...";
    }

    const validator = validators.value[primaryIndex];
    if (!validator) return "Unknown Validator";
    
    const meta = doraMetadata.value[validator.publickey];
    if (meta && meta.name) {
      return meta.name;
    }
    
    return "Unknown Validator";
  };

      const getPrimaryNodeAddress = (primaryIndex) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    if (!validators.value || validators.value.length === 0) return null;
    
    const validator = validators.value[primaryIndex];
    if (!validator) return null;
    
    const meta = doraMetadata.value[validator.publickey];
    if (meta && meta.scripthash) {
      return meta.scripthash;
    }
    
    if (validator.publickey) {
       try {
           const account = new wallet.Account(validator.publickey);
           return account.address;
       } catch(e) {
           return null;
       }
    }
    
    return null;
  };

  const isCouncilMember = (address) => {
    if (!address || !validators.value) return false;
    for (const v of validators.value) {
       try {
           const acc = new wallet.Account(v.publickey);
           if (acc.address === address) return true;
       } catch (_e) { /* ignore */ }
    }
    return false;
  };

  return { loadCommittee, resolvePrimaryIndex, getPrimaryNodeName, getPrimaryNodeAddress, isCouncilMember };
}
