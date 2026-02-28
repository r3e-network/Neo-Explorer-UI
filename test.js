const { wallet } = require("@cityofzion/neon-js");
const address = 'NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW';
let hash = address;
try {
  if (address && !address.startsWith("0x")) {
    hash = "0x" + wallet.getScriptHashFromAddress(address);
  }
} catch (e) {
  console.log("Error:", e.message);
}
console.log("Result:", hash);
