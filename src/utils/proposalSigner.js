// Hands an agent-proposed, unsigned transaction to the USER's own wallet.
//
// Non-custodial by construction: this module NEVER builds a signature, holds a
// key, or signs a raw transaction. It only routes a proposal to the connected
// wallet, which performs the signing and broadcast:
//   - N3 invoke  → walletService.invoke (NeoLine / WalletConnect / OneGate)
//   - Neo X eth_tx → injected EVM provider's eth_sendTransaction (MetaMask)
// The wallet fills the nonce, signs, and submits; we receive a tx id back.

import { walletService } from "@/services/walletService";
import { getEvmProvider, isUserRejection } from "@/utils/neoxWallet";

/** Thrown when a proposal can't be routed to a wallet (bad shape / no wallet). */
export class ProposalSignerError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ProposalSignerError";
    if (code) this.code = code;
  }
}

// Tag a wallet's user-rejection error so callers can recognize a dismissal
// (vs a real failure) without re-sniffing provider-specific error shapes.
function tagUserRejected(error) {
  const err = error instanceof Error ? error : new Error("User rejected the request");
  err.userRejected = true;
  if (err.code === undefined) err.code = 4001;
  return err;
}

// Proposal args are neon ContractParam objects; over the wire they arrive as
// plain { type, value }. walletService.invoke re-normalizes them internally
// (normalizeArgForDapi), so we only need to hand it clean { type, value } pairs.
function toContractParamArgs(args) {
  if (!Array.isArray(args)) return [];
  return args.map((arg) => ({ type: arg?.type, value: arg?.value }));
}

async function signN3Proposal(proposal) {
  const invokeParams = {
    scriptHash: proposal.scriptHash,
    operation: proposal.operation,
    // Convert neon ContractParam args → dApi { type, value } shape.
    args: toContractParamArgs(proposal.args),
  };
  // Signers already carry { account, scopes }; walletService normalizes the
  // "CalledByEntry" scope string to its numeric value. Omit to use the default.
  if (Array.isArray(proposal.signers)) invokeParams.signers = proposal.signers;

  let result;
  try {
    result = await walletService.invoke(invokeParams);
  } catch (error) {
    if (isUserRejection(error)) throw tagUserRejected(error);
    throw error;
  }
  return { chain: "n3", txid: result?.txid || result?.txHash || "" };
}

async function signNeoxProposal(proposal) {
  const provider = getEvmProvider();
  if (!provider) {
    throw new ProposalSignerError("No EVM wallet provider is available", "no_provider");
  }
  if (!proposal.tx || typeof proposal.tx !== "object") {
    throw new ProposalSignerError("Neo X proposal is missing its tx payload", "invalid_proposal");
  }

  let txHash;
  try {
    // The wallet fills nonce, signs, and broadcasts; we never touch the key.
    txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [proposal.tx],
    });
  } catch (error) {
    if (isUserRejection(error)) throw tagUserRejected(error);
    throw error;
  }
  return { chain: "neox", txHash };
}

/**
 * Route an agent proposal to the user's wallet for signing + submission.
 *
 * @param {Object} proposal - An N3 invoke or Neo X eth_tx proposal.
 * @returns {Promise<{chain:"n3", txid:string} | {chain:"neox", txHash:string}>}
 * @throws {ProposalSignerError} when the proposal is malformed or no wallet is present.
 * @throws {Error} wallet errors; user rejections are re-thrown tagged `userRejected`.
 */
export async function signProposal(proposal) {
  if (!proposal || typeof proposal !== "object") {
    throw new ProposalSignerError("A proposal object is required", "invalid_proposal");
  }

  if (proposal.chain === "n3" || proposal.kind === "invoke") {
    return signN3Proposal(proposal);
  }
  if (proposal.chain === "neox" || proposal.kind === "eth_tx") {
    return signNeoxProposal(proposal);
  }

  throw new ProposalSignerError(
    `Unsupported proposal (chain=${proposal.chain}, kind=${proposal.kind})`,
    "unsupported_proposal",
  );
}

export default signProposal;
