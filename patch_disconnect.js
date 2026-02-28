const fs = require('fs');

let code = fs.readFileSync('src/components/layout/AppHeader.vue', 'utf8');

code = code.replace(
  'await disconnectWallet();',
  'await disconnectWallet();\n      walletService.disconnect();\n      localStorage.removeItem("walletProvider");'
);

fs.writeFileSync('src/components/layout/AppHeader.vue', code);
