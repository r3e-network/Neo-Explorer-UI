// Neo X account/address service — Blockscout v2 backed, EVM data model.

import { fetchBlockscout, LIST_TIMEOUT_MS } from "./blockscoutClient";
import { toXAddress, toXTransaction, toXInternalTx, toXCounters, toXPage } from "@/adapters/neox";
import { getNeoxNet } from "@/utils/neoxEnv";

const netOf = (opts) => (typeof opts === "string" ? opts : opts?.net) || getNeoxNet();
const cursorParams = (opts) => (opts?.cursor && typeof opts.cursor === "object" ? { ...opts.cursor } : {});

// Blockscout computes address counters asynchronously: the very first request
// for an address can answer all-zeros while the job warms up. One delayed
// refetch recovers the real values without the views having to poll.
const COUNTERS_WARMUP_DELAY_MS = 1500;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// UI holding-tab type → Blockscout `type` filter (comma-combinable).
const HOLDING_TYPE = {
  "erc20": "ERC-20",
  "erc721": "ERC-721",
  "erc1155": "ERC-1155",
};

function normalizeHoldingType(type) {
  if (!type) return undefined;
  const mapped = String(type)
    .split(",")
    .map((part) => HOLDING_TYPE[part.trim().toLowerCase().replace(/-/g, "")])
    .filter(Boolean);
  return mapped.length ? mapped.join(",") : undefined;
}

export const accountService = {
  /** Address overview (balance, contract flags, creation tx). */
  async getByAddress(address, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `addresses/${encodeURIComponent(address)}`, { signal: opts.signal });
    return data ? toXAddress(data, address) : null;
  },

  /** Cursor page of an address's transactions. */
  async getTransactions(address, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `addresses/${encodeURIComponent(address)}/transactions`, {
      params: cursorParams(opts),
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return toXPage(data, toXTransaction);
  },

  /** ERC token balances held by an address (array passthrough). */
  async getTokenBalances(address, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `addresses/${encodeURIComponent(address)}/token-balances`, {
      signal: opts.signal,
    });
    return Array.isArray(data) ? data : [];
  },

  /** Cursor page of an address's token transfers. */
  async getTokenTransfers(address, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `addresses/${encodeURIComponent(address)}/token-transfers`, {
      params: cursorParams(opts),
      signal: opts.signal,
    });
    return { items: Array.isArray(data?.items) ? data.items : [], nextPageParams: data?.next_page_params ?? null };
  },

  /**
   * Address activity counters (tx count, token transfers, gas usage).
   * Retries once after a short delay when every counter is zero, because
   * Blockscout's first response for a cold address is an async placeholder.
   */
  async getCounters(address, opts = {}) {
    const path = `addresses/${encodeURIComponent(address)}/counters`;
    const first = toXCounters(await fetchBlockscout(netOf(opts), path, { signal: opts.signal }));
    if (!first) return null;
    const warming =
      first.transactionsCount === 0 &&
      first.tokenTransfersCount === 0 &&
      first.gasUsageCount === 0 &&
      first.validationsCount === 0;
    if (!warming) return first;
    await delay(COUNTERS_WARMUP_DELAY_MS);
    if (opts.signal?.aborted) return first;
    const second = toXCounters(await fetchBlockscout(netOf(opts), path, { signal: opts.signal }));
    return second ?? first;
  },

  /** Cursor page of an address's internal (message) calls. */
  async getInternalTransactions(address, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `addresses/${encodeURIComponent(address)}/internal-transactions`, {
      params: cursorParams(opts),
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return toXPage(data, toXInternalTx);
  },

  /** Daily native-balance history: [{ date: "YYYY-MM-DD", value: "<wei>" }]. */
  async getCoinBalanceHistory(address, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `addresses/${encodeURIComponent(address)}/coin-balance-history-by-day`, {
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return items
      .filter((item) => item && item.date !== undefined)
      .map((item) => ({ date: item.date, value: item.value ?? "0" }));
  },

  /**
   * Cursor page of top accounts ranked by native balance (descending).
   * Items stay in the raw Blockscout shape (hash, coin_balance,
   * transactions_count, is_contract, is_verified, name) because the ranked
   * directory view consumes them verbatim.
   *
   * @param {Object|string} [opts] - { net, signal, cursor } or a net id.
   * @returns {Promise<{items: Object[], nextPageParams: Object|null}>}
   */
  async getTopAccounts(opts = {}) {
    const data = await fetchBlockscout(netOf(opts), "addresses", {
      params: cursorParams(opts),
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return { items: Array.isArray(data?.items) ? data.items : [], nextPageParams: data?.next_page_params ?? null };
  },

  /**
   * Cursor page of event logs emitted by an address (raw Blockscout items,
   * same shape as tx logs — adapt with toXLog in the view).
   *
   * @param {string} address - Address hash ("0x…").
   * @param {Object|string} [opts] - { net, signal, cursor } or a net id.
   * @returns {Promise<{items: Object[], nextPageParams: Object|null}>}
   */
  async getLogs(address, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `addresses/${encodeURIComponent(address)}/logs`, {
      params: cursorParams(opts),
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return { items: Array.isArray(data?.items) ? data.items : [], nextPageParams: data?.next_page_params ?? null };
  },

  /**
   * Cursor page of token holdings, optionally filtered by standard.
   * `opts.type` accepts "erc20" | "erc721" | "erc1155" (or the dashed
   * Blockscout spellings), comma-combinable. Items keep the Blockscout shape:
   * { token, token_id, token_instance, value }.
   */
  async getTokens(address, opts = {}) {
    const params = cursorParams(opts);
    const filter = normalizeHoldingType(opts.type);
    if (filter) params.type = filter;
    const data = await fetchBlockscout(netOf(opts), `addresses/${encodeURIComponent(address)}/tokens`, {
      params,
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return { items: Array.isArray(data?.items) ? data.items : [], nextPageParams: data?.next_page_params ?? null };
  },
};

export default accountService;
