// Neo X token service — Blockscout v2 backed (ERC-20/721/1155).

import { fetchBlockscout, LIST_TIMEOUT_MS } from "./blockscoutClient";
import { toXToken, toXTokenInstance, toXCounters, toXPage } from "@/adapters/neox";
import { getNeoxNet } from "@/utils/neoxEnv";

const netOf = (opts) => (typeof opts === "string" ? opts : opts?.net) || getNeoxNet();
const cursorParams = (opts) => (opts?.cursor && typeof opts.cursor === "object" ? { ...opts.cursor } : {});

// UI tab id → Blockscout `type` filter.
const TYPE_FILTER = {
  erc20: "ERC-20",
  erc721: "ERC-721",
  erc1155: "ERC-1155",
};

export const tokenService = {
  /** Cursor page of tokens, optionally filtered by standard (tab) and search. */
  async getList(opts = {}) {
    const params = cursorParams(opts);
    const filter = TYPE_FILTER[String(opts.type || "").toLowerCase()];
    if (filter) params.type = filter;
    if (opts.q) params.q = String(opts.q);
    const data = await fetchBlockscout(netOf(opts), "tokens", {
      params,
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return toXPage(data, toXToken);
  },

  /** A single token by contract hash. */
  async getByHash(hash, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `tokens/${encodeURIComponent(hash)}`, { signal: opts.signal });
    return data ? toXToken(data) : null;
  },

  /** Cursor page of a token's holders (Blockscout envelope passthrough). */
  async getHolders(hash, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `tokens/${encodeURIComponent(hash)}/holders`, {
      params: cursorParams(opts),
      signal: opts.signal,
    });
    return { items: Array.isArray(data?.items) ? data.items : [], nextPageParams: data?.next_page_params ?? null };
  },

  /** Cursor page of a token's transfers. */
  async getTransfers(hash, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `tokens/${encodeURIComponent(hash)}/transfers`, {
      params: cursorParams(opts),
      signal: opts.signal,
    });
    return { items: Array.isArray(data?.items) ? data.items : [], nextPageParams: data?.next_page_params ?? null };
  },

  /** Token counters (holders + lifetime transfers). */
  async getCounters(hash, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `tokens/${encodeURIComponent(hash)}/counters`, {
      signal: opts.signal,
    });
    return toXCounters(data);
  },

  /** Cursor page of a token's NFT instances (ERC-721/1155 galleries). */
  async getInstances(hash, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `tokens/${encodeURIComponent(hash)}/instances`, {
      params: cursorParams(opts),
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return toXPage(data, toXTokenInstance);
  },
};

export default tokenService;
