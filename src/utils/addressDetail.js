/**
 * Address detail page helpers: normalization, transfer direction, CSV export.
 */

function toNumber(value, defaultValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function getAddressDetailTabs() {
  return [
    { key: "transactions", label: "Transactions" },
    { key: "tokenTransfers", label: "Token Transfers" },
    { key: "nftTransfers", label: "NFT Transfers" },
    { key: "tokens", label: "Token Holdings" },
    { key: "nfts", label: "NFTs" },
  ];
}

export function normalizeAccountSummary(account = {}, assets = []) {
  const normalizedAssets = Array.isArray(assets) ? assets : [];

  const neoBalance = account.neoBalance ?? account.neo ?? account.NEO ?? account.neo_balance ?? "0";

  const gasBalance = account.gasBalance ?? account.gas ?? account.GAS ?? account.gas_balance ?? "0";

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
    blocktime: tx?.blocktime ?? tx?.timestamp ?? tx?.time ?? 0,
    sender: tx?.sender || tx?.from || tx?.fromAddress || "",
    vmstate: tx?.vmstate || tx?.Vmstate || tx?.VMState || "",
    size: toNumber(tx?.size, 0),
  }));
}

/**
 * Normalize NEP-17 transfer records from the API.
 * @param {Array} transfers - Raw transfer list
 * @returns {Array} Normalized transfer objects
 */
export function normalizeNep17Transfers(transfers = []) {
  const list = Array.isArray(transfers) ? transfers : [];
  return list.map((t) => ({
    txHash: t?.txid || t?.hash || t?.txHash || "",
    timestamp: t?.timestamp ?? t?.blocktime ?? t?.time ?? 0,
    from: t?.from || t?.fromAddress || t?.sender || "",
    to: t?.to || t?.toAddress || t?.receiver || "",
    amount: t?.value ?? t?.amount ?? t?.transferamount ?? "0",
    tokenName: t?.tokenname || t?.symbol || t?.name || "Unknown",
    tokenHash: t?.contract || t?.contractHash || t?.assethash || "",
    decimals: toNumber(t?.decimals, 8),
  }));
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
    from: t?.from || t?.fromAddress || t?.sender || "",
    to: t?.to || t?.toAddress || t?.receiver || "",
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
    if (process.env.NODE_ENV !== "production") console.error("Failed to download CSV:", error);
    alert("Failed to export transactions. Please try again.");
  }
}

export function getPageCount(totalCount = 0, pageSize = 10) {
  const total = toNumber(totalCount, 0);
  const size = Math.max(1, toNumber(pageSize, 10));
  return Math.max(1, Math.ceil(total / size));
}
