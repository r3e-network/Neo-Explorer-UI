// SDK Compatibility Layer for @r3e/neo-js-sdk
// Provides missing functions from old neon-js API

import { base64ToBytes, bytesToBase64, hexToBytes, bytesToHex } from "@r3e/neo-js-sdk";

export const hex2base64 = (hex) => bytesToBase64(hexToBytes(hex));
export const base642hex = (base64) => bytesToHex(base64ToBytes(base64));

// BigInteger is now native BigInt in new SDK
export const BigInteger = BigInt;
