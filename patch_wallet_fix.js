const fs = require('fs');

let code = fs.readFileSync('src/utils/wallet.js', 'utf8');

code = code.replace(
    'connectedAccount.value = account.address;\n            localStorage.setItem("connectedWallet", account.address);\n                    localStorage.setItem("connectedWallet", account.address);',
    'connectedAccount.value = account.address;\n                    localStorage.setItem("connectedWallet", account.address);'
);

code = code.replace(
    'connectedAccount.value = "";\n    localStorage.removeItem("connectedWallet");\n                    localStorage.removeItem("connectedWallet");',
    'connectedAccount.value = "";\n                    localStorage.removeItem("connectedWallet");'
);

fs.writeFileSync('src/utils/wallet.js', code);
