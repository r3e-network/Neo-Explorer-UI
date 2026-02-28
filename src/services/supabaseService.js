import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a single supabase client for interacting with your database
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// In-memory caches to avoid redundant requests during a session
const contractMetadataCache = new Map();
const addressTagCache = new Map();
const inFlightRequests = new Map(); // For promise caching

// Micro-batching queues
let contractBatchQueue = [];
let contractBatchTimer = null;
let contractBatchResolvers = [];

function flushContractBatch() {
  if (contractBatchQueue.length === 0) return;
  
  const hashesToFetch = [...contractBatchQueue];
  const resolversToNotify = [...contractBatchResolvers];
  
  contractBatchQueue = [];
  contractBatchResolvers = [];
  contractBatchTimer = null;
  
  supabaseService.getContractMetadataBatch(hashesToFetch).then(resultMap => {
    resolversToNotify.forEach(({ hash, resolve }) => {
      resolve(resultMap[String(hash).toLowerCase()] || null);
    });
  }).catch(_err => {
    resolversToNotify.forEach(({ resolve }) => resolve(null));
  });
}

let tagBatchQueue = [];
let tagBatchTimer = null;
let tagBatchResolvers = [];

function flushTagBatch() {
  if (tagBatchQueue.length === 0) return;
  
  const addrsToFetch = [...tagBatchQueue];
  const resolversToNotify = [...tagBatchResolvers];
  
  tagBatchQueue = [];
  tagBatchResolvers = [];
  tagBatchTimer = null;
  
  supabaseService.getAddressTagsBatch(addrsToFetch).then(resultMap => {
    resolversToNotify.forEach(({ address, resolve }) => {
      resolve(resultMap[String(address)] || null);
    });
  }).catch(_err => {
    resolversToNotify.forEach(({ resolve }) => resolve(null));
  });
}

export const supabaseService = {
  async getContractMetadata(hash) {
    if (!supabase || !hash) return null;
    const normalizedHash = String(hash).toLowerCase();
    
    if (contractMetadataCache.has(normalizedHash)) {
      return contractMetadataCache.get(normalizedHash);
    }

    if (inFlightRequests.has(normalizedHash)) {
      return inFlightRequests.get(normalizedHash);
    }

    const fetchPromise = new Promise((resolve) => {
      contractBatchQueue.push(normalizedHash);
      contractBatchResolvers.push({ hash: normalizedHash, resolve });
      
      if (!contractBatchTimer) {
        contractBatchTimer = setTimeout(flushContractBatch, 50); // 50ms debounce
      }
    });

    inFlightRequests.set(normalizedHash, fetchPromise);
    
    fetchPromise.finally(() => {
      inFlightRequests.delete(normalizedHash);
    });

    return fetchPromise;
  },

  async getContractMetadataBatch(hashes) {
    if (!supabase || !hashes || !hashes.length) return {};
    
    const normalizedHashes = [...new Set(hashes.map(h => String(h).toLowerCase()))];
    const toFetch = normalizedHashes.filter(h => !contractMetadataCache.has(h));
    
    if (toFetch.length > 0) {
      try {
        const { data, error } = await supabase
          .from('contract_metadata')
          .select('*')
          .in('contract_hash', toFetch);
          
        if (error) throw error;
        
        // Mark all fetched as null initially (to cache negative results)
        toFetch.forEach(h => contractMetadataCache.set(h, null));
        
        // Populate actual results
        if (data) {
          data.forEach(item => {
            contractMetadataCache.set(item.contract_hash.toLowerCase(), item);
          });
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Supabase batch fetch error:', err);
      }
    }
    
    const result = {};
    normalizedHashes.forEach(h => {
      if (contractMetadataCache.get(h)) {
        result[h] = contractMetadataCache.get(h);
      }
    });
    
    return result;
  },

  async getAddressTag(address) {
    if (!supabase || !address) return null;
    const normalizedAddr = String(address);
    
    if (addressTagCache.has(normalizedAddr)) {
      return addressTagCache.get(normalizedAddr);
    }

    if (inFlightRequests.has(normalizedAddr)) {
      return inFlightRequests.get(normalizedAddr);
    }

    const fetchPromise = new Promise((resolve) => {
      tagBatchQueue.push(normalizedAddr);
      tagBatchResolvers.push({ address: normalizedAddr, resolve });
      
      if (!tagBatchTimer) {
        tagBatchTimer = setTimeout(flushTagBatch, 50); // 50ms debounce
      }
    });

    inFlightRequests.set(normalizedAddr, fetchPromise);
    
    fetchPromise.finally(() => {
      inFlightRequests.delete(normalizedAddr);
    });

    return fetchPromise;
  },
  
  async getAddressTagsBatch(addresses) {
    if (!supabase || !addresses || !addresses.length) return {};
    
    const uniqueAddrs = [...new Set(addresses.map(a => String(a)))];
    const toFetch = uniqueAddrs.filter(a => !addressTagCache.has(a));
    
    if (toFetch.length > 0) {
      try {
        const { data, error } = await supabase
          .from('address_tags')
          .select('address, label, category')
          .in('address', toFetch);
          
        if (error) throw error;
        
        toFetch.forEach(a => addressTagCache.set(a, null));
        
        if (data) {
          data.forEach(item => {
            addressTagCache.set(item.address, item);
          });
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Supabase batch tag fetch error:', err);
      }
    }
    
    const result = {};
    uniqueAddrs.forEach(a => {
      if (addressTagCache.get(a)) {
        result[a] = addressTagCache.get(a);
      }
    });
    
    return result;
  },

  async getMultisigRequests() {
    if (!supabase) return [];
    try {
      const { data } = await supabase
        .from('multisig_requests')
        .select('*, signatures:multisig_signatures(id)')
        .order('created_at', { ascending: false });
      return data || [];
    } catch (err) {
      return [];
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
