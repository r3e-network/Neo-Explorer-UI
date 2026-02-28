const fs = require('fs');
let file = fs.readFileSync('src/views/Token/TokenDetail.vue', 'utf8');

const importReplacement = `import { truncateHash, formatTokenAmount } from "@/utils/explorerFormat";
import { getTokenIcon, hasTokenIcon } from "@/utils/getTokenIcon";`;
file = file.replace('import { truncateHash, formatTokenAmount } from "@/utils/explorerFormat";', importReplacement);

const templateReplacement = `<div class="detail-hero">
        <div class="flex items-start gap-3">
          <img v-if="hasTokenIcon(token.hash)" :src="getTokenIcon(token.hash, token.type)" class="h-10 w-10 rounded-full object-cover ring-1 ring-line-soft bg-white" alt="Token Logo" />
          <div v-else class="page-header-icon bg-primary-100 text-primary-500 dark:bg-primary-900/40 dark:text-primary-400">
            <span class="text-lg font-bold">{{ token.symbol?.charAt(0) || "?" }}</span>
          </div>
          <div class="min-w-0 flex-1">`;
file = file.replace(/<div class="detail-hero">\s*<div class="flex items-start gap-3">\s*<div class="page-header-icon bg-primary-100 text-primary-500 dark:bg-primary-900\/40 dark:text-primary-400">\s*<span class="text-lg font-bold">{{ token\.symbol\?\.charAt\(0\) \|\| "\?" }}<\/span>\s*<\/div>\s*<div class="min-w-0 flex-1">/, templateReplacement);

fs.writeFileSync('src/views/Token/TokenDetail.vue', file);
