// Shared bounded worker pool for the Vercel api/ handlers.
//
// Two handlers (mempool, sync_mempool) each carried a private copy of this
// function — byte-identical except for a local variable name — and
// check_alerts is the third consumer. This module is the single source of
// truth; the semantics below are preserved verbatim from both original
// copies:
//
//   - Spawns min(concurrency, items.length) workers that pull items off a
//     shared cursor, so results[i] always corresponds to items[i] while at
//     most `concurrency` worker() calls are in flight.
//   - A worker() rejection never rejects the pool: the failure is recorded
//     in-slot as { __error: message } and that worker moves on to the next
//     item. Callers therefore check result?.__error per slot; the returned
//     promise itself never rejects.
async function runWithConcurrency(items, worker, concurrency) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      try {
        results[idx] = await worker(items[idx], idx);
      } catch (e) {
        results[idx] = { __error: e?.message || String(e) };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

module.exports = {
  runWithConcurrency,
};
