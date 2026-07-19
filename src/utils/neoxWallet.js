// EVM wallet integration for Neo X: one-click "add / switch network" via the
// injected EIP-1193 provider (MetaMask and friends).
//
// Flow (the standard pairing of EIP-3326 + EIP-3085): try
// wallet_switchEthereumChain first — if the wallet already knows Neo X it just
// switches; error 4902 ("unrecognized chain") falls back to
// wallet_addEthereumChain, which pops the wallet's own add-network approval.
// The wallet UI is the consent surface; we never add or switch silently.

import { getNeoxChain, getNeoxNet } from "./neoxEnv";

/** Injected EIP-1193 provider, or null when no EVM wallet is installed. */
export function getEvmProvider() {
  if (typeof window === "undefined") return null;
  const eth = window.ethereum;
  if (!eth || typeof eth.request !== "function") return null;
  return eth;
}

/** EIP-3085 wallet_addEthereumChain params for a Neo X net. */
export function buildAddChainParams(net = getNeoxNet()) {
  const chain = getNeoxChain(net);
  return {
    chainId: `0x${chain.chainId.toString(16)}`,
    chainName: chain.name,
    nativeCurrency: { ...chain.nativeCurrency },
    rpcUrls: [...(chain.publicRpcUrls || [])],
    blockExplorerUrls: [chain.explorerBaseUrl],
  };
}

/** True for the EIP-3326 "chain not added yet" error shape. */
function isUnrecognizedChainError(error) {
  if (!error) return false;
  if (error.code === 4902) return true;
  // Some wallets tunnel the code inside data or only set the message.
  if (error.data?.originalError?.code === 4902) return true;
  return /unrecognized chain|wallet_addethereumchain/i.test(String(error.message || ""));
}

/** True when the user dismissed the wallet prompt (not a real failure). */
export function isUserRejection(error) {
  return error?.code === 4001 || /user rejected|user denied/i.test(String(error?.message || ""));
}

/**
 * Switch the connected EVM wallet to a Neo X net, adding the chain first when
 * the wallet does not know it. Resolves with how it concluded.
 *
 * @param {string} [net] - Neo X net id (defaults to the selected one).
 * @param {Object} [provider] - EIP-1193 provider override (tests).
 * @returns {Promise<"switched"|"added">}
 * @throws {Error} "NO_EVM_WALLET" when no provider is injected; wallet errors
 *   (including user rejections) propagate for the caller to present.
 */
export async function addNeoxChainToWallet(net = getNeoxNet(), provider = getEvmProvider()) {
  if (!provider) {
    const err = new Error("NO_EVM_WALLET");
    err.code = "NO_EVM_WALLET";
    throw err;
  }
  const params = buildAddChainParams(net);
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: params.chainId }],
    });
    return "switched";
  } catch (error) {
    if (!isUnrecognizedChainError(error)) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [params],
    });
    return "added";
  }
}
