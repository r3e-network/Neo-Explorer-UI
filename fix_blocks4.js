const fs = require('fs');

let file = fs.readFileSync('src/views/Block/Blocks.vue', 'utf8');

file = file.replace('const { t } = useI18n();', 'const { t } = useI18n();\nconst { getPrimaryNodeName } = useCommittee();');

fs.writeFileSync('src/views/Block/Blocks.vue', file);
