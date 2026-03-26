import { rpc } from "./api";

function normalizeVmState(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (!normalized) return "";
  if (normalized.includes("FAULT") || normalized === "FAILED" || normalized === "FAIL" || normalized === "ERROR") {
    return "FAULT";
  }
  if (normalized.includes("HALT") || normalized === "SUCCESS" || normalized === "SUCCEEDED") {
    return "HALT";
  }
  return "";
}

function resolveExecutionState(tx = {}, appLog = null) {
  const directState = normalizeVmState(
    tx.vmstate ?? tx.vm_state ?? tx.execution_state ?? tx.executionState ?? tx.state ?? tx.status,
  );
  if (directState) return directState;

  const executionState = normalizeVmState(appLog?.executions?.[0]?.vmstate ?? appLog?.vmstate ?? appLog?.state);
  return executionState;
}

function normalizeBlock(block = {}) {
  const timestamp = Number(block.time ?? block.timestamp ?? 0);
  const txList = Array.isArray(block.tx) ? block.tx : [];
  const txCount = Number(block.txcount ?? block.transactioncount ?? txList.length ?? 0);

  return {
    ...block,
    hash: block.hash || "",
    index: Number(block.index ?? 0),
    timestamp: timestamp > 1e12 ? timestamp : timestamp * 1000,
    tx: txList,
    txcount: txCount,
    transactioncount: txCount,
    nextconsensus: block.nextconsensus ?? block.nextConsensus ?? "",
    primary: block.primary,
    size: Number(block.size ?? 0),
  };
}

function normalizeTx(tx = {}, block = {}, appLog = null) {
  const blockTimestamp = Number(block.time ?? block.timestamp ?? 0);
  const normalizedTime = blockTimestamp > 1e12 ? blockTimestamp : blockTimestamp * 1000;
  const vmstate = resolveExecutionState(tx, appLog);
  return {
    ...tx,
    hash: tx.hash || tx.txid || "",
    blocktime: normalizedTime,
    timestamp: normalizedTime,
    sender: tx.sender || tx.sender_address || "",
    sysfee: tx.sysfee ?? tx.systemFee ?? tx.sys_fee ?? "0",
    netfee: tx.netfee ?? tx.networkFee ?? tx.net_fee ?? "0",
    vmstate,
    status: vmstate === "HALT" ? "success" : vmstate === "FAULT" ? "failed" : tx.status || "",
  };
}

async function enrichTransactionsWithExecutionState(transactions = [], block) {
  const enrichedTransactions = await Promise.all(
    transactions.map(async (tx) => {
      const existingState = resolveExecutionState(tx);
      if (existingState) {
        return normalizeTx(tx, block);
      }

      const hash = String(tx?.hash || tx?.txid || "").trim();
      if (!hash) return normalizeTx(tx, block);

      try {
        const appLog = await rpc("getapplicationlog", [hash]);
        return normalizeTx(tx, block, appLog);
      } catch {
        return normalizeTx(tx, block);
      }
    }),
  );

  return enrichedTransactions;
}

export async function getLatestHomepageSnapshot({ blockLimit = 6, txLimit = 6 } = {}) {
  const safeBlockLimit = Math.max(1, Number(blockLimit) || 6);
  const safeTxLimit = Math.max(1, Number(txLimit) || 6);

  const blockCount = Number(await rpc("getblockcount", []));
  const latestHeight = blockCount - 1;
  if (!Number.isFinite(latestHeight) || latestHeight < 0) {
    return { blocks: [], transactions: [] };
  }

  const heights = Array.from({ length: safeBlockLimit }, (_, index) => latestHeight - index).filter(
    (height) => height >= 0,
  );

  const rawBlocks = await Promise.all(heights.map((height) => rpc("getblock", [height, true])));
  const blocks = rawBlocks.map(normalizeBlock);

  const transactions = [];
  for (const block of blocks) {
    const blockTransactions = await enrichTransactionsWithExecutionState(Array.isArray(block.tx) ? block.tx : [], block);
    for (const tx of blockTransactions) {
      transactions.push(tx);
      if (transactions.length >= safeTxLimit) break;
    }
    if (transactions.length >= safeTxLimit) break;
  }

  return {
    blocks,
    transactions,
  };
}

export default {
  getLatestHomepageSnapshot,
};
