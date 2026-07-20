// Neo X block service — Blockscout v2 backed, EVM data model.
// List methods return cursor pages { items, nextPageParams } (Blockscout uses
// cursor pagination, not limit/skip), consumed by useCursorList in /x views.

import { fetchBlockscout, LIST_TIMEOUT_MS } from "./blockscoutClient";
import { toXBlock, toXTransaction, toXPage } from "@/adapters/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import { enrichBlocksWithConsensus } from "./consensusService";
import { mergeHomeFeedRows, readHomeFeed, writeHomeFeed } from "./homeFeedCache";

const netOf = (opts) => (typeof opts === "string" ? opts : opts?.net) || getNeoxNet();
const cursorParams = (opts) => (opts?.cursor && typeof opts.cursor === "object" ? { ...opts.cursor } : {});

function needsHistoryBackfill(items, limit) {
  const heights = (Array.isArray(items) ? items : [])
    .slice(0, limit)
    .map((item) => Number(item?.index));
  if (heights.length < limit || heights.some((height) => !Number.isSafeInteger(height))) return true;
  return heights.some((height, index) => index > 0 && height !== heights[index - 1] - 1);
}

export const blockService = {
  /** Latest blocks for the home overview (Blockscout /main-page/blocks). */
  async getLatest(limit = 6, opts = {}) {
    const net = netOf(opts);
    const data = await fetchBlockscout(net, "main-page/blocks", { signal: opts.signal });
    const snapshot = Array.isArray(data) ? data.map(toXBlock).filter(Boolean) : [];
    let items = mergeHomeFeedRows(snapshot, readHomeFeed(net, "blocks", limit), "blocks", limit);

    // Blockscout intentionally exposes only four home blocks. Backfill once
    // from the cursor list, then subsequent polls retain history and prepend
    // only newly observed blocks.
    if (needsHistoryBackfill(items, limit) && !opts.signal?.aborted) {
      try {
        const history = await fetchBlockscout(net, "blocks", {
          signal: opts.signal,
          timeoutMs: LIST_TIMEOUT_MS,
        });
        items = mergeHomeFeedRows(items, toXPage(history, toXBlock).items, "blocks", limit);
      } catch (_err) {
        // The live four-row snapshot remains useful when history is degraded.
      }
    }

    const enriched = await enrichBlocksWithConsensus(items, { ...opts, net });
    return writeHomeFeed(net, "blocks", enriched, limit);
  },

  /** Cursor page of blocks. */
  async getList(opts = {}) {
    const net = netOf(opts);
    const data = await fetchBlockscout(net, "blocks", {
      params: cursorParams(opts),
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    const page = toXPage(data, toXBlock);
    return { ...page, items: await enrichBlocksWithConsensus(page.items, { ...opts, net }) };
  },

  /** A block by height (digits) or hash (0x…). */
  async getByParam(param, opts = {}) {
    const net = netOf(opts);
    const data = await fetchBlockscout(net, `blocks/${encodeURIComponent(param)}`, { signal: opts.signal });
    if (!data) return null;
    const [block] = await enrichBlocksWithConsensus([toXBlock(data)], { ...opts, net });
    return block || null;
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
