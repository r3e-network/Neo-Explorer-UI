const fs = require('fs');

let code = fs.readFileSync('src/services/web3authService.js', 'utf8');

const targetStr = `  rpcTarget: "https://rpc.ankr.com/eth",`;
const newStr = `  rpcTarget: "https://cloudflare-eth.com",`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/services/web3authService.js', code);
