const fs = require('fs');
let file = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

file = file.replace(/return \`Validator #\$\{primaryIndex\}\`;/g, 'return "Unknown Validator";');

fs.writeFileSync('src/composables/useCommittee.js', file);
