const fs = require('fs');

let file = fs.readFileSync('src/views/Token/Tokens.vue', 'utf8');
file = file.replace('import { supabaseService } from "@/services/supabaseService";\nimport { supabaseService } from "@/services/supabaseService";', 'import { supabaseService } from "@/services/supabaseService";');
fs.writeFileSync('src/views/Token/Tokens.vue', file);

let file2 = fs.readFileSync('src/views/Transaction/components/TxOverviewTab.vue', 'utf8');
if (!file2.includes('import { ref, watch } from "vue";')) {
    file2 = file2.replace('import { computed } from "vue";', 'import { computed, ref, watch } from "vue";');
}
fs.writeFileSync('src/views/Transaction/components/TxOverviewTab.vue', file2);
