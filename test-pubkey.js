const { wallet } = require('@cityofzion/neon-js');
const pubkey = '0239a37436652f41b3b802ca44cbcb7d65d3aa0b88c9a0380243bdbe1aaa5cb35b'; // The Neo Order
const account = new wallet.Account(pubkey);
console.log('Address:', account.address);
console.log('ScriptHash:', account.scriptHash);
