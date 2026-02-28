const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/ToolsIndex.vue', 'utf8');

const newCard = `
      <router-link to="/tools/sponsored" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">Sponsored Transactions</h2>
          <p class="text-sm text-mid mt-1">Claim GAS or vote without paying fees via a designated sponsor wallet.</p>
        </div>
      </router-link>
    </div>
`;

code = code.replace('    </div>\n    </section>\n  </div>', newCard + '    </section>\n  </div>');
fs.writeFileSync('src/views/Tools/ToolsIndex.vue', code);
