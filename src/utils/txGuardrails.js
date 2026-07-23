// Deterministic anomaly analysis for agent-proposed transactions.
//
// The agent proposes an unsigned tx; this layer decorates it with plain
// anomaly flags (unlimited approvals, large transfers, unlabeled counterparties
// / contracts) so the panel can warn before the user signs. PURE + deterministic:
// no wallet, no network, no clock — same proposal in, same flags out.
//
// The UI maps each flag to an i18n string by `code`; `message` is a plain
// English fallback and is not itself localized here.

import { resolveNeoxIdentity } from "@/constants/neoxKnownAddresses";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import { getKnownAddressName } from "@/constants/knownAddresses";
import { parseCalldata } from "@/utils/evmDisasm";

const MAX_UINT256 = (1n << 256n) - 1n;
const GAS_DECIMALS = 10n ** 18n; // Neo X native GAS has 18 decimals (wei-style).
const LARGE_TRANSFER_THRESHOLD_WEI = 100n * GAS_DECIMALS; // 100 GAS
const ERC20_APPROVE_SELECTOR = "0x095ea7b3";

const SEVERITY_RANK = { danger: 0, warn: 1, info: 2 };

// Lowercased set of every N3 / bridge contract we can label, built once.
const KNOWN_CONTRACT_KEYS = new Set(
  Object.keys(KNOWN_CONTRACTS || {}).map((key) => key.trim().toLowerCase()),
);

function normalizeAddr(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Parse a hex/decimal wei value into a BigInt. Non-numeric input → 0n.
 *
 * @param {string|number|bigint} value
 * @returns {bigint}
 */
export function parseHexWei(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return Number.isFinite(value) ? BigInt(Math.trunc(value)) : 0n;
  const raw = String(value ?? "").trim();
  if (!raw) return 0n;
  try {
    if (/^0x[0-9a-f]*$/i.test(raw)) return raw.length <= 2 ? 0n : BigInt(raw);
    if (/^[0-9]+$/.test(raw)) return BigInt(raw);
    if (/^[0-9a-f]+$/i.test(raw)) return BigInt(`0x${raw}`);
  } catch {
    return 0n;
  }
  return 0n;
}

/**
 * Decode an ERC-20 approve(spender, amount) calldata blob.
 *
 * @param {string} data - Transaction input hex.
 * @returns {{ spender: string, amount: bigint, amountWord: string } | null}
 *   null when the calldata is not an approve call.
 */
export function decodeApprove(data) {
  const parsed = parseCalldata(data);
  if (!parsed || normalizeAddr(parsed.selector) !== ERC20_APPROVE_SELECTOR) return null;
  const spenderWord = parsed.words[0]?.hex || "";
  const amountWord = parsed.words[1]?.hex || "";
  const spender = spenderWord ? `0x${spenderWord.slice(-40)}` : "";
  let amount = 0n;
  try {
    amount = amountWord ? BigInt(amountWord) : 0n;
  } catch {
    amount = 0n;
  }
  return { spender, amount, amountWord };
}

/**
 * True when calldata is an ERC-20 approve for the max uint256 amount.
 *
 * @param {string} data - Transaction input hex.
 * @returns {boolean}
 */
export function isUnlimitedApproval(data) {
  const decoded = decodeApprove(data);
  return Boolean(decoded && decoded.amount === MAX_UINT256);
}

function hasCalldata(data) {
  const raw = normalizeAddr(data);
  return raw !== "" && raw !== "0x";
}

function isLabeledNeox(address, net) {
  const key = normalizeAddr(address);
  if (!key) return false;
  if (resolveNeoxIdentity(address, net)) return true;
  return KNOWN_CONTRACT_KEYS.has(key);
}

function analyzeNeoxProposal(proposal, net) {
  const flags = [];
  const tx = proposal.tx || {};
  const to = tx.to;
  const data = tx.data;

  if (parseHexWei(tx.value) >= LARGE_TRANSFER_THRESHOLD_WEI) {
    flags.push({
      level: "warn",
      code: "large_transfer",
      message: "This transaction moves a large amount of native GAS (>= 100 GAS).",
    });
  }

  const approve = decodeApprove(data);
  if (approve && approve.amount === MAX_UINT256) {
    flags.push({
      level: "danger",
      code: "unlimited_approval",
      message: "This is an unlimited token approval — the spender could move your entire balance.",
    });
  }

  // Recipient of the intent: the approval spender when approving, else `to`.
  const recipient = approve ? approve.spender : to;
  if (recipient && !isLabeledNeox(recipient, net)) {
    flags.push({
      level: "info",
      code: "unlabeled_recipient",
      message: "The recipient address is not a labeled / known Neo X address.",
    });
  }

  // A call carrying calldata targets a contract; flag it when unlabeled.
  if (hasCalldata(data) && to && !isLabeledNeox(to, net)) {
    flags.push({
      level: "info",
      code: "unlabeled_contract",
      message: "This calls a contract that is not in the known-contract registry.",
    });
  }

  return flags;
}

function n3DestinationValue(proposal) {
  const args = Array.isArray(proposal.args) ? proposal.args : [];
  if (proposal.operation === "transfer" && args[1]?.type === "Hash160") {
    return args[1].value;
  }
  const hash160s = args.filter((arg) => arg?.type === "Hash160");
  const from = normalizeAddr(proposal.from);
  const candidate = hash160s.find((arg) => normalizeAddr(arg.value) !== from) || hash160s[0];
  return candidate ? candidate.value : "";
}

function analyzeN3Proposal(proposal) {
  const flags = [];
  const destination = n3DestinationValue(proposal);
  if (destination && !getKnownAddressName(destination)) {
    flags.push({
      level: "info",
      code: "unlabeled_recipient",
      message: "The destination address is not a labeled / known Neo N3 address.",
    });
  }
  return flags;
}

/**
 * Analyze an agent proposal for anomalies.
 *
 * @param {Object} proposal - An N3 invoke or Neo X eth_tx proposal.
 * @param {Object} [options]
 * @param {string} [options.net] - Net id used to resolve Neo X identities;
 *   falls back to the proposal's own `network`.
 * @returns {Array<{level:"danger"|"warn"|"info", code:string, message:string}>}
 *   Ordered danger → warn → info, stable within each level.
 */
export function analyzeProposal(proposal, { net } = {}) {
  if (!proposal || typeof proposal !== "object") return [];

  let flags = [];
  if (proposal.chain === "neox" || proposal.kind === "eth_tx") {
    flags = analyzeNeoxProposal(proposal, net || proposal.network);
  } else if (proposal.chain === "n3" || proposal.kind === "invoke") {
    flags = analyzeN3Proposal(proposal);
  }

  return flags
    .map((flag, index) => ({ flag, index }))
    .sort((a, b) => {
      const rankDiff = SEVERITY_RANK[a.flag.level] - SEVERITY_RANK[b.flag.level];
      return rankDiff !== 0 ? rankDiff : a.index - b.index;
    })
    .map(({ flag }) => flag);
}

export default analyzeProposal;
