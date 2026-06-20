import { ref } from "vue";
import { fetchFreshQuery } from "@/query/freshness";
import { resolveNetworkName } from "@/utils/env";

/**
 * Composable for infinite-scroll "load more" logic.
 *
 * Eliminates the ~20-line loadMore boilerplate duplicated across list views
 * (race-condition guard, page increment, array concatenation, totalCount sync).
 *
 * @param {(limit: number, skip: number, opts?: object) => Promise<{result: Array, totalCount?: number}>} fetchFn
 *   Same service function used by usePagination.
 * @param {object} pagination - Reactive refs returned by usePagination.
 * @param {import('vue').Ref<Array>}  pagination.items
 * @param {import('vue').Ref<number>} pagination.currentPage
 * @param {import('vue').Ref<number>} pagination.pageSize
 * @param {import('vue').Ref<number>} pagination.totalPages
 * @param {import('vue').Ref<number>} pagination.totalCount
 * @param {object} [options]
 * @param {(newItems: Array) => void} [options.onAppend] - Called with newly fetched items after append.
 * @param {(limit: number, skip: number, context?: object) => Array|string} [options.queryKeyFn]
 *   Returns a TanStack Query key; when present, appended pages route through the shared query layer.
 * @param {string} [options.querySource] - Source label stored in freshness snapshots.
 * @param {number} [options.queryStaleTime] - TanStack Query staleTime for appended page reads.
 */
export function useLoadMore(
  fetchFn,
  pagination,
  { onAppend, queryKeyFn = null, querySource = "load-more", queryStaleTime = 3_000 } = {},
) {
  const loadingMore = ref(false);
  let requestId = 0;

  async function loadMore() {
    const { items, currentPage, pageSize, totalPages, totalCount } = pagination;

    if (loadingMore.value || currentPage.value >= totalPages.value) return;

    const myId = ++requestId;
    const requestNetwork = resolveNetworkName();
    // Load-more pages are append-only historical rows (older blocks/txs) that
    // rarely change, and overlapping rows are already de-duplicated below. They
    // should therefore hit the shared TanStack cache instead of forcing a
    // refresh on every click — forcing it defeated the point of routing through
    // the query layer (re-fetching identical pages on every re-click /
    // back-forward). Caching is safe here.
    const requestOptions = { forceRefresh: false, network: requestNetwork };
    loadingMore.value = true;
    const nextPage = currentPage.value + 1;
    const skip = (nextPage - 1) * pageSize.value;

    try {
      const res = queryKeyFn
        ? await fetchFreshQuery({
            forceRefresh: false,
            queryKey: queryKeyFn(pageSize.value, skip, { ...requestOptions, page: nextPage }),
            queryFn: ({ forceRefresh }) => fetchFn(pageSize.value, skip, { ...requestOptions, forceRefresh }),
            source: querySource,
            staleTime: queryStaleTime,
          })
        : await fetchFn(pageSize.value, skip, requestOptions);
      if (myId !== requestId) return; // stale response
      if (resolveNetworkName() !== requestNetwork) return;

      if (res?.result?.length > 0) {
        // Dedup against existing items by a stable identifier — the server
        // can return overlapping rows when items shifted by 1 between
        // pages (a new tx/block landed since the previous fetch). Without
        // this the list would render duplicate rows with the same key,
        // tripping Vue's :key warnings and inflating "load more"
        // counts.
        const seen = new Set(
          items.value.map((item) => item?.hash ?? item?.txid ?? item?.index ?? item?.id).filter(Boolean),
        );
        const fresh = res.result.filter((item) => {
          const id = item?.hash ?? item?.txid ?? item?.index ?? item?.id;
          if (id == null) return true;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        if (fresh.length > 0) items.value = [...items.value, ...fresh];
        currentPage.value = nextPage;
        totalCount.value = res.totalCount || totalCount.value;
        onAppend?.(fresh);
      }
    } catch (err) {
      if (resolveNetworkName() !== requestNetwork) return;
      if (import.meta.env.DEV) console.error("Failed to load more:", err);
    } finally {
      if (myId === requestId) loadingMore.value = false;
    }
  }

  return { loadingMore, loadMore };
}
