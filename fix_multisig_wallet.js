const fs = require('fs');

let file = fs.readFileSync('src/views/Tools/MultiSigTool.vue', 'utf8');

const oldButton = `<button @click="showCreateModal = true" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors active:scale-95">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        New Request
      </button>`;

const newButton = `<div class="flex items-center gap-3">
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

file = file.replace(oldButton, newButton);


const oldImport = `import { ref, onMounted } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import { supabaseService } from "@/services/supabaseService";
// eslint-disable-next-line no-unused-vars
const _ = supabaseService;`;

const newImport = `import { ref, onMounted, computed } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount, connectWallet, disconnectWallet } from '@/utils/wallet';
// eslint-disable-next-line no-unused-vars
const _ = supabaseService;`;

file = file.replace(oldImport, newImport);

fs.writeFileSync('src/views/Tools/MultiSigTool.vue', file);

