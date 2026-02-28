const { u } = require('@cityofzion/neon-js');
const hex1 = '01'; // 1
const hex2 = 'ff'; // -1
console.log(new u.HexString(hex1).toNumber());
console.log(new u.HexString(hex2).toNumber());
