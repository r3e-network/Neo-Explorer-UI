const fs = require('fs');
let file = fs.readFileSync('src/views/Tools/MultiSigTool.vue', 'utf8');

// I might have replaced the New Request button back with the old string during an earlier edit?
// Let's re-inject the wallet button.

const oldBtn = `<button @click="showCreateModal = true" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        New Request
      </button>`;
      
const newBtn = `<div class="flex items-center gap-3">
        <button 
          v-if="!connectedAccount" 
          @click="connectWallet" 
          class="inline-flex items-center gap-2 rounded-lg bg-surface-elevated border border-line-soft px-4 py-2 text-sm font-semibold text-high hover:border-primary-500 transition-colors"
        >
          Connect Wallet
        </button>
        <button 
          v-else
          @click="showCreateModal = true" 
          class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors active:scale-95"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          New Request
        </button>
      </div>`;
      
file = file.replace(oldBtn, newBtn);

fs.writeFileSync('src/views/Tools/MultiSigTool.vue', file);
