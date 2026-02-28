const fs = require('fs');
let code = fs.readFileSync('src/components/trace/InternalOperations.vue', 'utf8');

code = code.replace(/import \{ ref, computed \} from "vue";/, 'import { ref, computed, watch } from "vue";');

fs.writeFileSync('src/components/trace/InternalOperations.vue', code);
