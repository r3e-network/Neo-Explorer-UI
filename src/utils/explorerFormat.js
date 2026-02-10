/**
 * Shared formatters for explorer views.
 */
import { GAS_DIVISOR } from "@/constants";

export function truncateHash(value, start = 10, end = 8) {
  if (!value) return "";
  if (value.length <= start + end) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function formatUnixTime(timestamp) {
  if (!timestamp) return "";
  // neo3fura returns millisecond timestamps (13+ digits); handle both formats
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  return new Date(ms).toLocaleString();
}

export function formatAge(timestamp, nowMs = Date.now()) {
  if (!timestamp) return "";

  // neo3fura returns millisecond timestamps (13+ digits); convert to seconds
  const ts = timestamp > 1e12 ? Math.floor(timestamp / 1000) : timestamp;
  const seconds = Math.max(0, Math.floor(nowMs / 1000 - ts));
  if (seconds < 60) return `${seconds} secs ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatNumber(value) {
  if (value === null || value === undefined) return "0";
  return Number(value).toLocaleString();
}

export function formatGas(value, decimals = 8) {
  if (!value) return "0";
  return (Number(value) / GAS_DIVISOR).toFixed(decimals);
}

export default {
  truncateHash,
  formatUnixTime,
  formatAge,
  formatBytes,
  formatNumber,
  formatGas,
};
