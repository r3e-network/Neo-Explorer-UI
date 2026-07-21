// CSV export for Neo X (EVM) list rows.
//
// Builds spreadsheet-friendly CSVs from the adapted row shapes
// (`toXBlock` / `toXTransaction` in @/adapters/neox). Low-level CSV plumbing
// (cell escaping incl. formula-injection guard, UTF-8 BOM, blob download)
// is reused from @/utils/dataExport; amounts are converted from base units
// here with UNGROUPED decimal strings because "1,234.5" would split into two
// CSV cells and breaks numeric parsing in spreadsheets.

import { CSV_BOM, escapeCsvValue, downloadBlob } from "@/utils/dataExport";
import { resolveNeoxIdentity } from "@/constants/neoxKnownAddresses";
import { getNeoxNet } from "@/utils/neoxEnv";

/**
 * Base-unit integer → plain decimal string (no thousands separators).
 * BigInt-exact; full fractional precision with trailing zeros trimmed.
 * Mirrors neoxFormat.formatUnits minus the grouping, which is why it lives
 * here instead of changing the display formatter.
 *
 * @param {string|number|bigint} value
 * @param {number} decimals
 * @returns {string} Decimal string, or "" for absent/invalid input.
 */
export function toPlainUnits(value, decimals) {
  if (value === undefined || value === null || value === "") return "";
  try {
    const raw = BigInt(String(value).split(".")[0]);
    const negative = raw < 0n;
    const abs = negative ? -raw : raw;
    const base = 10n ** BigInt(decimals);
    const whole = abs / base;
    const frac = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "");
    return `${negative ? "-" : ""}${whole.toString()}${frac ? `.${frac}` : ""}`;
  } catch (_err) {
    return "";
  }
}

/** GAS (18 decimals) from wei, ungrouped. */
const toPlainGas = (wei) => toPlainUnits(wei, 18);

/** Gwei (9 decimals) from wei, ungrouped. */
const toPlainGwei = (wei) => toPlainUnits(wei, 9);

/** ISO-8601 UTC timestamp from ms, or "" when absent/invalid. */
function toIso(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n).toISOString();
}

/** Registry label for an official Neo X address, falling back to the raw hash. */
function labelOrAddress(address, net) {
  if (!address) return "";
  return resolveNeoxIdentity(address, net)?.label || address;
}

function toCsvString(headers, rows) {
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];
  // \r\n is the canonical CSV line ending; some Excel locales misparse \n.
  return lines.join("\r\n");
}

function downloadCsv(csvString, filename, fallbackName) {
  const base = String(filename || fallbackName).replace(/\.csv$/i, "");
  const safeFilename = base.replace(/[^a-zA-Z0-9_-]/g, "_");
  const blob = new Blob([CSV_BOM + csvString], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${safeFilename}.csv`);
}

const BLOCK_HEADERS = [
  "height",
  "hash",
  "timestamp_iso",
  "tx_count",
  "gas_used",
  "gas_limit",
  "base_fee_gwei",
  "burnt_fees_gas",
  "primary_validator",
  "size_bytes",
];

/**
 * CSV string (header + rows, no BOM) for adapted Neo X block rows.
 * @param {Array<Object>} blocks
 * @param {{net?: string}} [opts] - Network for identity resolution.
 * @returns {string}
 */
export function buildXBlocksCsv(blocks, opts = {}) {
  const net = opts.net ?? getNeoxNet();
  const rows = (Array.isArray(blocks) ? blocks : []).map((block) => [
    block.index ?? "",
    block.hash ?? "",
    toIso(block.timestampMs),
    block.txCount ?? "",
    block.gasUsed ?? "",
    block.gasLimit ?? "",
    toPlainGwei(block.baseFeePerGas),
    toPlainGas(block.burntFees),
    labelOrAddress(block.primaryValidator || block.miner, net),
    block.size ?? "",
  ]);
  return toCsvString(BLOCK_HEADERS, rows);
}

const TX_HEADERS = [
  "hash",
  "block",
  "timestamp_iso",
  "status",
  "method",
  "from",
  "to",
  "value_gas",
  "fee_gas",
  "gas_price_gwei",
];

/**
 * CSV string (header + rows, no BOM) for adapted Neo X transaction rows.
 * @param {Array<Object>} txs
 * @returns {string}
 */
export function buildXTransactionsCsv(txs) {
  const rows = (Array.isArray(txs) ? txs : []).map((tx) => [
    tx.hash ?? "",
    tx.blockIndex ?? "",
    toIso(tx.timestampMs),
    tx.status ?? "",
    tx.method ?? "",
    tx.sender ?? "",
    tx.to || tx.createdContract?.hash || "",
    toPlainGas(tx.value),
    toPlainGas(tx.fee),
    toPlainGwei(tx.gasPrice),
  ]);
  return toCsvString(TX_HEADERS, rows);
}

/**
 * Download the loaded Neo X block rows as a CSV file.
 * @param {Array<Object>} blocks
 * @param {string} [filename] - Base name; ".csv" is appended after sanitizing.
 * @param {{net?: string}} [opts]
 */
export function exportXBlocksCsv(blocks, filename, opts = {}) {
  if (!Array.isArray(blocks) || !blocks.length) return;
  downloadCsv(buildXBlocksCsv(blocks, opts), filename, `neox-blocks-${Date.now()}`);
}

/**
 * Download the loaded Neo X transaction rows as a CSV file.
 * @param {Array<Object>} txs
 * @param {string} [filename] - Base name; ".csv" is appended after sanitizing.
 */
export function exportXTransactionsCsv(txs, filename) {
  if (!Array.isArray(txs) || !txs.length) return;
  downloadCsv(buildXTransactionsCsv(txs), filename, `neox-transactions-${Date.now()}`);
}
