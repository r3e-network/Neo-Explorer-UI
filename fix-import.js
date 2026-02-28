const fs = require('fs');

let code = fs.readFileSync('src/components/trace/NotificationDecoder.vue', 'utf8');

code = code.replace(/import \{ NATIVE_CONTRACTS \} from "@\/constants\/index";/, `import HashLink from "@/components/common/HashLink.vue";
import { decodeStackItem } from "@/utils/neoCodec";
import { NATIVE_CONTRACTS } from "@/constants/index";`);

fs.writeFileSync('src/components/trace/NotificationDecoder.vue', code);
