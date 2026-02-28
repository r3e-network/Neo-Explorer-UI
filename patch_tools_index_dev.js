const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/ToolsIndex.vue', 'utf8');

const newCards = `
      <router-link to="/tools/abi" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">ABI Encoder / Decoder</h2>
          <p class="text-sm text-mid mt-1">Encode contract payloads or disassemble raw hex scripts into readable instructions.</p>
        </div>
      </router-link>

      <router-link to="/tools/storage" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">Storage Inspector</h2>
          <p class="text-sm text-mid mt-1">Read the direct Key-Value storage state of any smart contract actively on Neo N3.</p>
        </div>
      </router-link>

      <router-link to="/tools/gas" class="etherscan-card p-6 flex flex-col items-start gap-4 hover:border-primary-500 transition-colors group">
        <div class="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-high group-hover:text-primary-500 transition-colors">Gas Estimator</h2>
          <p class="text-sm text-mid mt-1">Simulate a transaction execution and calculate the precise System and Network fee.</p>
        </div>
      </router-link>
    </div>
`;

code = code.replace('    </div>\n    </section>\n  </div>', newCards + '    </section>\n  </div>');
fs.writeFileSync('src/views/Tools/ToolsIndex.vue', code);
