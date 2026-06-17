// Paginated CSV export: fetch all pages of a list endpoint and export the full
// result, not just the currently-visible page. The explorer's list endpoints
// (transactions, blocks, account transactions) are paginated; a single-page
// export only gives ~20 rows. This walks the pages server-side, accumulates,
// and then hands the full set to the existing exportTransactionsToCSV /
// exportBlocksToCSV helpers.
//
// Safety:
// - maxRows caps the total (default 5000) so a pathological address cannot
//   trigger an unbounded number of requests / a multi-GB download.
// - onPage is an optional progress callback (received, total) for a UI spinner.
// - Aborts cleanly if a page returns empty or the fetcher throws.

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_ROWS = 5000;

/**
 * Fetch every page of a paginated list and export it as CSV.
 *
 * @param {object} opts
 * @param {(limit:number, offset:number)=>Promise<{result:Array, totalCount?:number}>} opts.fetchPage
 *   Fetches one page. Must return { result: [], totalCount?: number }.
 * @param {(rows:Array, filename:string)=>void} opts.exporter
 *   The single-page CSV exporter to call with the accumulated rows.
 * @param {string} opts.filename
 * @param {number} [opts.pageSize=100]
 * @param {number} [opts.maxRows=5000]
 * @param {(received:number, total:number)=>void} [opts.onPage]
 * @returns {Promise<{rows:number, truncated:boolean}>}
 */
export async function exportAllPagesToCsv({
  fetchPage,
  exporter,
  filename,
  pageSize = DEFAULT_PAGE_SIZE,
  maxRows = DEFAULT_MAX_ROWS,
  onPage,
}) {
  if (typeof fetchPage !== "function" || typeof exporter !== "function") {
    throw new Error("fetchPage and exporter are required");
  }
  const effectivePageSize = Math.min(Math.max(pageSize || DEFAULT_PAGE_SIZE, 1), 200);
  const cap = Math.max(maxRows || DEFAULT_MAX_ROWS, effectivePageSize);

  const all = [];
  let offset = 0;
  let total = 0;
  let truncated = false;

  while (offset < cap) {
    const want = Math.min(effectivePageSize, cap - offset);
    const page = await fetchPage(want, offset);
    const rows = Array.isArray(page?.result) ? page.result : [];
    if (!rows.length) break;
    total = Number(page?.totalCount || total || rows.length);
    all.push(...rows);
    offset += rows.length;
    if (typeof onPage === "function") {
      try {
        onPage(all.length, total);
      } catch {
        /* progress callback must not abort the export */
      }
    }
    if (rows.length < want) break; // last page
    if (all.length >= cap) {
      truncated = all.length < total;
      break;
    }
  }

  if (!all.length) {
    return { rows: 0, truncated: false };
  }
  if (all.length > cap) all.length = cap;
  exporter(all, filename);
  return { rows: all.length, truncated };
}
