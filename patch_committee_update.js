const fs = require('fs');

let code = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

if (!code.includes('NETWORK_CHANGE_EVENT')) {
    code = code.replace(
        'import { getCurrentEnv, NET_ENV } from "@/utils/env";',
        'import { getCurrentEnv, NET_ENV, NETWORK_CHANGE_EVENT } from "@/utils/env";'
    );
    
    code = code.replace(
        '// Kickoff load immediately if not done\n  loadCommittee();',
        '// Kickoff load immediately if not done\n  loadCommittee();\n\n  if (typeof window !== "undefined" && !window.__committee_listener_added__) {\n    window.__committee_listener_added__ = true;\n    window.addEventListener(NETWORK_CHANGE_EVENT, () => {\n      loadCommittee(true);\n    });\n  }'
    );
    fs.writeFileSync('src/composables/useCommittee.js', code);
}
