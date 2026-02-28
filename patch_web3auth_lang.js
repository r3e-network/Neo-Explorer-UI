const fs = require('fs');

let code = fs.readFileSync('src/services/web3authService.js', 'utf8');

const web3AuthInitTarget = `      _web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_mainnet", // Set to sapphire_mainnet as default for Neo3Scan production
        privateKeyProvider: privateKeyProvider,
      });`;

const web3AuthInitNew = `      const lang = localStorage.getItem("lang") || "en";
      const w3aLang = lang.startsWith('zh') ? 'zh' : lang; // Web3Auth supports 'en', 'de', 'ja', 'ko', 'zh', 'es', 'fr', 'pt', 'nl'

      const isDarkMode = document.documentElement.classList.contains("dark");

      _web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_mainnet", 
        privateKeyProvider: privateKeyProvider,
        uiConfig: {
          defaultLanguage: w3aLang,
          mode: isDarkMode ? "dark" : "light",
          theme: {
            primary: "#00E599" // Neo green
          }
        }
      });`;

if (code.includes(web3AuthInitTarget)) {
    code = code.replace(web3AuthInitTarget, web3AuthInitNew);
    fs.writeFileSync('src/services/web3authService.js', code);
    console.log("Patched");
} else {
    console.log("Not found, already patched?");
}
