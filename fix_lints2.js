const fs = require('fs');

let gov = fs.readFileSync('src/views/Tools/GovernanceTool.vue', 'utf8');
gov = gov.replace(`import { ref, onMounted } from 'vue';`, `import { ref, onMounted, computed, watch } from 'vue';`);
fs.writeFileSync('src/views/Tools/GovernanceTool.vue', gov);

