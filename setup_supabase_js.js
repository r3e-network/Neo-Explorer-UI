const fs = require('fs');

const content = `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a single supabase client for interacting with your database
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const supabaseService = {
  async getContractMetadata(hash) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('contract_metadata')
        .select('*')
        .eq('contract_hash', String(hash).toLowerCase())
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is no rows returned
        console.warn('Supabase getContractMetadata error:', error);
      }
      return data || null;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  async getAddressTag(address) {
    if (!supabase) return null;
    try {
      const { data } = await supabase
        .from('address_tags')
        .select('label, category')
        .eq('address', String(address))
        .single();
        
      return data || null;
    } catch (err) {
      return null;
    }
  }
};
`;

fs.writeFileSync("src/services/supabaseService.js", content);
