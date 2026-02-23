import bs58 from 'bs58';
import { sha256 } from 'js-sha256';

function reverseHex(value) {
  const bytes = value.match(/../g);
  return bytes.reverse().join("");
}
function hexToBytes(value) {
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(value.substr(i * 2, 2), 16);
  }
  return bytes;
}
function scriptHashHexToAddress(scriptHashHex) {
  const normalized = scriptHashHex.replace('0x', '').toLowerCase();
  const scriptHashBigEndian = reverseHex(normalized);
  const scriptHashBytes = hexToBytes(scriptHashBigEndian);
  const payload = new Uint8Array(1 + scriptHashBytes.length);
  payload[0] = 0x35; // N
  payload.set(scriptHashBytes, 1);
  const checksum = sha256.create().update(sha256.create().update(payload).array()).array().slice(0, 4);
  const result = new Uint8Array(payload.length + checksum.length);
  result.set(payload);
  result.set(checksum, payload.length);
  return bs58.encode(result);
}

console.log(scriptHashHexToAddress("0x2a0766d377c52c57e4ba3d884945b6635484cf5b"));
