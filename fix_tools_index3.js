const fs = require('fs');

let toolsIndex = fs.readFileSync('src/views/Tools/ToolsIndex.vue', 'utf8');

const newTool = `      <router-link to="/tools/b64" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">Neo Formatter & Converter</h2>
          <p class="text-sm text-mid mt-1">Easily convert between Base64, Hex strings, UTF-8 text, and ScriptHashes.</p>
        </div>
      </router-link>
      
      <router-link to="/tools/neofs" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">NeoFS Gateway</h2>
          <p class="text-sm text-mid mt-1">Upload files to decentralized containers, search NeoFS object links, and manage your cloud storage.</p>
        </div>
      </router-link>
      
      <router-link to="/tools/candidate-profile" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-fuchsia-100 flex items-center justify-center text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">Candidate Profile Manager</h2>
          <p class="text-sm text-mid mt-1">Update on-chain validator identity, Dora metadata, and upload your official logo directly to NeoFS.</p>
        </div>
      </router-link>`;

toolsIndex = toolsIndex.replace(/<router-link to="\/tools\/b64"[\s\S]*?<\/router-link>/, newTool);

fs.writeFileSync('src/views/Tools/ToolsIndex.vue', toolsIndex);
