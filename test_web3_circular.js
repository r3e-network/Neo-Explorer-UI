const fs = require('fs');
let code = fs.readFileSync('vite.config.js', 'utf8');

const target = `              if (id.includes("axios")) {
                return "axios";
              }`;

const fix = `              if (id.includes("axios")) {
                return "axios";
              }
              if (id.includes("@toruslabs") || id.includes("@web3auth")) {
                return "web3auth";
              }`;

code = code.replace(target, fix);
fs.writeFileSync('vite.config.js', code);
