const { u } = require('@cityofzion/neon-js');
const hex1 = '01'; // 1
const hex2 = 'ff'; // -1
const reversed1 = u.reverseHex(hex1);
const reversed2 = u.reverseHex(hex2);
// BigInteger in neon-js:
console.log(u.BigInteger.fromHex(reversed1, true).toString()); // true for signed/little-endian?
console.log(u.BigInteger.fromHex(reversed2, true).toString()); 
