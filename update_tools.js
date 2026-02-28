const fs = require('fs');

let toolsIndex = fs.readFileSync('src/views/Tools/ToolsIndex.vue', 'utf8');

const newMultiSigCard = `<router-link to="/tools/multisig" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">Multi-Signature Wallet</h2>
          <p class="text-sm text-mid mt-1">Create and manage multi-sig transactions, collect signatures from co-owners, and broadcast to the network.</p>
        </div>
      </router-link>`;
      
const newGovCard = `<router-link to="/tools/governance" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">Council Governance</h2>
          <p class="text-sm text-mid mt-1">Official council tool to create proposals, manage network policies, and coordinate validator voting.</p>
        </div>
      </router-link>`;

toolsIndex = toolsIndex.replace(/<router-link to="\/tools\/multisig"[\s\S]*?<\/router-link>/, newMultiSigCard + '\n      \n      ' + newGovCard);

fs.writeFileSync('src/views/Tools/ToolsIndex.vue', toolsIndex);
