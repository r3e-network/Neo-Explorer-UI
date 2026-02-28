const fs = require('fs');

let code = fs.readFileSync('src/utils/wallet.js', 'utf8');

const eventListenerSetup = `
function setupNeoLineEventListeners(neoline) {
    if (typeof window === "undefined") return;

    // Listen for account changes
    window.addEventListener('NEOLine.N3.EVENT.ACCOUNT_CHANGED', (data) => {
        if (data && data.detail && data.detail.address) {
            connectedAccount.value = data.detail.address;
            localStorage.setItem("connectedWallet", data.detail.address);
        } else {
            connectedAccount.value = "";
            localStorage.removeItem("connectedWallet");
        }
    });

    // Listen for network changes (optional but good practice)
    window.addEventListener('NEOLine.N3.EVENT.NETWORK_CHANGED', (data) => {
        // You can add logic here if you want to handle network changes
        // For now, we just log it or we could disconnect the wallet if it doesn't match
    });
}
`;

// Inject before initWallet
code = code.replace('export async function initWallet() {', eventListenerSetup + '\nexport async function initWallet() {');

// Inject into initWallet
code = code.replace(
    'const neoline = new window.NEOLineN3.Init();\n                const account = await neoline.getAccount();',
    'const neoline = new window.NEOLineN3.Init();\n                setupNeoLineEventListeners(neoline);\n                const account = await neoline.getAccount();'
);

// Inject into connectWallet
code = code.replace(
    'const neoline = new window.NEOLineN3.Init();\n            \n            // Check network matching',
    'const neoline = new window.NEOLineN3.Init();\n            setupNeoLineEventListeners(neoline);\n            \n            // Check network matching'
);

fs.writeFileSync('src/utils/wallet.js', code);
