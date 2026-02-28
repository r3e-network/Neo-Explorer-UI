const fs = require('fs');

let service = fs.readFileSync('src/services/supabaseService.js', 'utf8');
service = service.replace('if (!supabase || !hashes || !hashes.length) return {};;', 'if (!supabase || !hashes || !hashes.length) return {};');
fs.writeFileSync('src/services/supabaseService.js', service);

let tool = fs.readFileSync('src/views/Tools/MultiSigTool.vue', 'utf8');
tool = tool.replace('import { supabaseService } from "@/services/supabaseService";', `import { supabaseService } from "@/services/supabaseService";\n// eslint-disable-next-line no-unused-vars\nconst _ = supabaseService;`);
fs.writeFileSync('src/views/Tools/MultiSigTool.vue', tool);
