const { ethers } = require('ethers');
const { sc, u } = require('@cityofzion/neon-js');

const addrHex = '11223344556677889900aabbccddeeff11223344';
const padded = ethers.zeroPadValue(`0x${addrHex}`, 32);
console.log('Ethers Padded:', padded);

const contractParam = sc.ContractParam.hash160(addrHex);
const raw = u.HexString.fromHex(contractParam.value).toRawBytes();

const result = new Uint8Array(32);
for (let i = 0; i < 20; i++) {
    result[12 + i] = raw[19 - i];
}
console.log('C# Reconstructed:', u.HexString.fromHex(Buffer.from(result).toString('hex')).toHex());
