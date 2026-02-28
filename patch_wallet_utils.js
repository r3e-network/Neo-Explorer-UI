const fs = require('fs');

let code = fs.readFileSync('src/utils/wallet.js', 'utf8');

const targetStr = `    } else if (connectedAccount.value && provider === "WalletConnect") {
       // Ideally we'd restore WC session, but this is handled by the walletService if called.
       // Let's assume the walletService handles session persistence.
    }`;

const newStr = targetStr + ` else if (connectedAccount.value && provider === "Google / Email (Web3Auth)") {
       // Web3Auth handles its own session recovery on init, but we can actively connect it to restore the account memory object.
       import('@/services/walletService').then(({ walletService }) => {
           walletService.connect("Google / Email (Web3Auth)").then(acc => {
               if (acc && acc.address) {
                   connectedAccount.value = acc.address;
               }
           }).catch(() => { /* silent fail on background resume */ });
       });
    }`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/utils/wallet.js', code);
