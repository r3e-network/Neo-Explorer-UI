const fs = require('fs');

let code = fs.readFileSync('src/utils/wallet.js', 'utf8');

// The NeoLine extension fires 'NEOLine.NEO.EVENT.ACCOUNT_CHANGED' consistently across some versions,
// while newer ones fire N3 explicitly. Let's add listeners for both to be perfectly safe.

const eventListenerSetup = `
let _neoLineListenersSetup = false;
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
    
    // Some NeoLine versions trigger an event without detail, so we might need a manual refresh on focus
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
}
`;

code = code.replace(/function setupNeoLineEventListeners\(\) \{[\s\S]*?\}\n/, eventListenerSetup);

fs.writeFileSync('src/utils/wallet.js', code);
