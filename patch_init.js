const fs = require('fs');

let code = fs.readFileSync('src/utils/wallet.js', 'utf8');

const targetStr = `export async function initWallet() {
    if (connectedAccount.value) {
        const hasNeoLine = await waitForNeoLineN3(1000);
        if (hasNeoLine) {
            try {
                const neoline = new window.NEOLineN3.Init();
                setupNeoLineEventListeners();
                const account = await neoline.getAccount();
                if (account && account.address) {
                    connectedAccount.value = account.address;
                    localStorage.setItem("connectedWallet", account.address);
                } else {
                    connectedAccount.value = "";
                    localStorage.removeItem("connectedWallet");
                }
            } catch (e) {
                connectedAccount.value = "";
                localStorage.removeItem("connectedWallet");
            }
        }
    }
}`;

const newStr = `export async function initWallet() {
    if (typeof window === "undefined") return;
    
    // Attempt generic reconnect if we had an active session stored
    const provider = localStorage.getItem("walletProvider");
    
    if (connectedAccount.value && provider === "NeoLine") {
        const hasNeoLine = await waitForNeoLineN3(1000);
        if (hasNeoLine) {
            try {
                const neoline = new window.NEOLineN3.Init();
                setupNeoLineEventListeners();
                const account = await neoline.getAccount();
                if (account && account.address) {
                    connectedAccount.value = account.address;
                    localStorage.setItem("connectedWallet", account.address);
                } else {
                    connectedAccount.value = "";
                    localStorage.removeItem("connectedWallet");
                }
            } catch (e) {
                connectedAccount.value = "";
                localStorage.removeItem("connectedWallet");
            }
        }
    } else if (connectedAccount.value && provider === "O3") {
       if (window.neo3Dapi) {
           try {
              const account = await window.neo3Dapi.getAccount();
              if (account && account.address) {
                  connectedAccount.value = account.address;
              }
           } catch(e) {}
       }
    } else if (connectedAccount.value && provider === "WalletConnect") {
       // Ideally we'd restore WC session, but this is handled by the walletService if called.
       // Let's assume the walletService handles session persistence.
    }
}`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/utils/wallet.js', code);
