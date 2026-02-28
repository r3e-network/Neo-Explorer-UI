const fs = require('fs');
let file = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

file = file.replace('import { getCurrentEnv, NET_ENV } from "@/utils/env";', 'import { getCurrentEnv, NET_ENV } from "@/utils/env";\nimport { wallet } from "@cityofzion/neon-js";');

file = file.replace(/const \{ wallet \} = require\('@cityofzion\/neon-js'\);\n/, '');

fs.writeFileSync('src/composables/useCommittee.js', file);
