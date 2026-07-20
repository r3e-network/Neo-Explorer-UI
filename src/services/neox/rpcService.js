// Neo X node JSON-RPC service.
//
// Thin read-only client for the `/neox-rpc/<net>` proxy (api/neox-rpc/[net].js
// in prod, vite server.proxy in dev). The proxy enforces a hard method
// allowlist, so this service only exposes the read calls the explorer needs:
// txpool status, eth_call, and the node's head block number. Distinguishes the
// same outcomes the Blockscout transport does:
//   - transport failure / non-200 → throw SourceUnavailableError (an outage)
//   - JSON-RPC `error` member     → throw Error (data-level failure, e.g.
//                                    execution reverted)
//   - ok                          → the JSON-RPC `result`

import { SourceUnavailableError } from "@/adapters/source";
import { getNeoxNet, resolveNeoxNetName } from "@/utils/neoxEnv";

const DEFAULT_TIMEOUT_MS = 8000;

const netOf = (opts) => (typeof opts === "string" ? opts : opts?.net) || getNeoxNet();

// Hex quantity ("0x1a") → Number. Non-hex / missing values normalize to 0 so
// counters never render NaN.
function hexToNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = Number(String(value || "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * POST one JSON-RPC call through the read-only proxy.
 *
 * @param {string} method - Allowlisted method (see api/neox-rpc/[net].js).
 * @param {Array} [params] - JSON-RPC positional params.
 * @param {Object} [opts]
 * @param {string} [opts.net] - Neo X net id ("neox-mainnet" | "neox-testnet").
 * @param {AbortSignal} [opts.signal] - External abort signal.
 * @param {number} [opts.timeoutMs] - Per-request timeout (ignored if signal given).
 * @returns {Promise<*>} The JSON-RPC `result`.
 * @throws {SourceUnavailableError} On non-200, network error, or timeout.
 * @throws {Error} When the node returns a JSON-RPC `error` member.
 */
export async function rpcCall(method, params = [], opts = {}) {
  const url = `/neox-rpc/${resolveNeoxNetName(netOf(opts))}`;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  // Timeout stays armed even with an external signal (abort is forwarded).
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  const activeSignal = controller.signal;

  let json;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      // Full JSON-RPC envelope: the prod proxy only reads method/params (and
      // re-stamps its own id), while the dev vite proxy is a raw passthrough
      // to the node — which requires a valid jsonrpc/id envelope.
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: activeSignal,
    });
    if (!response.ok) {
      throw new SourceUnavailableError(`Neo X RPC responded ${response.status}`);
    }
    json = await response.json();
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    if (error?.name === "AbortError") {
      throw new SourceUnavailableError("Neo X RPC request timed out");
    }
    throw new SourceUnavailableError(error?.message || "Neo X RPC request failed");
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (json?.error) {
    throw new Error(json.error.message || `${method} RPC error`);
  }
  return json?.result;
}

export const rpcService = {
  rpcCall,

  /** Mempool depth: { pending: Number, queued: Number } (hex strings parsed). */
  async getTxpoolStatus(opts = {}) {
    const result = await rpcCall("txpool_status", [], opts);
    return {
      pending: hexToNumber(result?.pending),
      queued: hexToNumber(result?.queued),
    };
  },

  /** eth_call against latest or an explicit block tag. */
  async ethCall(callObj, opts = {}) {
    return rpcCall("eth_call", [callObj, opts.blockTag || "latest"], opts);
  },

  /** The node's head block number (eth_blockNumber, hex parsed to Number). */
  async getRpcBlockNumber(opts = {}) {
    return hexToNumber(await rpcCall("eth_blockNumber", [], opts));
  },
};

export default rpcService;
