export function isValidHash(str) {
  return /^(0x)?[0-9a-f]{64}$/i.test(str);
}

export function isValidAddress(str) {
  return /^N[0-9a-zA-Z]{33}$/.test(str);
}

export function isValidContract(str) {
  return /^(0x)?[0-9a-f]{40}$/i.test(str);
}
