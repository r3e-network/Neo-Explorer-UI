const { u } = require('@cityofzion/neon-js');
console.log(u.BigInteger.fromTwos('ff').toString());
console.log(u.BigInteger.fromTwos('ff00').toString());
console.log(u.BigInteger.fromTwos('00ff').toString());
