/**
 * Rolling window of recent transactions, updated incrementally.
 *
 * Used by the gas tracker to keep a stable fee-distribution sample
 * without re-fetching the entire window on every refresh. Pattern:
 *
 *   const buffer = createRollingTxBuffer({ fetchPage });
 *   await buffer.refresh();    // first call: full initial fill
 *   await buffer.refresh();    // subsequent: incremental delta only
 *   buffer.entries;            // current rolling sample, newest first
 *
 * `fetchPage(limit, offset, options)` is injected so the buffer can
 * sit in front of any paginated tx source — the GasTracker uses
 * indexerReadService.getRecentTransactions, but tests mock it.
 *
 * @typedef {{ txid: string, sys_fee?: number|string, net_fee?: number|string }} TxRow
 */

/**
 * @param {Object} opts
 * @param {(limit: number, offset: number, options?: object) => Promise<TxRow[]>} opts.fetchPage
 * @param {number} [opts.target=1000] - Buffer cap; oldest entries trimmed past this.
 * @param {number} [opts.initialPages=5] - Number of pages to fetch on first refresh.
 * @param {number} [opts.pageSize=200] - Indexer page size (PostgREST cap is 200).
 * @param {number} [opts.incrementalSize=100] - Page size for delta refreshes.
 */
export function createRollingTxBuffer({
  fetchPage,
  target = 1000,
  initialPages = 5,
  pageSize = 200,
  incrementalSize = 100,
} = {}) {
  if (typeof fetchPage !== "function") {
    throw new TypeError("createRollingTxBuffer: fetchPage is required");
  }

  let entries = [];
  let lastSeenTxid = null;

  return {
    /** Newest-first array of rows currently in the buffer. */
    get entries() {
      return entries;
    },

    /** Newest tx hash seen, or null if buffer is empty. */
    get lastSeenTxid() {
      return lastSeenTxid;
    },

    /**
     * Fetch new entries since the last refresh.
     *   - First call: initial fill across initialPages × pageSize.
     *   - Subsequent calls: a single incrementalSize page; entries newer
     *     than lastSeenTxid are prepended; the buffer is trimmed back
     *     to `target`.
     *   - `forceRefresh` is forwarded to fetchPage as a cache-bypass
     *     hint; it does NOT trigger a buffer rebuild.
     */
    async refresh(forceRefresh = false) {
      if (entries.length === 0) {
        const pages = await Promise.all(
          Array.from({ length: initialPages }, (_, i) =>
            fetchPage(pageSize, i * pageSize, { forceRefresh }).catch(() => []),
          ),
        );
        entries = pages.flat().filter((tx) => tx?.txid).slice(0, target);
        lastSeenTxid = entries[0]?.txid || null;
        return entries;
      }

      const latest = await fetchPage(incrementalSize, 0, { forceRefresh }).catch(() => []);
      const newRows = [];
      for (const tx of latest) {
        if (!tx?.txid) continue;
        if (tx.txid === lastSeenTxid) break;
        newRows.push(tx);
      }
      if (newRows.length > 0) {
        entries = [...newRows, ...entries].slice(0, target);
        lastSeenTxid = entries[0]?.txid || lastSeenTxid;
      }
      return entries;
    },

    /** Reset the buffer (for tests, network change, etc.). */
    reset() {
      entries = [];
      lastSeenTxid = null;
    },
  };
}

/**
 * Compute low/average/high percentile estimates from a list of fee
 * values (ignores zero-fee rows). Returns 25th / 50th / 75th percentile
 * so single-tx outliers don't skew the bands.
 *
 * @param {number[]} fees
 * @returns {{ low: number, average: number, high: number }}
 */
export function feePercentileEstimates(fees) {
  const sorted = (Array.isArray(fees) ? fees : [])
    .filter((f) => Number.isFinite(f) && f > 0)
    .sort((a, b) => a - b);

  if (sorted.length === 0) {
    return { low: 0, average: 0, high: 0 };
  }

  const at = (p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)))];
  return {
    low: at(0.25),
    average: at(0.5),
    high: at(0.75),
  };
}

/** Total fee for a tx row, accepting both indexer (snake_case) and legacy fields. */
export function txTotalFee(tx) {
  return (Number(tx?.sys_fee ?? tx?.sysfee) || 0) + (Number(tx?.net_fee ?? tx?.netfee) || 0);
}
