export function exportToCSV(data, filename) {
  if (!data || !data.length) {
    console.warn("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ];

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToJSON(data, filename) {
  if (!data) {
    console.warn("No data to export");
    return;
  }

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.json`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function flattenObject(obj, prefix = "") {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + "." : "";
    if (
      typeof obj[k] === "object" &&
      obj[k] !== null &&
      !Array.isArray(obj[k])
    ) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
}

export function exportTransactionsToCSV(transactions) {
  const flatData = transactions.map((tx) => ({
    hash: tx.hash,
    block: tx.block,
    time: tx.time,
    from: tx.from || tx.sender,
    to: tx.to || tx.receiver,
    value: tx.value || tx.amount || 0,
    fee: tx.netfee || tx.sysfee || 0,
    status: tx.status || tx.vmstate || "",
  }));
  exportToCSV(flatData, `transactions_${Date.now()}`);
}

export function exportBlocksToCSV(blocks) {
  const flatData = blocks.map((block) => ({
    index: block.index || block.blockindex,
    hash: block.hash,
    time: block.time,
    tx_count: block.txcount || block.tx_count || 0,
    size: block.size,
    gas_used: block.gasused || block.netfee || 0,
  }));
  exportToCSV(flatData, `blocks_${Date.now()}`);
}

export function exportTransfersToCSV(transfers) {
  const flatData = transfers.map((t) => ({
    tx_hash: t.txhash || t.hash,
    block: t.blockindex || t.block,
    timestamp: t.timestamp || t.time,
    from: t.from_address || t.from,
    to: t.to_address || t.to,
    amount: t.amount || t.value,
    token: t.token || t.contract,
  }));
  exportToCSV(flatData, `transfers_${Date.now()}`);
}

export function exportTokenHoldersToCSV(holders) {
  const flatData = holders.map((h) => ({
    address: h.address,
    balance: h.balance || h.amount,
    percentage: h.percent || h.percentage,
  }));
  exportToCSV(flatData, `holders_${Date.now()}`);
}
