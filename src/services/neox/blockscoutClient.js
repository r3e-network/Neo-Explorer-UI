// Blockscout v2 REST transport for Neo X.
//
// Parallel to indexerReadService.js#fetchIndexerJson but for the EVM explorer:
// it targets the `/neox/<net>/...` proxy prefix (see api/neox.js in
// prod, vite server.proxy in dev). Distinguishes three outcomes the same way
// the N3 read path does:
//   - 404            → resolve `null` (render an empty / not-found state)
//   - 5xx / network  → throw SourceUnavailableError (an outage, not emptiness)
//   - ok             → the parsed JSON body

import { SourceUnavailableError } from "@/adapters/source";
import { getNeoxExplorerApiPrefix } from "@/utils/neoxEnv";

const DEFAULT_TIMEOUT_MS = 8000;
// Blockscout list endpoints (cursor pages) can run several seconds cold.
export const LIST_TIMEOUT_MS = 12000;

function buildUrl(net, path, params) {
  const prefix = getNeoxExplorerApiPrefix(net); // e.g. "/neox/mainnet"
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === "") continue;
    // Blockscout cursors must be echoed back VERBATIM, including null members:
    // /addresses returns next_page_params with transactions_count: null, and
    // dropping that key makes the upstream silently serve page one again.
    // Blockscout's own frontend sends the literal string "null".
    search.append(key, value === null ? "null" : String(value));
  }
  const qs = search.toString();
  return `${prefix}/${cleanPath}${qs ? `?${qs}` : ""}`;
}

/**
 * Fetch a Blockscout v2 REST resource for a Neo X net.
 *
 * @param {string} net - Neo X net id ("neox-mainnet" | "neox-testnet").
 * @param {string} path - Path under /api/v2 (e.g. "blocks", "transactions/0x..").
 * @param {Object} [options]
 * @param {Object} [options.params] - Query params (Blockscout cursors/filters).
 * @param {AbortSignal} [options.signal] - External abort signal.
 * @param {number} [options.timeoutMs] - Per-request timeout (ignored if signal given).
 * @returns {Promise<Object|null>} Parsed JSON, or null on 404.
 * @throws {SourceUnavailableError} On 5xx, network error, or timeout.
 */
export async function fetchBlockscout(net, path, { params = {}, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const url = buildUrl(net, path, params);
  const controller = new AbortController();
  // The timeout stays armed even with an external signal: forward its abort
  // into the local controller so a stalled upstream can never hang a caller.
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  const activeSignal = controller.signal;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: activeSignal,
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new SourceUnavailableError(`Neo X explorer responded ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    if (error?.name === "AbortError") {
      throw new SourceUnavailableError("Neo X explorer request timed out");
    }
    throw new SourceUnavailableError(error?.message || "Neo X explorer request failed");
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default fetchBlockscout;
