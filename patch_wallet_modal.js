const fs = require('fs');

let code = fs.readFileSync('src/components/layout/AppHeader.vue', 'utf8');

// I will create a modal to select wallet if not connected

const modalHtml = `
    <transition name="fade">
      <div v-if="showWalletModal" class="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div class="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-line-soft overflow-hidden relative" @click.stop>
          <div class="px-6 py-4 border-b border-line-soft flex items-center justify-between">
            <h2 class="text-lg font-bold text-high">Connect Wallet</h2>
            <button @click="showWalletModal = false" class="text-low hover:text-high transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div class="p-6 space-y-3">
            <button 
              v-for="provider in availableProviders" 
              :key="provider"
              @click="handleConnect(provider)"
              class="w-full flex items-center justify-between p-4 rounded-xl border border-line-soft bg-surface-muted hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all group"
            >
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center border border-line-soft p-2">
                  <img v-if="provider === 'NeoLine'" src="/img/brand/neoline.png" alt="NeoLine" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                  <img v-else-if="provider === 'O3'" src="/img/brand/o3.png" alt="O3" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                  <img v-else src="/img/brand/walletconnect.png" alt="WalletConnect" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                </div>
                <span class="font-semibold text-high group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{{ provider }}</span>
              </div>
              <svg class="w-5 h-5 text-low group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </transition>
    
    <WalletConnectModal v-if="wcUri" :uri="wcUri" :visible="!!wcUri" @close="wcUri = ''" />
`;

code = code.replace('</header>\n</template>', modalHtml + '\n  </header>\n</template>');

const imports = `import WalletConnectModal from "@/views/Contract/components/WalletConnectModal.vue";\nimport { walletService } from "@/services/walletService";`;
code = code.replace('import { connectedAccount, connectWallet, disconnectWallet, initWallet } from "@/utils/wallet";', 'import { connectedAccount, connectWallet, disconnectWallet, initWallet } from "@/utils/wallet";\n' + imports);

const refSetup = `const showWalletModal = ref(false);
const availableProviders = ref([]);
const wcUri = ref("");

async function handleConnect(provider) {
  showWalletModal.value = false;
  walletLoading.value = true;
  try {
     const result = await walletService.connect(provider);
     if (result?.uri && result?.approval) {
        wcUri.value = result.uri;
        walletLoading.value = false;
        
        try {
          const account = await result.approval;
          wcUri.value = "";
          connectedAccount.value = account.address;
          localStorage.setItem("connectedWallet", account.address);
          localStorage.setItem("walletProvider", provider);
        } catch(e) {
          wcUri.value = "";
        }
        return;
     }
     
     if (result && result.address) {
       connectedAccount.value = result.address;
       localStorage.setItem("connectedWallet", result.address);
       localStorage.setItem("walletProvider", provider);
     }
  } catch (err) {
     console.error(err);
  } finally {
     walletLoading.value = false;
  }
}
`;

code = code.replace('async function toggleWallet() {', refSetup + '\nasync function toggleWallet() {');
code = code.replace('await connectWallet();', 'availableProviders.value = walletService.getAvailableProviders();\n    showWalletModal.value = true;');

fs.writeFileSync('src/components/layout/AppHeader.vue', code);
