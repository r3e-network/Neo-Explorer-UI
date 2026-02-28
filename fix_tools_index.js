const fs = require('fs');
let file = fs.readFileSync('src/views/Tools/ToolsIndex.vue', 'utf8');

const newTool = `      <router-link to="/verify-contract" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">Verify Contract</h2>
          <p class="text-sm text-mid mt-1">Upload source code to match on-chain bytecode, granting your contract a verified green checkmark.</p>
        </div>
      </router-link>
      
      <router-link to="/tools/b64" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">Neo Formatter & Converter</h2>
          <p class="text-sm text-mid mt-1">Easily convert between Base64, Hex strings, UTF-8 text, and ScriptHashes.</p>
        </div>
      </router-link>
    </div>`;

file = file.replace(/<\/div>\n  <\/div>\n<\/template>/, newTool + '\n  </div>\n</template>');

fs.writeFileSync('src/views/Tools/ToolsIndex.vue', file);
