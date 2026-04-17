// SDK Compatibility Layer — pure JS, no external SDK dependency

function hexToBytes(hex) {
  const h = String(hex || "").replace(/^0x/i, "");
  return Uint8Array.from((h.match(/../g) || []), (b) => parseInt(b, 16));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const hex2base64 = (hex) => btoa(String.fromCharCode(...hexToBytes(hex)));
export const base642hex = (base64) => bytesToHex(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));

// BigInteger is now native BigInt
export const BigInteger = BigInt;
