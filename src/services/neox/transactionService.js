// Neo X transaction service — Blockscout v2 backed, EVM data model.

import { fetchBlockscout, LIST_TIMEOUT_MS } from "./blockscoutClient";
import { toXTransaction, toXInternalTx, toXStateChange, toXPage } from "@/adapters/neox";
import { getNeoxNet } from "@/utils/neoxEnv";

const netOf = (opts) => (typeof opts === "string" ? opts : opts?.net) || getNeoxNet();
const cursorParams = (opts) => (opts?.cursor && typeof opts.cursor === "object" ? { ...opts.cursor } : {});

export const transactionService = {
  /** Latest transactions for the home overview (/main-page/transactions). */
  async getLatest(limit = 6, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), "main-page/transactions", { signal: opts.signal });
    const items = Array.isArray(data) ? data.map(toXTransaction).filter(Boolean) : [];
    return items.slice(0, limit);
  },

  /** Cursor page of transactions. */
  async getList(opts = {}) {
    const data = await fetchBlockscout(netOf(opts), "transactions", {
      params: cursorParams(opts),
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return toXPage(data, toXTransaction);
  },

  /** A single transaction by hash. */
  async getByHash(hash, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `transactions/${encodeURIComponent(hash)}`, { signal: opts.signal });
    return data ? toXTransaction(data) : null;
  },

  /** Raw event logs for a transaction (Blockscout envelope passthrough). */
  async getLogs(hash, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `transactions/${encodeURIComponent(hash)}/logs`, {
      params: cursorParams(opts),
      signal: opts.signal,
    });
    return { items: Array.isArray(data?.items) ? data.items : [], nextPageParams: data?.next_page_params ?? null };
  },

  /** ERC token transfers within a transaction. */
  async getTokenTransfers(hash, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `transactions/${encodeURIComponent(hash)}/token-transfers`, {
      params: cursorParams(opts),
      signal: opts.signal,
    });
    return { items: Array.isArray(data?.items) ? data.items : [], nextPageParams: data?.next_page_params ?? null };
  },

  /** Cursor page of a transaction's internal (message) calls. */
  async getInternalTransactions(hash, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `transactions/${encodeURIComponent(hash)}/internal-transactions`, {
      params: cursorParams(opts),
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return toXPage(data, toXInternalTx);
  },

  /** Cursor page of a transaction's balance state changes (coin + token). */
  async getStateChanges(hash, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `transactions/${encodeURIComponent(hash)}/state-changes`, {
      params: cursorParams(opts),
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return toXPage(data, toXStateChange);
  },
};

export default transactionService;
