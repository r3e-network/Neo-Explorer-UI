const fs = require('fs');

let code = fs.readFileSync('vite.config.js', 'utf8');

// The standard Web3Auth lib doesn't always play nice out of the box with Vite without Node core polyfills (buffer, process, events).
// Since the project already uses \`bignumber.js\` and \`crypto-js\`, let's see what happens on build.
