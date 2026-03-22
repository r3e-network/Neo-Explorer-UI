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
        items.value = [...items.value, ...res.result];
        currentPage.value = nextPage;
        totalCount.value = res.totalCount || totalCount.value;
        onAppend?.(res.result);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to load more:", err);
    } finally {
      if (myId === requestId) loadingMore.value = false;
    }
  }

  return { loadingMore, loadMore };
}
