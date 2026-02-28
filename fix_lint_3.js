const fs = require('fs');
let file = fs.readFileSync('src/views/Token/Tokens.vue', 'utf8');

// The issue might be that I added another import somewhere?
const instances = file.match(/import \{ supabaseService \} from "@\/services\/supabaseService";/g);
if (instances && instances.length > 1) {
    file = file.replace('import { supabaseService } from "@/services/supabaseService";\n', '');
}
fs.writeFileSync('src/views/Token/Tokens.vue', file);
