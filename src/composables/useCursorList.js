import { ref, shallowRef, onMounted, onBeforeUnmount } from "vue";
import { NETWORK_CHANGE_EVENT } from "@/utils/env";

/**
 * Cursor-based list loader for Neo X (Blockscout) endpoints, which paginate by
 * opaque `next_page_params` cursors rather than limit/skip. This is the /x
 * counterpart to usePagination/useLoadMore (which are offset-based and tied to
 * the N3 read path). Auto-loads on mount and re-loads on network change.
 *
 * @param {(cursor: Object|null, ctx: {signal: AbortSignal}) => Promise<{items: any[], nextPageParams: Object|null}>} fetchPage
 * @returns {{ items, loading, loadingMore, error, hasMore, loadMore, refresh }}
 */
export function useCursorList(fetchPage) {
  const items = ref([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref(null);
  const hasMore = ref(false);
  const nextCursor = shallowRef(null);
  const seen = new Set();
  let controller = null;
  // Monotonic request id: only the most recent load() may mutate state, so a
  // superseded request (aborted by a rapid refresh()/loadMore()) can never
  // flash a fake error or clobber the newer request's loading flags.
  let reqSeq = 0;

  const keyOf = (item) =>
    item?.hash ??
    (item?.index != null ? `b${item.index}` : null) ??
    item?.contractHash ??
    item?.address ??
    JSON.stringify(item);

  // After a failed load-more, further sentinel-triggered attempts are ignored
  // for this long; a manual click after the window retries normally.
  const MORE_FAILURE_COOLDOWN_MS = 4000;
  let lastMoreFailureAt = 0;

  async function load({ append = false } = {}) {
    const current = ++reqSeq;
    if (controller) controller.abort();
    controller = new AbortController();
    const cursor = append ? nextCursor.value : null;
    if (append) loadingMore.value = true;
    else loading.value = true;

    try {
      const page = await fetchPage(cursor, { signal: controller.signal });
      if (current !== reqSeq) return; // superseded — ignore its result entirely
      const incoming = Array.isArray(page?.items) ? page.items : [];

      if (append) {
        const fresh = incoming.filter((item) => {
          const k = keyOf(item);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        items.value = [...items.value, ...fresh];
      } else {
        seen.clear();
        const fresh = incoming.filter((item) => {
          const k = keyOf(item);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        items.value = fresh;
      }

      nextCursor.value = page?.nextPageParams || null;
      hasMore.value = Boolean(nextCursor.value);
      error.value = null;
      lastMoreFailureAt = 0;
    } catch (err) {
      if (current === reqSeq && err?.name !== "AbortError") {
        if (append) {
          // A transient load-more failure must never wipe pages the user has
          // already scrolled through: keep items/hasMore intact so the footer
          // remains a natural retry, and arm a cooldown so an
          // IntersectionObserver sentinel cannot hot-loop against a dead
          // upstream.
          lastMoreFailureAt = Date.now();
        } else {
          error.value = err;
        }
      }
    } finally {
      if (current === reqSeq) {
        loading.value = false;
        loadingMore.value = false;
      }
    }
  }

  const loadMore = () => {
    if (Date.now() - lastMoreFailureAt < MORE_FAILURE_COOLDOWN_MS) return undefined;
    if (hasMore.value && !loadingMore.value) return load({ append: true });
    return undefined;
  };
  const refresh = () => load({ append: false });

  const onNetworkChange = () => {
    // A route stays mounted while the chain changes. Clear the old chain's
    // rows synchronously so its heights, hashes, and counters never appear
    // under the newly-selected network label.
    items.value = [];
    nextCursor.value = null;
    hasMore.value = false;
    error.value = null;
    seen.clear();
    refresh();
  };

  onMounted(() => {
    window.addEventListener(NETWORK_CHANGE_EVENT, onNetworkChange);
    load({ append: false });
  });
  onBeforeUnmount(() => {
    window.removeEventListener(NETWORK_CHANGE_EVENT, onNetworkChange);
    if (controller) controller.abort();
  });

  return { items, loading, loadingMore, error, hasMore, loadMore, refresh };
}

export default useCursorList;
