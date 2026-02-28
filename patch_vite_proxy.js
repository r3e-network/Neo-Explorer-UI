const fs = require('fs');
let code = fs.readFileSync('vite.config.js', 'utf8');

if (!code.includes('/neotube-api')) {
    const proxyStr = `
        "/neotube-api": {
          target: "https://api.neotube.io",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\\/neotube-api/, ""),
        },
        "/api/mainnet/primary":`;
    
    code = code.replace('"/api/mainnet/primary":', proxyStr);
    fs.writeFileSync('vite.config.js', code);
}
