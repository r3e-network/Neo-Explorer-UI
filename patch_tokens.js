const fs = require('fs');
let file = fs.readFileSync('src/views/Token/Tokens.vue', 'utf8');

const importReplacement = `import { truncateHash } from "@/utils/explorerFormat";
import { getTokenIcon, hasTokenIcon } from "@/utils/getTokenIcon";`;
file = file.replace('import { truncateHash } from "@/utils/explorerFormat";', importReplacement);

const nep17Replacement = `<router-link :to="\`/nep17-token-info/\${token.hash}\`" class="flex items-center gap-3">
                    <img v-if="hasTokenIcon(token.hash)" :src="getTokenIcon(token.hash, 'NEP17')" class="h-8 w-8 rounded-full object-cover" alt="" />
                    <div v-else
                      class="soft-divider text-high flex h-8 w-8 items-center justify-center rounded-full border bg-slate-50 text-sm font-semibold dark:bg-slate-800/70"
                    >
                      {{ token.symbol?.charAt(0) || "?" }}
                    </div>
                    <span class="text-high font-medium hover:text-primary-500 transition-colors">`;
file = file.replace(/<router-link :to="`\/nep17-token-info\/\$\{token\.hash\}`" class="flex items-center gap-3">[\s\S]*?<span class="text-high font-medium hover:text-primary-500 transition-colors">/, nep17Replacement);


const nep11Replacement = `<router-link :to="\`/nft-token-info/\${token.hash}\`" class="flex items-center gap-3">
                    <img v-if="hasTokenIcon(token.hash)" :src="getTokenIcon(token.hash, 'NEP11')" class="h-8 w-8 rounded-full object-cover" alt="" />
                    <div v-else
                      class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    >
                      {{ token.symbol?.charAt(0) || "?" }}
                    </div>
                    <span class="text-high font-medium hover:text-primary-500 transition-colors">`;
file = file.replace(/<router-link :to="`\/nft-token-info\/\$\{token\.hash\}`" class="flex items-center gap-3">[\s\S]*?<span class="text-high font-medium hover:text-primary-500 transition-colors">/, nep11Replacement);

fs.writeFileSync('src/views/Token/Tokens.vue', file);
