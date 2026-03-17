import { getCurrentEnv } from "@/utils/env";

const INDEXER_TIMEOUT_MS = 3000;

function resolveIndexerNetworkPath() {
  const env = String(getCurrentEnv() || "").toLowerCase();
  return env.includes("test") || env.includes("t5") ? "testnet" : "mainnet";
}

async function fetchIndexerJson(path, timeoutMs = INDEXER_TIMEOUT_MS) {
  if (typeof fetch !== "function") return null;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch(path, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller?.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const indexerReadService = {
  async getSummary() {
    const network = resolveIndexerNetworkPath();
    const payload = await fetchIndexerJson(`/indexer/${network}/summary`);
    return payload?.data || null;
  },

  async getBlocks(limit = 20, offset = 0) {
    const network = resolveIndexerNetworkPath();
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return await fetchIndexerJson(`/indexer/${network}/blocks?${params.toString()}`);
  },

  async getTransactions(limit = 20, offset = 0) {
    const network = resolveIndexerNetworkPath();
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return await fetchIndexerJson(`/indexer/${network}/transactions?${params.toString()}`);
  },
};

export default indexerReadService;
