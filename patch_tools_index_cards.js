const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/ToolsIndex.vue', 'utf8');

const newCards = `
      <router-link to="/tools/deployer" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">Contract Deployer</h2>
          <p class="text-sm text-mid mt-1">Directly upload and deploy pre-compiled .nef and manifest.json files to the network.</p>
        </div>
      </router-link>

      <router-link to="/tools/factory" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">Contract Factory</h2>
          <p class="text-sm text-mid mt-1">Configure and launch standard NEP-17 tokens, Meme coins, and NFT collections without writing code.</p>
        </div>
      </router-link>
    </div>
`;

code = code.replace('    </div>\n    </section>\n  </div>', newCards + '    </section>\n  </div>');
fs.writeFileSync('src/views/Tools/ToolsIndex.vue', code);
