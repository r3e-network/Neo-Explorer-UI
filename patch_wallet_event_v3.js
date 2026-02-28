const fs = require('fs');
let code = fs.readFileSync('src/utils/wallet.js', 'utf8');

const target = `function setupNeoLineEventListeners() {
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
    window.addEventListener('NEOLine.N3.EVENT.NETWORK_CHANGED', () => {
        // You can add logic here if you want to handle network changes
        // For now, we just log it or we could disconnect the wallet if it doesn't match
    });
}`;

const newContent = `let _neoLineListenersSetup = false;
function setupNeoLineEventListeners() {
    if (typeof window === "undefined" || _neoLineListenersSetup) return;
    _neoLineListenersSetup = true;

    const handleAccountChange = (data) => {
        if (data && data.detail && data.detail.address) {
            connectedAccount.value = data.detail.address;
            localStorage.setItem("connectedWallet", data.detail.address);
        } else {
            connectedAccount.value = "";
            localStorage.removeItem("connectedWallet");
        }
    };

    window.addEventListener('NEOLine.NEO.EVENT.ACCOUNT_CHANGED', handleAccountChange);
    window.addEventListener('NEOLine.N3.EVENT.ACCOUNT_CHANGED', handleAccountChange);
    
    // Fallback: Some NeoLine versions trigger an event without detail, so we do a passive refresh on browser focus
    window.addEventListener('focus', async () => {
        if (connectedAccount.value && window.NEOLineN3) {
            try {
                const neoline = new window.NEOLineN3.Init();
                const account = await neoline.getAccount();
                if (account && account.address && account.address !== connectedAccount.value) {
                    connectedAccount.value = account.address;
                    localStorage.setItem("connectedWallet", account.address);
                }
            } catch(e) {}
        }
    });
}`;

code = code.replace(target, newContent);
fs.writeFileSync('src/utils/wallet.js', code);
