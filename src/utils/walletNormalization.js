import { wallet as neonWallet } from "@cityofzion/neon-js";

const HASH160_HEX = /^[0-9a-fA-F]{40}$/;
const HASH160_HEX_PREFIXED = /^0x[0-9a-fA-F]{40}$/;

export function isHash160Hex(value) {
  if (typeof value !== "string") return false;
  const input = value.trim();
  return HASH160_HEX.test(input) || HASH160_HEX_PREFIXED.test(input);
}

export function normalizeHash160(value) {
  if (typeof value !== "string") return value;

  const input = value.trim();
  if (!input) return value;

  if (HASH160_HEX_PREFIXED.test(input)) {
    return input.slice(2).toLowerCase();
  }

  if (HASH160_HEX.test(input)) {
    return input.toLowerCase();
  }

  try {
    return new neonWallet.Account(input).scriptHash.toLowerCase();
  } catch {
    return value;
  }
}

export function normalizeInvokeArgsForRpc(args = []) {
  if (!Array.isArray(args)) return [];

  return args.map((arg) => {
    if (!arg || typeof arg !== "object") return arg;
    if (arg.type !== "Hash160") return arg;

    return {
      ...arg,
      value: normalizeHash160(arg.value),
    };
  });
}

export function normalizeSignersForRpc(signers = []) {
  if (!Array.isArray(signers)) return [];

  return signers.map((signer) => {
    if (!signer || typeof signer !== "object") return signer;
    if (!("account" in signer)) return signer;

    return {
      ...signer,
      account: normalizeHash160(signer.account),
    };
  });
}

export function normalizeSignMessageResult(result) {
  if (!result) return result;

  if (typeof result === "string") {
    return {
      data: result,
      signature: result,
    };
  }

  if (typeof result !== "object") return result;

  const signature = result.signature || result.data || null;
  if (!signature) return result;

  return {
    ...result,
    signature,
  };
}
