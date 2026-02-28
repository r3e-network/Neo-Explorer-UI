const fs = require('fs');

let code = fs.readFileSync('src/components/layout/AppHeader.vue', 'utf8');

const targetStr = `<img v-else-if="provider === 'WalletConnect'" :src="'/img/brand/walletconnect.png'" alt="WalletConnect" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />`;

const newStr = `<img v-else-if="provider === 'WalletConnect'" :src="'/img/brand/walletconnect.png'" alt="WalletConnect" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                  <img v-else-if="provider === 'Google / Email (Web3Auth)'" :src="'/img/brand/web3auth.png'" alt="Web3Auth" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/components/layout/AppHeader.vue', code);
