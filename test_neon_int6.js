const { u, sc } = require('@cityofzion/neon-js');
const hex = sc.ContractParam.integer(-1).toLittleEndian();
console.log("-1 is", hex);

const hex2 = sc.ContractParam.integer(255).toLittleEndian();
console.log("255 is", hex2);

// how do we decode hex to BigInteger using neon-js correctly?
console.log(u.BigInteger.fromHex(u.reverseHex(hex), true).toString()); 
