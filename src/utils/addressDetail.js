export function getAddressDetailTabs() {
  return [
    { key: "transactions", label: "Transactions" },
    { key: "tokens", label: "Token Holdings" },
    { key: "nfts", label: "NFTs" },
  ];
}

function toNumber(value, defaultValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function normalizeAccountSummary(account = {}, assets = []) {
  const normalizedAssets = Array.isArray(assets) ? assets : [];

  const neoBalance =
    account.neoBalance ?? account.neo ?? account.NEO ?? account.neo_balance ?? "0";

  const gasBalance =
    account.gasBalance ?? account.gas ?? account.GAS ?? account.gas_balance ?? "0";

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

export function getPageCount(totalCount = 0, pageSize = 10) {
  const total = toNumber(totalCount, 0);
  const size = Math.max(1, toNumber(pageSize, 10));
  return Math.max(1, Math.ceil(total / size));
}

export default {
  getAddressDetailTabs,
  normalizeAccountSummary,
  splitAddressAssets,
  normalizeAddressTransactions,
  getPageCount,
};
