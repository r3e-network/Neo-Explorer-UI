const fs = require('fs');

let code = fs.readFileSync('src/utils/wallet.js', 'utf8');

// replace connectedAccount definition
code = code.replace(
  'export const connectedAccount = ref("");',
  'export const connectedAccount = ref(typeof window !== "undefined" ? localStorage.getItem("connectedWallet") || "" : "");\n\nexport async function initWallet() {\n    if (connectedAccount.value) {\n        const hasNeoLine = await waitForNeoLineN3(1000);\n        if (hasNeoLine) {\n            try {\n                const neoline = new window.NEOLineN3.Init();\n                const account = await neoline.getAccount();\n                if (account && account.address) {\n                    connectedAccount.value = account.address;\n                    localStorage.setItem("connectedWallet", account.address);\n                } else {\n                    connectedAccount.value = "";\n                    localStorage.removeItem("connectedWallet");\n                }\n            } catch (e) {\n                connectedAccount.value = "";\n                localStorage.removeItem("connectedWallet");\n            }\n        }\n    }\n}'
);

// replace connectWallet saving
code = code.replace(
  'connectedAccount.value = account.address;',
  'connectedAccount.value = account.address;\n            localStorage.setItem("connectedWallet", account.address);'
);

// replace disconnectWallet
code = code.replace(
  'connectedAccount.value = "";',
  'connectedAccount.value = "";\n    localStorage.removeItem("connectedWallet");'
);

fs.writeFileSync('src/utils/wallet.js', code);
