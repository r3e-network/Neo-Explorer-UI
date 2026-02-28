const fs = require('fs');
let file = fs.readFileSync('src/composables/useCommittee.js', 'utf8');
file = file.replace(/\\\`/g, '`');
file = file.replace(/\\\$/g, '$');
fs.writeFileSync('src/composables/useCommittee.js', file);
