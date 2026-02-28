const { u } = require('@cityofzion/neon-js');

function hexToSignedBigInt(hex) {
    if (!hex) return 0n;
    // little endian, so reverse it
    const reversed = u.reverseHex(hex);
    // get bits
    const bits = reversed.length * 4;
    let num = BigInt('0x' + reversed);
    // check MSB
    const maxVal = 1n << BigInt(bits);
    const msb = 1n << BigInt(bits - 1);
    if ((num & msb) !== 0n) {
        num = num - maxVal;
    }
    return num;
}

console.log(hexToSignedBigInt('01').toString()); // 1
console.log(hexToSignedBigInt('ff').toString()); // -1
console.log(hexToSignedBigInt('ffff').toString()); // -1
console.log(hexToSignedBigInt('00ff').toString()); // 65280
console.log(hexToSignedBigInt('0001').toString()); // 256
