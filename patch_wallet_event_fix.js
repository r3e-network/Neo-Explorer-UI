const fs = require('fs');
let code = fs.readFileSync('src/utils/wallet.js', 'utf8');

code = code.replace(/function setupNeoLineEventListeners\(neoline\)/, 'function setupNeoLineEventListeners()');
code = code.replace(/setupNeoLineEventListeners\(neoline\)/g, 'setupNeoLineEventListeners()');

code = code.replace(/window\.addEventListener\('NEOLine\.N3\.EVENT\.NETWORK_CHANGED', \(data\) => \{/, 'window.addEventListener(\'NEOLine.N3.EVENT.NETWORK_CHANGED\', () => {');

fs.writeFileSync('src/utils/wallet.js', code);
