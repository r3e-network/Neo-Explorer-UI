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

export const supabaseService = {
  async getContractMetadata(hash) {
    if (!supabase || !hash) return null;
    const normalizedHash = String(hash).toLowerCase();
    
    if (contractMetadataCache.has(normalizedHash)) {
      return contractMetadataCache.get(normalizedHash);
    }

    try {
      const { data, error } = await supabase
        .from('contract_metadata')
        .select('*')
        .eq('contract_hash', normalizedHash)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is no rows returned
        if (import.meta.env.DEV) console.warn('Supabase getContractMetadata error:', error);
      }
      
      contractMetadataCache.set(normalizedHash, data || null);
      return data || null;
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      return null;
    }
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

    try {
      const { data, error } = await supabase
        .from('address_tags')
        .select('label, category')
        .eq('address', normalizedAddr)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        if (import.meta.env.DEV) console.warn('Supabase getAddressTag error:', error);
      }
        
      addressTagCache.set(normalizedAddr, data || null);
      return data || null;
    } catch (err) {
      return null;
    }
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
