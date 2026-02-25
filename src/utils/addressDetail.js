import { NATIVE_CONTRACTS } from "@/constants";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import { scriptHashToAddress } from "./neoHelpers";

/**
 * Address detail page helpers: normalization, transfer direction, CSV export.
 */

function toNumber(value, defaultValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function toBigInt(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return BigInt(Math.trunc(value));
  }

  const normalized = String(value).trim();
  if (!normalized) return null;
  if (/^-?\d+$/.test(normalized)) return BigInt(normalized);
  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return BigInt(Math.trunc(parsed));
  }
  return null;
}

/**
 * Choose the best candidate vote value from multiple API sources.
 * Returns a stringified integer and ignores empty/invalid values.
 */
export function pickBestCandidateVotes(...sources) {
  let best = 0n;

  const readCandidates = (source) => {
    if (source && typeof source === "object" && !Array.isArray(source)) {
      // Prioritize votes specifically, but check fallback logic correctly
      return [source.votes, source.votesOfCandidate, source.totalVotes, source.balanceOfVoter];
    }
    return [source];
  };

  for (const source of sources) {
    for (const candidate of readCandidates(source)) {
      if (candidate === undefined || candidate === null) continue;
      
      let parsed = null;
      if (typeof candidate === "string" && candidate.includes(".")) {
        // If it's a decimal string (like from some APIs), parse it directly. Votes are whole numbers in NEO.
        parsed = BigInt(Math.trunc(Number(candidate)));
      } else {
        parsed = toBigInt(candidate);
      }
      
      // Some APIs might return votes scaled by 10^8 (like GAS/NEO), but NEO votes shouldn't be scaled by 10^8
      // If we see an absurdly large number like > 10,000,000,000, we might need to downscale it if it was accidentally scaled as NEO
      // Actually, wait, BinanceStaking1 has 8,000,000 votes. But its page shows 10,000,000. That might be accurate or cached differently.
      // Wait, 1 NEO = 1 Vote. So the votes value shouldn't be scaled down. 
      // But if pickBestCandidateVotes takes the highest number, and one API mistakenly returns the *balance* in 10^8 instead of the vote count...
      
      if (parsed !== null && parsed > best) {
        best = parsed;
      }
    }
  }

  // To prevent an API returning raw NEO balance (with 8 decimals) and overriding the actual integer vote count,
  // we check if it's absurdly large (e.g. > 100,000,000 * 10^8, which is impossible since total supply is 100M)
  // Actually, if the value is > 100,000,000 (total NEO supply), it must be a raw balance with 8 decimals!
  if (best > 100000000n) {
     // Downscale it by 10^8 because it's a raw token balance accidentally being passed as votes
     best = best / 100000000n;
  }

  return best.toString();
}

/**
 * Sum voter balances for a candidate (used as fallback vote total).
 */
export function sumCandidateVoterBalances(voters = []) {
  const list = Array.isArray(voters) ? voters : [];
  let total = 0n;

  for (const voter of list) {
    const parsed = toBigInt(voter?.balanceOfVoter ?? voter?.votes ?? voter);
    if (parsed !== null && parsed > 0n) {
      total += parsed;
    }
  }

  return total.toString();
}

export function getAddressDetailTabs(isCandidate = false) {
  const tabs = [
    { key: "transactions", label: "Transactions" },
    { key: "tokenTransfers", label: "Token Transfers" },
    { key: "nftTransfers", label: "NFT Transfers" },
    { key: "tokens", label: "Token Holdings" },
    { key: "nfts", label: "NFTs" },
  ];
  if (isCandidate) {
    tabs.splice(1, 0, { key: "voters", label: "Voters" });
  }
  return tabs;
}

export function normalizeAccountSummary(account = {}, assets = []) {
  const normalizedAssets = Array.isArray(assets) ? assets : [];

  let neoBalance = account.neoBalance ?? account.neo ?? account.NEO ?? account.neo_balance;
  let gasBalance = account.gasBalance ?? account.gas ?? account.GAS ?? account.gas_balance;

  if (neoBalance === undefined) {
    const neoToken = normalizedAssets.find(a => a.asset === "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5");
    neoBalance = neoToken ? String(neoToken.balance) : "0";
  }
  if (gasBalance === undefined) {
    const gasToken = normalizedAssets.find(a => a.asset === "0xd2a4cff31913016155e38e474a2c06d08be276cf");
    gasBalance = gasToken ? String(gasToken.balance) : "0";
  }

  const txCount = toNumber(
    account.txCount ?? account.txcount ?? account.transactioncount ?? account.transactionCount,
    0
  );

  const tokenCount = toNumber(
    account.tokenCount ?? account.tokencount ?? normalizedAssets.length,
    normalizedAssets.length
  );

  return {
    neoBalance: String(neoBalance || "0"),
    gasBalance: String(gasBalance || "0"),
    txCount,
    tokenCount,
  };
}

export function splitAddressAssets(assets = []) {
  const normalizedAssets = Array.isArray(assets) ? assets : [];

  const nftAssets = normalizedAssets.filter((asset) => {
    const standard = String(asset?.standard || asset?.type || "").toUpperCase();
    return standard.includes("NEP11");
  });

  const fungibleAssets = normalizedAssets.filter((asset) => !nftAssets.includes(asset));

  return { fungibleAssets, nftAssets };
}

export function normalizeAddressTransactions(transactions = []) {
  const normalized = Array.isArray(transactions) ? transactions : [];

  return normalized.map((tx) => ({
    hash: tx?.hash || tx?.txid || "",
    blockhash: tx?.blockhash || tx?.blockHash || "",
    blockIndex: toNumber(tx?.blockIndex ?? tx?.blockindex, null),
    blocktime: tx?.blocktime ?? tx?.timestamp ?? tx?.time ?? 0,
    sender: tx?.sender || tx?.from || tx?.fromAddress || "",
    vmstate: tx?.vmstate || tx?.Vmstate || tx?.VMState || "",
    size: toNumber(tx?.size, 0),
    netfee: tx?.netfee || tx?.networkFee || 0,
    sysfee: tx?.sysfee || tx?.systemFee || 0,
    script: tx?.script || "",
    value: tx?.value || 0,
    notifications: tx?.notifications || [],
  }));
}

/**
 * Normalize NEP-17 transfer records from the API.
 * @param {Array} transfers - Raw transfer list
 * @returns {Array} Normalized transfer objects
 */
export function normalizeNep17Transfers(transfers = []) {
  const list = Array.isArray(transfers) ? transfers : [];
  return list.map((t) => {
    const hash = String(t?.contract || t?.contractHash || t?.assethash || "").toLowerCase();
    let tokenName = t?.tokenname || t?.symbol || t?.name;
    let decimals = t?.decimals;
    if (!tokenName && hash) {
      const known = NATIVE_CONTRACTS[hash] || KNOWN_CONTRACTS[hash];
      if (known) {
        if (known.symbol) tokenName = known.symbol;
        if (decimals === undefined && known.decimals !== undefined) decimals = known.decimals;
      }
    }
    
    return {
      txHash: t?.txid || t?.hash || t?.txHash || "",
      timestamp: t?.timestamp ?? t?.blocktime ?? t?.time ?? 0,
      from: scriptHashToAddress(t?.from || t?.fromAddress || t?.sender || ""),
      to: scriptHashToAddress(t?.to || t?.toAddress || t?.receiver || ""),
      amount: t?.value ?? t?.amount ?? t?.transferamount ?? "0",
      tokenName: tokenName || "Unknown",
      tokenHash: hash,
      decimals: toNumber(decimals, hash === "0xd2a4cff31913016155e38e474a2c06d08be276cf" ? 8 : 0),
    };
  });
}

/**
 * Normalize NEP-11 (NFT) transfer records from the API.
 * @param {Array} transfers - Raw transfer list
 * @returns {Array} Normalized transfer objects
 */
export function normalizeNep11Transfers(transfers = []) {
  const list = Array.isArray(transfers) ? transfers : [];
  return list.map((t) => ({
    txHash: t?.txid || t?.hash || t?.txHash || "",
    timestamp: t?.timestamp ?? t?.blocktime ?? t?.time ?? 0,
    from: scriptHashToAddress(t?.from || t?.fromAddress || t?.sender || ""),
    to: scriptHashToAddress(t?.to || t?.toAddress || t?.receiver || ""),
    tokenId: t?.tokenid || t?.tokenId || t?.token_id || "",
    tokenName: t?.tokenname || t?.symbol || t?.name || "Unknown",
    tokenHash: t?.contract || t?.contractHash || t?.assethash || "",
  }));
}

/**
 * Determine transfer direction relative to the current address.
 * @param {string} from - Sender address
 * @param {string} to - Receiver address
 * @param {string} currentAddress - The address being viewed
 * @returns {{ label: string, cssClass: string }}
 */
export function getTransferDirection(from, to, currentAddress) {
  const addr = (currentAddress || "").toLowerCase();
  const f = (from || "").toLowerCase();
  const t = (to || "").toLowerCase();

  if (f === addr && t === addr) {
    return { label: "SELF", cssClass: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" };
  }
  if (t === addr) {
    return { label: "IN", cssClass: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300" };
  }
  if (f === addr) {
    return { label: "OUT", cssClass: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300" };
  }
  return { label: "SELF", cssClass: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" };
}

/**
 * Parse a transaction method/type into a human-readable badge label.
 * @param {Object} tx - Transaction object
 * @returns {string}
 */
export function parseTxMethod(tx) {
  const method = tx?.method || tx?.type || tx?.calltype || "";
  if (!method) return "Transaction";

  const lower = method.toLowerCase();
  if (lower.includes("transfer")) return "Transfer";
  if (lower.includes("vote")) return "Vote";
  if (lower.includes("deploy")) return "Deploy";
  if (lower.includes("invoke")) return "Invoke";
  if (lower.includes("claim")) return "Claim";
  if (lower.includes("register")) return "Register";
  return method.length > 14 ? method.slice(0, 14) + "..." : method;
}

/**
 * Generate a CSV string from transaction data and trigger a download.
 * @param {Array} transactions - Array of transaction objects
 * @param {string} filename - Download filename
 */
export function downloadTransactionsCsv(transactions = [], filename = "transactions.csv") {
  try {
    const headers = ["Txn Hash", "Block Time", "Sender", "Status", "Size"];
    const rows = (transactions || []).map((tx) => [
      tx.hash || "",
      tx.blocktime ? new Date(tx.blocktime > 1e12 ? tx.blocktime : tx.blocktime * 1000).toISOString() : "",
      tx.sender || "",
      tx.vmstate || "",
      tx.size ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    if (import.meta.env.DEV) console.error("Failed to download CSV:", error);
    alert("Failed to export transactions. Please try again.");
  }
}

export function getPageCount(totalCount = 0, pageSize = 10) {
  const total = toNumber(totalCount, 0);
  const size = Math.max(1, toNumber(pageSize, 10));
  return Math.max(1, Math.ceil(total / size));
}
