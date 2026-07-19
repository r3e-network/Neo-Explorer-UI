// Neo X block service — Blockscout v2 backed, EVM data model.
// List methods return cursor pages { items, nextPageParams } (Blockscout uses
// cursor pagination, not limit/skip), consumed by useCursorList in /x views.

import { fetchBlockscout, LIST_TIMEOUT_MS } from "./blockscoutClient";
import { toXBlock, toXTransaction, toXPage } from "@/adapters/neox";
import { getNeoxNet } from "@/utils/neoxEnv";

const netOf = (opts) => (typeof opts === "string" ? opts : opts?.net) || getNeoxNet();
const cursorParams = (opts) => (opts?.cursor && typeof opts.cursor === "object" ? { ...opts.cursor } : {});

export const blockService = {
  /** Latest blocks for the home overview (Blockscout /main-page/blocks). */
  async getLatest(limit = 6, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), "main-page/blocks", { signal: opts.signal });
    const items = Array.isArray(data) ? data.map(toXBlock).filter(Boolean) : [];
    return items.slice(0, limit);
  },

  /** Cursor page of blocks. */
  async getList(opts = {}) {
    const data = await fetchBlockscout(netOf(opts), "blocks", {
      params: cursorParams(opts),
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return toXPage(data, toXBlock);
  },

  /** A block by height (digits) or hash (0x…). */
  async getByParam(param, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `blocks/${encodeURIComponent(param)}`, { signal: opts.signal });
    return data ? toXBlock(data) : null;
  },

  /** Cursor page of a block's transactions. */
  async getBlockTransactions(param, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `blocks/${encodeURIComponent(param)}/transactions`, {
      params: cursorParams(opts),
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return toXPage(data, toXTransaction);
  },
};

export default blockService;
