const fs = require('fs');
let file = fs.readFileSync('src/services/supabaseService.js', 'utf8');

file = file.replace(/return result;\n  \}\n\};\n\n  , async getMultisigRequests\(\) \{[\s\S]*?\};\s*\}\n/, `return result;
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
  }
};
`);
fs.writeFileSync('src/services/supabaseService.js', file);
