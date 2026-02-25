import { ref } from "vue";
import { rpc } from "@/services/api";
import { cachedRequest } from "@/services/cache";
import { getCurrentEnv, NET_ENV } from "@/utils/env";

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

  const getPrimaryNodeName = (primaryIndex) => {
    if (primaryIndex === undefined || primaryIndex === null) return null;
    
    // The primary index corresponds to the validator's position in the active set
    const validator = validators.value[primaryIndex];
    if (!validator) return null;
    
    const meta = doraMetadata.value[validator.publickey];
    if (meta && meta.name) {
      return meta.name;
    }
    
    // Fallback if no name found
    return `Validator #${primaryIndex}`;
  };

  return { loadCommittee, getPrimaryNodeName };
}
