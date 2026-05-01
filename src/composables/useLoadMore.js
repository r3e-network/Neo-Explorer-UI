import { ref } from "vue";

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
 */
export function useLoadMore(fetchFn, pagination, { onAppend } = {}) {
  const loadingMore = ref(false);
  let requestId = 0;

  async function loadMore() {
    const { items, currentPage, pageSize, totalPages, totalCount } = pagination;

    if (loadingMore.value || currentPage.value >= totalPages.value) return;

    const myId = ++requestId;
    loadingMore.value = true;
    const nextPage = currentPage.value + 1;
    const skip = (nextPage - 1) * pageSize.value;

    try {
      const res = await fetchFn(pageSize.value, skip, { forceRefresh: true });
      if (myId !== requestId) return; // stale response

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
      if (import.meta.env.DEV) console.error("Failed to load more:", err);
    } finally {
      if (myId === requestId) loadingMore.value = false;
    }
  }

  return { loadingMore, loadMore };
}
